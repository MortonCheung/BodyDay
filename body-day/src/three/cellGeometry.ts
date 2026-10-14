import * as THREE from 'three';
import { branchCurve, createRandom, fibonacciDirections, tubeFromCurve, wobbleGeometry } from './procedural';

/**
 * BodyDay 程序化细胞几何（纯 three.js 计算，不依赖 React / GPU）。
 *
 * 抽成独立模块的原因有两条：
 *  1. 形态必须可被单元测试直接验证（部件数量、包围盒、取景尺度）；
 *  2. 模型组件只负责渲染与交互，几何的可复现性由本模块保证。
 *
 * 科学边界：形态为**科学示意**，不是真实细胞的形态学复制，也不按真实比例。
 */

/* ---------------- 神经元 ---------------- */

export const NEURON_COLOR = {
  soma: '#4a5568',
  nucleus: '#333e4c',
  dendrite: '#5d6a7c',
  axon: '#6d798a',
  myelin: '#b8a37a',
};

/** 热标锚点（模型局部坐标系，单位为归一化前的场景单位） */
export const NEURON_ANCHORS: Record<string, [number, number, number]> = {
  'neuron-soma': [-0.5, 0.55, 0.3],
  'neuron-dendrite': [-1.45, 1.2, 0.35],
  'neuron-axon': [1.55, -0.18, 0.14],
  'neuron-myelin': [2.55, 0.2, 0.14],
};

export interface NeuronGeometry {
  soma: THREE.BufferGeometry;
  nucleus: THREE.BufferGeometry;
  dendrites: THREE.BufferGeometry[];
  axon: THREE.BufferGeometry[];
  myelin: THREE.BufferGeometry[];
  /** 轴突末梢位置，供上层做取景与标注参考 */
  axonTip: THREE.Vector3;
}

export const NEURON_SEED = 20261014;

export function buildNeuronGeometry(): NeuronGeometry {
  const rand = createRandom(NEURON_SEED);

  // 胞体：轻微不规则球体
  const soma = wobbleGeometry(new THREE.SphereGeometry(0.62, 40, 28), 0.07, 7);
  const nucleus = new THREE.SphereGeometry(0.3, 26, 18);

  // 树突：7 根主分支 + 每根 2–3 根二级分支（形成有分量的树突树）
  const dendrites: THREE.BufferGeometry[] = [];
  const primaryDirections = fibonacciDirections(7, 0.35);
  primaryDirections.forEach((dir, index) => {
    const length = 1.15 + rand() * 0.6;
    const curve = branchCurve(new THREE.Vector3(0, 0, 0), dir, length, 0.18, rand);
    dendrites.push(tubeFromCurve(curve, 24, 0.09 - index * 0.005, 9));

    const tip = curve.getPoint(0.72);
    const subCount = 2 + (index % 2);
    for (let s = 0; s < subCount; s += 1) {
      const subDir = dir
        .clone()
        .add(new THREE.Vector3(rand() - 0.5, rand() * 0.6, rand() - 0.5))
        .normalize();
      const subCurve = branchCurve(tip, subDir, 0.45 + rand() * 0.3, 0.3, rand);
      dendrites.push(tubeFromCurve(subCurve, 14, 0.05, 8));
    }
  });

  // 轴突：自胞体向 +X 延伸（长度经过收敛，避免默认机位下模型过于细长）
  const axon: THREE.BufferGeometry[] = [];
  const axonStart = new THREE.Vector3(0.5, 0, 0);
  const axonDirection = new THREE.Vector3(1, -0.1, 0.04).normalize();
  const axonCurve = branchCurve(axonStart, axonDirection, 2.9, 0.085, rand);
  axon.push(tubeFromCurve(axonCurve, 40, 0.09, 12));

  const axonTip = axonCurve.getPoint(1);
  for (let i = 0; i < 4; i += 1) {
    const dir = new THREE.Vector3(0.7, (rand() - 0.5) * 1.1, (rand() - 0.5) * 1.1).normalize();
    const terminal = branchCurve(axonTip, dir, 0.3 + rand() * 0.22, 0.22, rand);
    axon.push(tubeFromCurve(terminal, 12, 0.04, 8));
  }

  // 髓鞘：沿轴突分段包绕，段间留出间隙（对应郎飞结的示意）
  const myelin: THREE.BufferGeometry[] = [];
  const segmentCount = 5;
  for (let i = 0; i < segmentCount; i += 1) {
    const t = 0.22 + i * 0.15;
    const center = axonCurve.getPoint(t);
    const next = axonCurve.getPoint(Math.min(1, t + 0.02));
    const tangent = next.clone().sub(center).normalize();
    const geometry = new THREE.CylinderGeometry(0.18, 0.18, 0.42, 20, 1, false);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    const matrix = new THREE.Matrix4().compose(center, quaternion, new THREE.Vector3(1, 1, 1));
    geometry.applyMatrix4(matrix);
    myelin.push(geometry);
  }

  return { soma, nucleus, dendrites, axon, myelin, axonTip };
}

/* ---------------- 白细胞 ---------------- */

export const LEUKOCYTE_COLOR = {
  membrane: '#7f8c5c',
  cytoplasm: '#9aa884',
  nucleus: '#4f5c38',
};

export const LEUKOCYTE_ANCHORS: Record<string, [number, number, number]> = {
  // 锚点贴合各结构的实际表面：膜在最外、胞质在其内、核在更内
  'leukocyte-membrane': [-0.78, 0.5, 0.33],
  'leukocyte-cytoplasm': [0.6, -0.5, 0.36],
  'leukocyte-nucleus': [-0.16, 0.28, 0.78],
};

export interface LeukocyteGeometry {
  membrane: THREE.BufferGeometry;
  cytoplasm: THREE.BufferGeometry;
  nucleusLobes: THREE.BufferGeometry[];
  granules: THREE.BufferGeometry[];
}

export const LEUKOCYTE_SEED = 5412026;

export function buildLeukocyteGeometry(): LeukocyteGeometry {
  const rand = createRandom(LEUKOCYTE_SEED);

  const membrane = wobbleGeometry(new THREE.SphereGeometry(1.0, 48, 32), 0.1, 21);
  const cytoplasm = wobbleGeometry(new THREE.SphereGeometry(0.82, 40, 26), 0.07, 33);

  // 分叶核：体现中性粒细胞核的形态特征
  const nucleusLobes: THREE.BufferGeometry[] = [];
  const lobeCenters: [number, number, number][] = [
    [-0.24, 0.22, 0.32],
    [0.02, 0.36, 0.18],
    [0.26, 0.18, 0.26],
    [0.12, -0.04, 0.44],
    [-0.18, -0.02, 0.42],
  ];
  lobeCenters.forEach((c, i) => {
    const geometry = new THREE.SphereGeometry(0.3 + rand() * 0.05, 24, 18);
    geometry.translate(c[0], c[1], c[2]);
    nucleusLobes.push(geometry);
    if (i === 0) {
      const extra = new THREE.SphereGeometry(0.24, 20, 16);
      extra.translate(c[0] + 0.16, c[1] - 0.16, c[2] - 0.08);
      nucleusLobes.push(extra);
    }
  });

  const granules: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 22; i += 1) {
    const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    const radius = 0.46 + rand() * 0.26;
    const geometry = new THREE.SphereGeometry(0.022 + rand() * 0.026, 8, 6);
    geometry.translate(dir.x * radius, dir.y * radius, dir.z * radius);
    granules.push(geometry);
  }

  return { membrane, cytoplasm, nucleusLobes, granules };
}

/** 计算一组几何的合并包围盒（用于验证取景尺度是否合理） */
export function boundsOf(geometries: THREE.BufferGeometry[]): THREE.Box3 {
  const box = new THREE.Box3();
  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
  }
  return box;
}

/** 取得某个模型的全部几何（用于测试与包围盒计算） */
export function allGeometries(geometry: NeuronGeometry | LeukocyteGeometry): THREE.BufferGeometry[] {
  if ('soma' in geometry) {
    return [geometry.soma, geometry.nucleus, ...geometry.dendrites, ...geometry.axon, ...geometry.myelin];
  }
  return [geometry.membrane, geometry.cytoplasm, ...geometry.nucleusLobes, ...geometry.granules];
}

/* ---------------- 取景归一化 ---------------- */

export interface FitTransform {
  scale: number;
  offset: [number, number, number];
}

/**
 * 计算把模型装进一个半径 `targetRadius` 的包围球的确定性变换。
 *
 * 为什么必须有这一步：神经元沿轴突方向的各向异性很强（长轴约 6.8），
 * 若直接按原始尺度摆放，默认机位下轴突末端的髓鞘会落到视锥之外，
 * 热标因此不可见。归一化后，任何细胞的默认机位都能完整取景。
 */
export function computeFitTransform(
  geometries: THREE.BufferGeometry[],
  targetRadius = 1.6,
): FitTransform {
  const box = boundsOf(geometries);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const maxHalfExtent = Math.max(half.x, half.y, half.z);
  const radius = maxHalfExtent > 0 ? maxHalfExtent : sphere.radius;
  const scale = radius > 0 ? targetRadius / radius : 1;
  return {
    scale,
    offset: [
      -sphere.center.x * scale,
      -sphere.center.y * scale,
      -sphere.center.z * scale,
    ],
  };
}

export function applyFit(anchor: [number, number, number], fit: FitTransform): [number, number, number] {
  return [
    anchor[0] * fit.scale + fit.offset[0],
    anchor[1] * fit.scale + fit.offset[1],
    anchor[2] * fit.scale + fit.offset[2],
  ];
}

/** 缓存的几何单例：同一形态被模型组件与热标锚点共用，保证完全一致 */
let neuronGeometryCache: NeuronGeometry | null = null;
let leukocyteGeometryCache: LeukocyteGeometry | null = null;

export function neuronGeometry(): NeuronGeometry {
  if (!neuronGeometryCache) neuronGeometryCache = buildNeuronGeometry();
  return neuronGeometryCache;
}

export function leukocyteGeometry(): LeukocyteGeometry {
  if (!leukocyteGeometryCache) leukocyteGeometryCache = buildLeukocyteGeometry();
  return leukocyteGeometryCache;
}

/**
 * 归一化后模型在**最大半轴方向**上的目标半长。
 * 用「最大半轴」而不是「包围盒对角线」做归一化，是为了避免
 * 因对角线过冲导致模型在默认机位下显得过小。
 */
export const CELL_VIEW_RADIUS = 1.5;

export const NEURON_FIT: FitTransform = computeFitTransform(allGeometries(neuronGeometry()), CELL_VIEW_RADIUS);
export const LEUKOCYTE_FIT: FitTransform = computeFitTransform(allGeometries(leukocyteGeometry()), CELL_VIEW_RADIUS);

/** 已应用归一化的热标锚点 —— 舞台必须使用这一组 */
export const NEURON_HOTSPOTS: Record<string, [number, number, number]> = Object.fromEntries(
  Object.entries(NEURON_ANCHORS).map(([k, v]) => [k, applyFit(v, NEURON_FIT)]),
);

export const LEUKOCYTE_HOTSPOTS: Record<string, [number, number, number]> = Object.fromEntries(
  Object.entries(LEUKOCYTE_ANCHORS).map(([k, v]) => [k, applyFit(v, LEUKOCYTE_FIT)]),
);
