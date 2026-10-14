import * as THREE from 'three';

/**
 * BodyDay 程序化几何工具。
 *
 * 细胞的 3D 形态全部由本工程自建几何生成：
 *  - 不依赖任何许可不明的第三方细胞模型；
 *  - 形态为**科学示意**，不是真实细胞的形态学复制，也不按真实比例。
 */

/** 确定性伪随机（同一 seed 每次得到相同细胞形态，便于截图一致与回归测试） */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/** 在球面上按黄金角分布取方向，保证分支均匀不重叠 */
export function fibonacciDirections(count: number, upwardBias = 0): THREE.Vector3[] {
  const dirs: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const dir = new THREE.Vector3(Math.cos(theta) * radius, y + upwardBias, Math.sin(theta) * radius).normalize();
    dirs.push(dir);
  }
  return dirs;
}

/** 生成一根带轻微弯曲的管状分支曲线 */
export function branchCurve(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  length: number,
  bend: number,
  rand: () => number,
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const segments = 4;
  const side = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = origin.clone().add(direction.clone().multiplyScalar(length * t));
    p.add(side.clone().multiplyScalar(Math.sin(t * Math.PI) * bend * length));
    points.push(p);
  }
  return new THREE.CatmullRomCurve3(points);
}

export function tubeFromCurve(
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  radius: number,
  radialSegments = 8,
): THREE.TubeGeometry {
  return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
}

/** 轻微不规则球体：让细胞膜/胞体看起来不像完美数学球 */
export function wobbleGeometry(geometry: THREE.BufferGeometry, amount: number, seed: number): THREE.BufferGeometry {
  const rand = createRandom(seed);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const scale = 1 + (rand() - 0.5) * amount;
    v.multiplyScalar(scale);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** 把几何体归一化到包围球直径 2，便于统一取景 */
export function normalizeToUnit(object: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const scale = sphere.radius > 0 ? 1 / sphere.radius : 1;
  object.scale.setScalar(scale);
  object.position.set(0, 0, 0);
  object.updateMatrixWorld(true);
  return scale;
}
