import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  EXPLOSION_LAYER_STEP_RATIO,
  EXPLOSION_SPREAD,
  SHELL_FADE_END,
  buildParentMap,
  buildStructureHit,
  clampProgress,
  computeBodyAxis,
  computeExplosionOffsets,
  explosionMaxRadius,
  readableStructureName,
  resolveGroupMembers,
  resolveOrganStructure,
  shellOpacity,
  type ExplosionGroup,
} from './fullBody';

/**
 * 整具人体拆解内核的纯计算测试。
 *
 * 这些用例不加载真实 GLB，只用**构造出的最小 Object3D 树**验证拆解逻辑本身：
 * 位移的钳制、确定性、不累计；结构组的后代归并；父子关系表。
 * 真实模型下的数字（984 网格 / 749 唯一 anatomyId / 三组后代数量）由 C2 的浏览器取证给出。
 */

function node(id: string, parentId?: string): THREE.Object3D {
  const object = new THREE.Object3D();
  object.userData.anatomyId = id;
  if (parentId) object.userData.anatomyParentId = parentId;
  return object;
}

function mesh(id: string, parentId?: string): THREE.Mesh {
  const object = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  object.userData.anatomyId = id;
  if (parentId) object.userData.anatomyParentId = parentId;
  return object;
}

/** heart / cerebrum 是无几何的分组节点，几何挂在其后代上；spleen 自身即带几何的节点。 */
function sampleTree(): THREE.Object3D {
  const root = new THREE.Object3D();
  root.add(node('heart'));
  root.add(mesh('heart-left-ventricle', 'heart'));
  root.add(mesh('heart-right-atrium', 'heart'));
  root.add(mesh('heart-valve-leaflet', 'heart-left-ventricle'));
  root.add(mesh('spleen'));
  root.add(node('cerebrum'));
  root.add(mesh('cerebrum-frontal-lobe', 'cerebrum'));
  root.add(mesh('cerebrum-parietal-lobe', 'cerebrum'));
  return root;
}

describe('拆解进度钳制', () => {
  it('把任意输入钳制到 [0, 1]', () => {
    expect(clampProgress(-1)).toBe(0);
    expect(clampProgress(0)).toBe(0);
    expect(clampProgress(0.42)).toBe(0.42);
    expect(clampProgress(1)).toBe(1);
    expect(clampProgress(2)).toBe(1);
  });

  it('非法输入按 0 处理而不是抛错', () => {
    expect(clampProgress(Number.NaN)).toBe(0);
    expect(clampProgress(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('人体纵轴', () => {
  it('取包围盒中心的水平分量，竖直分量为 0', () => {
    const box = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 3, 1));
    expect(computeBodyAxis(box)).toEqual([0, 0, 0]);
  });
});

describe('结构父子关系表', () => {
  it('只登记带 anatomyParentId 的节点，并保持正确的父指向', () => {
    const parents = buildParentMap(sampleTree());
    expect(parents.get('heart-left-ventricle')).toBe('heart');
    expect(parents.get('heart-right-atrium')).toBe('heart');
    expect(parents.get('heart-valve-leaflet')).toBe('heart-left-ventricle');
    expect(parents.get('cerebrum-frontal-lobe')).toBe('cerebrum');
    expect(parents.get('spleen')).toBeUndefined();
    expect(parents.get('heart')).toBeUndefined();
  });
});

describe('分组结构的后代归并', () => {
  it('cerebrum / heart 这类分组节点能取到其后代集合', () => {
    const tree = sampleTree();
    const heart = resolveGroupMembers(tree, 'heart')
      .map((object) => object.userData.anatomyId)
      .sort();
    expect(heart).toEqual(['heart-left-ventricle', 'heart-right-atrium', 'heart-valve-leaflet']);

    const cerebrum = resolveGroupMembers(tree, 'cerebrum').map((object) => object.userData.anatomyId);
    expect(cerebrum.sort()).toEqual(['cerebrum-frontal-lobe', 'cerebrum-parietal-lobe']);
  });

  it('spleen 自身即节点，因此没有后代', () => {
    expect(resolveGroupMembers(sampleTree(), 'spleen')).toHaveLength(0);
  });

  it('传入已建好的父子表时结果一致', () => {
    const tree = sampleTree();
    const parents = buildParentMap(tree);
    expect(resolveGroupMembers(tree, 'heart', parents)).toHaveLength(
      resolveGroupMembers(tree, 'heart').length,
    );
  });
});

describe('拆解位移', () => {
  const axis: [number, number, number] = [0, 0, 0];
  const groups: ExplosionGroup[] = [
    { id: 'heart', center: [0.4, 1.2, 0.1], radius: 0.12 },
    { id: 'spleen', center: [-0.3, 0.9, 0.05], radius: 0.08 },
  ];

  it('progress = 0 时每个组的位移都恰好为 0（组装态）', () => {
    const offsets = computeExplosionOffsets(groups, axis, 0);
    expect(offsets).toHaveLength(groups.length);
    for (const item of offsets) {
      expect(item.offset).toEqual([0, 0, 0]);
    }
  });

  it('progress = 1 时确实产生非 0 位移（拆解态）', () => {
    const offsets = computeExplosionOffsets(groups, axis, 1);
    for (const item of offsets) {
      const length = Math.hypot(item.offset[0], item.offset[1], item.offset[2]);
      expect(length).toBeGreaterThan(0);
      // 位移量由该组自身半径定标，因此不会超过「半径 × 强度」的上限
      const group = groups.find((g) => g.id === item.id)!;
      expect(length).toBeLessThanOrEqual(group.radius * EXPLOSION_SPREAD + 1e-9);
    }
  });

  it('同一进度两次调用结果完全相同（可复现，无隐藏状态）', () => {
    const first = computeExplosionOffsets(groups, axis, 0.5);
    const second = computeExplosionOffsets(groups, axis, 0.5);
    expect(second).toEqual(first);
  });

  it('反复 0 → 1 → 0 → 1 不累计偏移', () => {
    const atZero = computeExplosionOffsets(groups, axis, 0);
    const atOne = computeExplosionOffsets(groups, axis, 1);
    computeExplosionOffsets(groups, axis, 1);
    computeExplosionOffsets(groups, axis, 0);
    computeExplosionOffsets(groups, axis, 1);
    expect(computeExplosionOffsets(groups, axis, 0)).toEqual(atZero);
    expect(computeExplosionOffsets(groups, axis, 1)).toEqual(atOne);
  });

  it('超出范围的进度按钳制后的值计算', () => {
    expect(computeExplosionOffsets(groups, axis, 2)).toEqual(
      computeExplosionOffsets(groups, axis, 1),
    );
    expect(computeExplosionOffsets(groups, axis, -3)).toEqual(
      computeExplosionOffsets(groups, axis, 0),
    );
  });

  it('整体外壳这类超大组的位移被半径上限压住，不会把人体推出画面', () => {
    const body = new THREE.Box3(new THREE.Vector3(-0.9, -0.9, -0.9), new THREE.Vector3(0.9, 1.8, 0.9));
    const cap = explosionMaxRadius(body);
    expect(cap).toBeGreaterThan(0);
    // 半径远大于整具人体的组（真实数据里 body-shell 半径 ≈ 人体半径）
    const giant: ExplosionGroup[] = [{ id: 'body-shell', center: [0, 0.9, 0], radius: 5 }];
    const [offset] = computeExplosionOffsets(giant, axis, 1, cap);
    const length = Math.hypot(offset.offset[0], offset.offset[1], offset.offset[2]);
    expect(length).toBeGreaterThan(0);
    expect(length).toBeLessThanOrEqual(cap * EXPLOSION_SPREAD + 1e-9);
    // 未给上限时不受约束（保持向后兼容）
    const [uncapped] = computeExplosionOffsets(giant, axis, 1);
    expect(Math.hypot(...uncapped.offset)).toBeGreaterThan(length);
  });
});

describe('体表外壳的渐进隐去', () => {
  it('组装态完全不透明，到达阈值后彻底隐去', () => {
    expect(shellOpacity(0)).toBe(1);
    expect(shellOpacity(SHELL_FADE_END)).toBe(0);
    expect(shellOpacity(1)).toBe(0);
  });

  it('在整个区间内单调不增（拖动进度条时不会突然变亮）', () => {
    let previous = 1;
    for (let step = 0; step <= 40; step += 1) {
      const value = shellOpacity(step / 100);
      expect(value).toBeLessThanOrEqual(previous + 1e-12);
      previous = value;
    }
  });

  it('非法输入按组装态处理', () => {
    expect(shellOpacity(Number.NaN)).toBe(1);
    expect(shellOpacity(-1)).toBe(1);
  });
});

describe('按解剖系统分层位移', () => {
  const axis: [number, number, number] = [0, 0, 0];
  const bodyRadius = 0.95;

  /** 同一位置、同一尺寸，只有解剖层不同：位移差异必须完全来自分层。 */
  function layered(layer: number): ExplosionGroup {
    return { id: `group-${layer}`, center: [0.3, 1, 0], radius: 0.1, layer };
  }

  it('层号越大位移越远，内层不会被外层挡住', () => {
    // 数组顺序即 0 / 1 / 2 / 4 层，比较它们的位移长度
    const groups = [layered(0), layered(1), layered(2), layered(4)];
    const offsets = computeExplosionOffsets(groups, axis, 1, Number.POSITIVE_INFINITY, bodyRadius);
    const distance = (index: number) =>
      Math.hypot(
        offsets[index].offset[0],
        offsets[index].offset[1],
        offsets[index].offset[2],
      );
    expect(distance(0)).toBeLessThan(distance(1));
    expect(distance(1)).toBeLessThan(distance(2));
    expect(distance(2)).toBeLessThan(distance(3));
  });

  it('每层额外距离恰为 人体半径 × 分层系数', () => {
    const base: ExplosionGroup[] = [layered(0)];
    const one: ExplosionGroup[] = [layered(1)];
    const narrow = computeExplosionOffsets(base, axis, 1, Number.POSITIVE_INFINITY, bodyRadius)[0];
    const wide = computeExplosionOffsets(one, axis, 1, Number.POSITIVE_INFINITY, bodyRadius)[0];
    const delta =
      Math.hypot(wide.offset[0], wide.offset[1], wide.offset[2]) -
      Math.hypot(narrow.offset[0], narrow.offset[1], narrow.offset[2]);
    expect(delta).toBeCloseTo(bodyRadius * EXPLOSION_LAYER_STEP_RATIO, 9);
  });

  it('缺省层号（未登记系统）等同于第 0 层，保持旧行为', () => {
    const groups: ExplosionGroup[] = [{ id: 'x', center: [0.3, 1, 0], radius: 0.1 }];
    const withoutBody = computeExplosionOffsets(groups, axis, 1);
    const withBody = computeExplosionOffsets(groups, axis, 1, Number.POSITIVE_INFINITY, bodyRadius);
    expect(withBody).toEqual(withoutBody);
  });
});

describe('结构归属与可读名', () => {
  /** 真实 GLB 的节点名形如 `<结构ID>__<英文名>`。 */
  function named(id: string, rawName: string, parentId?: string): THREE.Mesh {
    const object = mesh(id, parentId);
    object.name = rawName;
    return object;
  }

  const KNOWN = ['cerebrum', 'heart', 'spleen', 'body-shell'];

  it('沿解剖父链把细分结构归并到已登记器官', () => {
    const tree = sampleTree();
    tree.add(named('cerebrum-frontal-lobe', 'cerebrum-frontal-lobe__Frontal lobe', 'cerebrum'));
    const parents = buildParentMap(tree);
    expect(resolveOrganStructure('cerebrum-frontal-lobe', parents, KNOWN)).toBe('cerebrum');
    // 不在任何已登记器官之下时，宁可返回 null，也不做猜测
    expect(resolveOrganStructure('heart-valve-leaflet', parents, ['spleen'])).toBeNull();
    // 自身即已登记结构时直接命中
    expect(resolveOrganStructure('spleen', parents, KNOWN)).toBe('spleen');
  });

  it('点选结果作用在整块结构上，同时保留真实细分结构名', () => {
    const tree = sampleTree();
    const lobe = named('cerebrum-frontal-lobe', 'cerebrum-frontal-lobe__Frontal lobe', 'cerebrum');
    tree.add(lobe);
    const hit = buildStructureHit(lobe, buildParentMap(tree), KNOWN);
    expect(hit).not.toBeNull();
    expect(hit?.targetId).toBe('cerebrum');
    expect(hit?.structureId).toBe('cerebrum-frontal-lobe');
    expect(hit?.knownStructureId).toBe('cerebrum');
    expect(hit?.name).toBe('Frontal lobe');
  });

  it('未登记结构保留自身 ID 与真实英文名，不冒充器官', () => {
    const femur = named('femur', 'femur__Femur');
    const hit = buildStructureHit(femur, new Map(), KNOWN);
    expect(hit?.targetId).toBe('femur');
    expect(hit?.knownStructureId).toBeNull();
    expect(hit?.name).toBe('Femur');
  });

  it('没有 anatomyId 的对象不会被当作选中结果', () => {
    expect(buildStructureHit(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), new Map(), KNOWN)).toBeNull();
  });

  it('全小写的内部名不当作解剖名展示，取不到名字时返回 null', () => {
    const shell = named('body-shell', 'body-shell');
    expect(readableStructureName(shell, 'body-shell')).toBeNull();
    const unnamed = named('skin', 'skin');
    expect(readableStructureName(unnamed, 'skin')).toBeNull();
    const good = named('heart', 'heart__Heart');
    expect(readableStructureName(good, 'heart')).toBe('Heart');
  });
});
