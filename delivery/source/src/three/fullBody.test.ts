import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  SHELL_FADE_END,
  buildParentMap,
  buildStructureHit,
  clampProgress,
  computePlanarLayout,
  isPublicDisplayExcluded,
  readableStructureName,
  resolveGroupMembers,
  resolveOrganStructure,
  shellOpacity,
  type LayoutGroup,
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

describe('平面展开布局', () => {
  const bodyMaxDim = 1.8;
  const groups: LayoutGroup[] = [
    {
      id: 'heart',
      center: [0.4, 1.2, 0.1],
      size: [0.2, 0.24, 0.16],
      unit: 'heart',
      system: 'cardiovascular',
    },
    {
      id: 'spleen',
      center: [-0.3, 0.9, 0.05],
      size: [0.12, 0.16, 0.1],
      unit: 'spleen',
      system: 'lymphatic',
    },
    {
      id: 'body-shell',
      center: [0, 0.9, 0],
      size: [0.9, 1.8, 0.5],
      unit: 'regional-anatomy',
      system: 'regional-anatomy',
      shell: true,
    },
  ];

  const offsetOf = (layout: ReturnType<typeof computePlanarLayout>, id: string) =>
    layout.offsets.find((item) => item.id === id)!.offset;

  it('progress = 0 时每个组的位移都恰好为 0（组装态）', () => {
    const layout = computePlanarLayout(groups, 0, bodyMaxDim);
    expect(layout.offsets).toHaveLength(groups.length);
    for (const item of layout.offsets) expect(item.offset).toEqual([0, 0, 0]);
  });

  it('progress = 1 时每个单元都被收拢到同一深度平面附近', () => {
    const layout = computePlanarLayout(groups, 1, bodyMaxDim);
    for (const group of groups.filter((item) => !item.shell)) {
      const offset = offsetOf(layout, group.id);
      // 单元中心 z 被拉到 0：原始 z + 位移 ≈ 0
      expect(Math.abs(group.center[2] + offset[2])).toBeLessThan(1e-6);
    }
    // 外壳不参与打包，保持原位（它由不透明度渐隐处理）
    expect(offsetOf(layout, 'body-shell')).toEqual([0, 0, 0]);
    expect(layout.unitCount).toBe(2);
  });

  it('展开后单元确实在二维平面上分开，而不是原地不动', () => {
    const layout = computePlanarLayout(groups, 1, bodyMaxDim);
    const heart = offsetOf(layout, 'heart');
    const spleen = offsetOf(layout, 'spleen');
    expect(Math.hypot(heart[0], heart[1])).toBeGreaterThan(0);
    expect(Math.hypot(spleen[0], spleen[1])).toBeGreaterThan(0);
    // 两个单元的目标中心不同（不会叠在同一处）
    const heartTarget = [groups[0].center[0] + heart[0], groups[0].center[1] + heart[1]];
    const spleenTarget = [groups[1].center[0] + spleen[0], groups[1].center[1] + spleen[1]];
    expect(Math.hypot(heartTarget[0] - spleenTarget[0], heartTarget[1] - spleenTarget[1])).toBeGreaterThan(
      0.05,
    );
  });

  it('同一进度两次调用结果完全相同（确定性，无隐藏状态）', () => {
    expect(computePlanarLayout(groups, 0.5, bodyMaxDim)).toEqual(
      computePlanarLayout(groups, 0.5, bodyMaxDim),
    );
  });

  it('反复 0 → 1 → 0 → 1 不累计偏移', () => {
    const atZero = computePlanarLayout(groups, 0, bodyMaxDim);
    const atOne = computePlanarLayout(groups, 1, bodyMaxDim);
    computePlanarLayout(groups, 1, bodyMaxDim);
    computePlanarLayout(groups, 0, bodyMaxDim);
    computePlanarLayout(groups, 1, bodyMaxDim);
    expect(computePlanarLayout(groups, 0, bodyMaxDim)).toEqual(atZero);
    expect(computePlanarLayout(groups, 1, bodyMaxDim)).toEqual(atOne);
  });

  it('超出范围的进度按钳制后的值计算', () => {
    expect(computePlanarLayout(groups, 2, bodyMaxDim)).toEqual(
      computePlanarLayout(groups, 1, bodyMaxDim),
    );
    expect(computePlanarLayout(groups, -3, bodyMaxDim)).toEqual(
      computePlanarLayout(groups, 0, bodyMaxDim),
    );
  });

  it('系统筛选后重新布局：被隐藏的系统不再占据格子', () => {
    const filtered = computePlanarLayout(groups, 1, bodyMaxDim, { onlySystemId: 'cardiovascular' });
    expect(filtered.unitCount).toBe(1);
    // 被筛掉的脾脏位移归零
    expect(offsetOf(filtered, 'spleen')).toEqual([0, 0, 0]);
    // 仍可见的心脏照常展开
    expect(Math.hypot(...offsetOf(filtered, 'heart'))).toBeGreaterThan(0);
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

describe('公开展示过滤（中性化默认人体）', () => {
  it('生殖系统的网格一律隐去', () => {
    expect(isPublicDisplayExcluded('reproductive', 'testes-testis-left__Testis.l')).toBe(true);
    expect(isPublicDisplayExcluded('reproductive', 'prostate__Prostate')).toBe(true);
  });

  it('骨盆处的体表外壳保留，避免出现缺口（只隐去毛发，不整块删区域）', () => {
    expect(isPublicDisplayExcluded('regional-anatomy', 'body-shell__Urogenital region.l')).toBe(false);
    expect(isPublicDisplayExcluded('regional-anatomy', 'body-shell__Urogenital region.r')).toBe(false);
    expect(isPublicDisplayExcluded('regional-anatomy', 'body-shell__Pubic hairs')).toBe(true);
  });

  it('节点名被 GLTFLoader 清洗（空格与点变下划线）后仍能正确匹配', () => {
    expect(isPublicDisplayExcluded('regional-anatomy', 'body-shell__Urogenital_region_l')).toBe(false);
    expect(isPublicDisplayExcluded('regional-anatomy', 'body-shell__Urogenital_region_r')).toBe(false);
    expect(isPublicDisplayExcluded('regional-anatomy', 'body-shell__Pubic_hairs')).toBe(true);
    expect(isPublicDisplayExcluded('regional-anatomy', 'body-shell__Mammary_region_l')).toBe(false);
  });

  it('正常结构不受影响：胸部、骨盆、腹股沟、下肢都保留', () => {
    expect(isPublicDisplayExcluded('regional-anatomy', 'body-shell__Mammary region.l')).toBe(false);
    expect(isPublicDisplayExcluded('regional-anatomy', 'body-shell__Inframammary region.l')).toBe(false);
    expect(isPublicDisplayExcluded('regional-anatomy', 'body-shell__Inguinal region.l')).toBe(false);
    expect(isPublicDisplayExcluded('skeletal', 'skeleton-hip-bone-left__Hip bone.l')).toBe(false);
    expect(isPublicDisplayExcluded('urinary', 'urinary-bladder__Bladder')).toBe(false);
    expect(isPublicDisplayExcluded('nervous', 'cerebrum__Cerebrum')).toBe(false);
  });

  it('没有系统标注时只按节点名判断，不误伤', () => {
    expect(isPublicDisplayExcluded(null, 'body-shell__Sole.l')).toBe(false);
    expect(isPublicDisplayExcluded(null, 'body-shell__Pubic hairs')).toBe(true);
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
