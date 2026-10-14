import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  CELL_VIEW_RADIUS,
  LEUKOCYTE_ANCHORS,
  LEUKOCYTE_FIT,
  LEUKOCYTE_HOTSPOTS,
  NEURON_ANCHORS,
  NEURON_FIT,
  NEURON_HOTSPOTS,
  allGeometries,
  applyFit,
  boundsOf,
  buildLeukocyteGeometry,
  buildNeuronGeometry,
  leukocyteGeometry,
  neuronGeometry,
} from './cellGeometry';

/**
 * 程序化细胞几何测试。
 *
 * 这些测试在纯计算环境中验证场景图本身（不需要 GPU）：
 * 部件数量、确定性、包围盒与取景尺度、热标锚点是否落在模型上。
 * 它们不能证明像素渲染效果，但能证明几何与标注不会错位或退化。
 */

function vertexCount(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute('position');
  return position ? position.count : 0;
}

describe('神经元几何', () => {
  it('构建出的每一块几何都非退化', () => {
    const geo = buildNeuronGeometry();
    const all = allGeometries(geo);
    expect(all.length).toBeGreaterThan(10);
    for (const g of all) {
      expect(vertexCount(g)).toBeGreaterThan(0);
    }
  });

  it('部件数量符合设计：7 根主树突（含二级分支）、1 条轴突主干 + 4 根末梢、5 段髓鞘', () => {
    const geo = buildNeuronGeometry();
    // 主分支 7 根，二级分支 2 或 3 根 → 7 + 17 = 24
    expect(geo.dendrites.length).toBe(24);
    expect(geo.axon.length).toBe(5);
    expect(geo.myelin.length).toBe(5);
  });

  it('同一 seed 下形态可复现', () => {
    const a = buildNeuronGeometry();
    const b = buildNeuronGeometry();
    expect(vertexCount(a.soma)).toBe(vertexCount(b.soma));
    expect(vertexCount(a.dendrites[0])).toBe(vertexCount(b.dendrites[0]));
    expect(vertexCount(a.myelin[0])).toBe(vertexCount(b.myelin[0]));
  });

  it('轴突沿 +X 延伸，且末梢落在轴突末端', () => {
    const geo = buildNeuronGeometry();
    expect(geo.axonTip.x).toBeGreaterThan(3);
    expect(Math.abs(geo.axonTip.y)).toBeLessThan(0.6);
  });

  it('髓鞘分段沿轴突方向依次排列（x 递增）', () => {
    const geo = buildNeuronGeometry();
    const centers = geo.myelin.map((g) => {
      g.computeBoundingBox();
      return g.boundingBox!.getCenter(new THREE.Vector3()).x;
    });
    for (let i = 1; i < centers.length; i += 1) {
      expect(centers[i]).toBeGreaterThan(centers[i - 1]);
    }
  });

  it('整体尺度适合取景：包围盒半径在可推进的范围内', () => {
    const geo = buildNeuronGeometry();
    const box = boundsOf(allGeometries(geo));
    const size = box.getSize(new THREE.Vector3());
    // 神经元的显著各向异性（长轴突）是有意为之，但不应超出可控范围
    expect(size.x).toBeGreaterThan(4);
    expect(size.x).toBeLessThan(12);
    expect(size.y).toBeLessThan(6);
    expect(size.z).toBeLessThan(6);
  });

  it('四个热标锚点都落在模型包围盒之内', () => {
    const geo = buildNeuronGeometry();
    const box = boundsOf(allGeometries(geo)).expandByScalar(0.15);
    for (const [key, anchor] of Object.entries(NEURON_ANCHORS)) {
      const point = new THREE.Vector3(...anchor);
      expect(box.containsPoint(point), `锚点 ${key} 落在模型之外`).toBe(true);
    }
  });

  it('热标锚点覆盖四个可选中部件', () => {
    expect(Object.keys(NEURON_ANCHORS).sort()).toEqual([
      'neuron-axon',
      'neuron-dendrite',
      'neuron-myelin',
      'neuron-soma',
    ]);
  });
});

describe('白细胞几何', () => {
  it('构建出的每一块几何都非退化', () => {
    const geo = buildLeukocyteGeometry();
    for (const g of allGeometries(geo)) {
      expect(vertexCount(g)).toBeGreaterThan(0);
    }
  });

  it('部件数量符合设计：分叶核 6 块、胞质颗粒 22 颗', () => {
    const geo = buildLeukocyteGeometry();
    expect(geo.nucleusLobes.length).toBe(6);
    expect(geo.granules.length).toBe(22);
  });

  it('细胞核完全位于细胞膜内部（核应被细胞质包住）', () => {
    const geo = buildLeukocyteGeometry();
    const membraneBox = boundsOf([geo.membrane]);
    const membraneRadius = membraneBox.getSize(new THREE.Vector3()).length() / 2;
    const nucleusBox = boundsOf(geo.nucleusLobes);
    const nucleusCenter = nucleusBox.getCenter(new THREE.Vector3());
    const nucleusFarCorner = nucleusBox.max.distanceTo(nucleusCenter);
    expect(nucleusFarCorner).toBeLessThan(membraneRadius);
    expect(nucleusBox.min.x).toBeGreaterThan(membraneBox.min.x);
    expect(nucleusBox.max.x).toBeLessThan(membraneBox.max.x);
  });

  it('同一 seed 下形态可复现', () => {
    const a = buildLeukocyteGeometry();
    const b = buildLeukocyteGeometry();
    expect(vertexCount(a.membrane)).toBe(vertexCount(b.membrane));
    expect(vertexCount(a.granules[3])).toBe(vertexCount(b.granules[3]));
  });

  it('尺度适合取景：整体接近球形的可视尺寸', () => {
    const geo = buildLeukocyteGeometry();
    const size = boundsOf(allGeometries(geo)).getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(1.6);
    expect(size.x).toBeLessThan(3.2);
  });

  it('三个热标锚点都落在模型包围盒之内', () => {
    const geo = buildLeukocyteGeometry();
    const box = boundsOf(allGeometries(geo)).expandByScalar(0.15);
    for (const [key, anchor] of Object.entries(LEUKOCYTE_ANCHORS)) {
      const point = new THREE.Vector3(...anchor);
      expect(box.containsPoint(point), `锚点 ${key} 落在模型之外`).toBe(true);
    }
  });

  it('热标锚点覆盖三个可选中部件', () => {
    expect(Object.keys(LEUKOCYTE_ANCHORS).sort()).toEqual([
      'leukocyte-cytoplasm',
      'leukocyte-membrane',
      'leukocyte-nucleus',
    ]);
  });
});

/**
 * 取景归一化：这是浏览器验收中发现的真实缺陷的回归护栏。
 * 未归一化时，神经元的轴突末端（髓鞘）会落到默认机位的视锥之外，热标不可见。
 */
describe('取景归一化', () => {
  it('归一化后模型的最大半轴等于目标视景半径，且居中', () => {
    for (const [fit, geometry] of [
      [NEURON_FIT, neuronGeometry()],
      [LEUKOCYTE_FIT, leukocyteGeometry()],
    ] as const) {
      const sourceBox = boundsOf(allGeometries(geometry));
      const matrix = new THREE.Matrix4()
        .makeScale(fit.scale, fit.scale, fit.scale)
        .setPosition(new THREE.Vector3(...fit.offset));
      const fittedBox = sourceBox.clone().applyMatrix4(matrix);
      const half = fittedBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      expect(Math.max(half.x, half.y, half.z)).toBeCloseTo(CELL_VIEW_RADIUS, 4);
      const center = fittedBox.getCenter(new THREE.Vector3());
      expect(center.length()).toBeLessThan(0.25);
    }
  });

  it('神经元四条热标在归一化后全部落在可视半径内（修复髓鞘热标被裁掉的问题）', () => {
    const points = Object.values(NEURON_HOTSPOTS).map((a) => new THREE.Vector3(...a));
    expect(points.length).toBe(4);
    for (const p of points) {
      expect(p.length(), `热标 ${p.toArray().join(',')} 超出可视半径`).toBeLessThanOrEqual(
        CELL_VIEW_RADIUS * 0.95,
      );
    }
  });

  it('白细胞三条热标在归一化后全部落在可视半径内', () => {
    for (const a of Object.values(LEUKOCYTE_HOTSPOTS)) {
      expect(new THREE.Vector3(...a).length()).toBeLessThanOrEqual(CELL_VIEW_RADIUS * 0.95);
    }
  });

  it('归一化是确定性变换：applyFit 结果与导出的热标完全一致', () => {
    for (const [key, raw] of Object.entries(NEURON_ANCHORS)) {
      expect(NEURON_HOTSPOTS[key]).toEqual(applyFit(raw, NEURON_FIT));
    }
    for (const [key, raw] of Object.entries(LEUKOCYTE_ANCHORS)) {
      expect(LEUKOCYTE_HOTSPOTS[key]).toEqual(applyFit(raw, LEUKOCYTE_FIT));
    }
  });
});
