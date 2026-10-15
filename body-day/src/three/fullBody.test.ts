import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  EXPLOSION_SPREAD,
  buildParentMap,
  clampProgress,
  computeBodyAxis,
  computeExplosionOffsets,
  explosionMaxRadius,
  resolveGroupMembers,
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
