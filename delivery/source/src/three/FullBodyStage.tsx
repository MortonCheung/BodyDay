import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import {
  EXPLOSION_SYSTEM_LAYER,
  FULL_BODY_MODEL_URL,
  SHELL_FADE_END,
  SHELL_STRUCTURE_ID,
  STRUCTURE_TINT,
  buildParentMap,
  buildStructureHit,
  clampProgress,
  computeBodyAxis,
  computeExplosionOffsets,
  explosionMaxRadius,
  resolveGroupMembers,
  shellOpacity,
  type ExplosionGroup,
} from './fullBody';
import { FOREGROUND_STRUCTURE_IDS, type StructureHit } from '../services/atlas';

/**
 * 整具人体舞台（V2 产品级）。
 *
 * 与旧的 Vanatome 封装不同，这里由本作品自己的 Canvas 直接承载 atlas 自带的
 * 「curated-full-body」整具人体 GLB，因此可以拿到真实网格对象并**逐组位移**。
 *
 * 三条不可退让的规则：
 * 1. 位移永远按 progress 重新计算并覆盖 `position`，从不累加；
 * 2. 结构归属完全读 glTF 的 `extras`（three 写进 `Object3D.userData`），不猜 ID；
 * 3. 一切不透明度/高亮都只作用在**本舞台自己克隆的材质**上，绝不改动共享材质。
 */

/** 用于取证的器官分组：heart / cerebrum / cerebellum / brainstem 是无几何的分组节点，spleen 自身即节点。 */
const PROBE_IDS = ['heart', 'cerebrum', 'cerebellum', 'brainstem', 'spleen'] as const;

const ZERO_OFFSET: [number, number, number] = [0, 0, 0];

/** 悬停：真实材质上的暖色自发光，保留原有彩绘，不出现「暗色剪影」。 */
const HOVER_EMISSIVE = new THREE.Color('#c65a2e');
const HOVER_INTENSITY = 0.3;
/** 选中：比悬停更强的自发光，叠加「聚焦 + 隔离」，与悬停一眼可辨。 */
const SELECTED_EMISSIVE = new THREE.Color('#8f3a1c');
const SELECTED_INTENSITY = 0.62;

type TintableMaterial = THREE.Material & {
  color?: THREE.Color;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  opacity?: number;
  transparent?: boolean;
  depthWrite?: boolean;
};

export interface FullBodyStats {
  /** 场景图里的节点总数（期望 984） */
  nodeCount: number;
  /** 网格数（期望 984） */
  meshCount: number;
  /** 三角形数（期望 1,746,560） */
  triangleCount: number;
  /** 唯一 anatomyId 数量（期望 749） */
  uniqueAnatomyIds: number;
  /** 器官分组归并出的网格数（含自身网格） */
  groupCounts: Record<string, number>;
  /** 从舞台挂载到「装配完成 + 首个有效帧」的实测毫秒数 */
  loadMs: number;
  /** 真实 extras 进入 userData 的证据 */
  sampleAnatomyId: string | null;
  sampleAnatomyParentId: string | null;
  sampleAnatomySystem: string | null;
  sampleUserDataKeys: string[];
}

export interface FullBodyProbe {
  progress: number;
  /** 被探查结构组当前（位移后）的模型坐标系包围盒中心 */
  centers: Record<string, [number, number, number]>;
  /** 同上，包围盒半径 */
  radii: Record<string, number>;
  /**
   * 同一批结构组在画布上的**真实屏幕坐标**（CSS 像素，相对画布左上角）。
   *
   * 这是想验证「拆解之后还能不能点中某个器官」时必须的量：只给模型坐标无法落在画布上。
   * 坐标由当前相机矩阵实时投影得到，取不到投影（在背后）时为 null。
   */
  screen: Record<string, { x: number; y: number } | null>;
  /** 镜头真实位置与到焦点距离：用于判断取景是否随 progress 变化 */
  camera: { position: [number, number, number]; distance: number };
  /** 当前全部可见网格数（外壳隐去与隔离生效的读数） */
  visibleMeshes: number;
  /** 外壳材质的实际不透明度（0 表示已隐去） */
  shellOpacity: number;
  /** 半径最大的若干可位移组：用于判断是否存在「超大组」导致整体飞出 */
  largestGroups: { id: string; radius: number; offsetMagnitude: number; meshCount: number }[];
}

/** 封面需要的真实字节进度（来自 drei 的全局加载管理器） */
export interface FullBodyLoadState {
  loaded: number;
  total: number;
  /** 0..1；无法判定时为 0 */
  ratio: number;
}

export interface FullBodyStageProps {
  /** 拆解进度，受控，钳制在 [0,1] */
  progress: number;
  selectedStructureId: string | null;
  onSelectStructure: (hit: StructureHit | null) => void;
  onHoverStructure?: (hit: StructureHit | null) => void;
  /** 递增即把镜头聚焦到选中结构（基于真实几何包围盒） */
  focusNonce: number;
  /** 递增即把镜头复位到适配当前拆解程度的机位 */
  resetNonce: number;
  /** 隔离：只显示选中结构 */
  isolate: boolean;
  /** 只显示该解剖系统（null = 全部显示） */
  onlySystemId?: string | null;
  /** 装配完成 + 首个有效帧后触发一次 */
  onReady?: (stats: FullBodyStats) => void;
  /** 每次场景状态重算后上报真实读数（用于数值验收） */
  onProbe?: (probe: FullBodyProbe) => void;
  /** GLB 下载的真实字节进度（封面用） */
  onProgress?: (state: FullBodyLoadState) => void;
  ariaLabel?: string;
  canvasKey?: string;
}

/** 舞台内部预先算好的模型索引：结构组、基座位置、基座包围盒、材质、统计数字。 */
interface ModelIndex {
  model: THREE.Object3D;
  meshes: THREE.Mesh[];
  parents: Map<string, string>;
  /** mesh → 它所属的可位移组 id */
  meshGroup: Map<THREE.Mesh, string>;
  /** mesh → 其 atlas 系统 ID（`extras.anatomySystem`） */
  meshSystem: Map<THREE.Mesh, string | null>;
  /** 被判定为体表外壳的网格 */
  shellMeshes: THREE.Mesh[];
  shellSet: Set<THREE.Mesh>;
  basePositions: Map<THREE.Mesh, THREE.Vector3>;
  baseBoxes: Map<THREE.Mesh, THREE.Box3>;
  /** 每组当前的位移向量（由 applyExplosion 写入） */
  currentOffsets: Map<string, [number, number, number]>;
  /** 每组包含的网格数 */
  groupMeshCount: Map<string, number>;
  groups: ExplosionGroup[];
  bounds: THREE.Box3;
  axis: [number, number, number];
  /** 单组位移半径上限（由整具人体包围盒推出） */
  maxRadius: number;
  /** 整具人体的包围球半径（用于把解剖层换算成真实距离） */
  bodyRadius: number;
  /** 每个材质的高亮基准值，用于还原 */
  emissiveBase: Map<TintableMaterial, { color: THREE.Color; intensity: number }>;
  stats: Omit<FullBodyStats, 'loadMs'>;
}

function anatomyIdOf(object: THREE.Object3D): string | null {
  const id = object.userData?.anatomyId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** 取网格当前实际使用的材质数组（本舞台已保证每个网格持有自己的克隆材质）。 */
function materialsOf(mesh: THREE.Mesh): TintableMaterial[] {
  if (Array.isArray(mesh.material)) return mesh.material as TintableMaterial[];
  return [mesh.material as TintableMaterial];
}

/** mesh 的几何包围盒，换算到「模型根节点的局部坐标系」（不含根节点自身的变换）。 */
function meshBoxInModelSpace(mesh: THREE.Mesh, model: THREE.Object3D): THREE.Box3 {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const box = (mesh.geometry.boundingBox ?? new THREE.Box3()).clone();
  const chain: THREE.Object3D[] = [];
  let cursor: THREE.Object3D | null = mesh;
  while (cursor && cursor !== model) {
    chain.push(cursor);
    cursor = cursor.parent;
  }
  const matrix = new THREE.Matrix4();
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    chain[i].updateMatrix();
    matrix.multiply(chain[i].matrix);
  }
  return box.applyMatrix4(matrix);
}

/** 判断某个 mesh 是否归属于结构 id（自身命中，或其解剖父链命中）。 */
function belongsTo(mesh: THREE.Mesh, parents: Map<string, string>, id: string): boolean {
  const own = anatomyIdOf(mesh);
  if (!own) return false;
  if (own === id) return true;
  let cursor = parents.get(own);
  let guard = 0;
  while (cursor && guard < 64) {
    if (cursor === id) return true;
    cursor = parents.get(cursor);
    guard += 1;
  }
  return false;
}

/**
 * 可位移组：从 mesh 的解剖父链向上找**最近的、自身没有几何的分组节点**（如 heart / cerebrum）。
 * 找不到分组节点时，该 mesh 自己就是一组。这样分组结构的后代会被当作一个整体位移，不会散开。
 */
function movableGroupOf(own: string, parents: Map<string, string>, hasGeometry: Set<string>): string {
  let cursor = parents.get(own);
  let guard = 0;
  while (cursor && guard < 64) {
    if (!hasGeometry.has(cursor)) return cursor;
    cursor = parents.get(cursor);
    guard += 1;
  }
  return own;
}

/**
 * 每个网格的材质替换为**自己的克隆**。
 *
 * GLB 里 984 个网格只共享 64 个材质，直接在共享材质上改不透明度或自发光会污染整个模型；
 * 克隆一次之后，外壳淡化与高亮都可以安全地按网格生效。
 */
function cloneMeshMaterials(mesh: THREE.Mesh): void {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((material) => material.clone());
  } else if (mesh.material) {
    mesh.material = mesh.material.clone();
  }
}

function buildModelIndex(model: THREE.Object3D): ModelIndex {
  const meshes: THREE.Mesh[] = [];
  const ids = new Set<string>();
  const hasGeometry = new Set<string>();
  const meshSystem = new Map<THREE.Mesh, string | null>();
  let nodeCount = 0;

  model.traverse((object) => {
    // 根节点不算「模型节点」：模型自身的 984 个节点才是统计口径
    if (object === model) return;
    nodeCount += 1;
    const id = anatomyIdOf(object);
    if (id) ids.add(id);
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;
      meshes.push(mesh);
      if (id) hasGeometry.add(id);
      const system = object.userData?.anatomySystem;
      meshSystem.set(mesh, typeof system === 'string' && system.length > 0 ? system : null);
    }
  });

  // 材质克隆必须在任何位移/淡化/高亮之前完成一次
  for (const mesh of meshes) cloneMeshMaterials(mesh);

  // 结构部分统一到暖调色板：让中央模型与暖白纸面属于同一套视觉语言（器官保留真实配色）
  for (const mesh of meshes) {
    const hex = STRUCTURE_TINT[meshSystem.get(mesh) ?? ''];
    if (!hex) continue;
    const tint = new THREE.Color(hex);
    for (const material of materialsOf(mesh)) {
      if (material.color) material.color.copy(tint);
    }
  }

  const parents = buildParentMap(model);

  const meshGroup = new Map<THREE.Mesh, string>();
  const groupMeshCount = new Map<string, number>();
  const basePositions = new Map<THREE.Mesh, THREE.Vector3>();
  const baseBoxes = new Map<THREE.Mesh, THREE.Box3>();
  const shellMeshes: THREE.Mesh[] = [];
  const bounds = new THREE.Box3();
  const grouped = new Map<string, THREE.Box3>();
  const groupSystem = new Map<string, string | null>();

  for (const mesh of meshes) {
    basePositions.set(mesh, mesh.position.clone());
    const box = meshBoxInModelSpace(mesh, model);
    baseBoxes.set(mesh, box);
    bounds.union(box);
    if (belongsTo(mesh, parents, SHELL_STRUCTURE_ID)) shellMeshes.push(mesh);
    const own = anatomyIdOf(mesh) ?? `__mesh_${meshes.indexOf(mesh)}`;
    const groupId = movableGroupOf(own, parents, hasGeometry);
    meshGroup.set(mesh, groupId);
    groupMeshCount.set(groupId, (groupMeshCount.get(groupId) ?? 0) + 1);
    if (!groupSystem.has(groupId)) groupSystem.set(groupId, meshSystem.get(mesh) ?? null);
    const existing = grouped.get(groupId);
    if (existing) existing.union(box);
    else grouped.set(groupId, box.clone());
  }

  const groups: ExplosionGroup[] = [];
  for (const [id, box] of grouped) {
    const center = box.getCenter(new THREE.Vector3());
    const system = groupSystem.get(id) ?? null;
    groups.push({
      id,
      center: [center.x, center.y, center.z],
      radius: box.getSize(new THREE.Vector3()).length() / 2,
      layer: system ? EXPLOSION_SYSTEM_LAYER[system] ?? 0 : 0,
    });
  }

  let triangleCount = 0;
  for (const mesh of meshes) {
    const index = mesh.geometry.getIndex();
    const position = mesh.geometry.getAttribute('position');
    triangleCount += index ? index.count / 3 : position ? position.count / 3 : 0;
  }
  triangleCount = Math.round(triangleCount);

  const firstWithExtras = meshes.find((mesh) => anatomyIdOf(mesh)) ?? null;
  const groupCounts: Record<string, number> = {};
  for (const id of PROBE_IDS) {
    const ownMeshes = meshes.filter((mesh) => anatomyIdOf(mesh) === id).length;
    const descendants = resolveGroupMembers(model, id, parents).filter(
      (object) => (object as THREE.Mesh).isMesh,
    ).length;
    groupCounts[id] = ownMeshes + descendants;
  }

  const bodyRadius = bounds.getSize(new THREE.Vector3()).length() / 2;

  return {
    model,
    meshes,
    parents,
    meshGroup,
    meshSystem,
    shellMeshes,
    shellSet: new Set(shellMeshes),
    basePositions,
    baseBoxes,
    currentOffsets: new Map(),
    groupMeshCount,
    groups,
    bounds,
    axis: computeBodyAxis(bounds),
    maxRadius: explosionMaxRadius(bounds),
    bodyRadius,
    emissiveBase: new Map(),
    stats: {
      nodeCount,
      meshCount: meshes.length,
      triangleCount,
      uniqueAnatomyIds: ids.size,
      groupCounts,
      sampleAnatomyId: firstWithExtras ? anatomyIdOf(firstWithExtras) : null,
      sampleAnatomyParentId:
        typeof firstWithExtras?.userData?.anatomyParentId === 'string'
          ? firstWithExtras.userData.anatomyParentId
          : null,
      sampleAnatomySystem:
        typeof firstWithExtras?.userData?.anatomySystem === 'string'
          ? firstWithExtras.userData.anatomySystem
          : null,
      sampleUserDataKeys: firstWithExtras ? Object.keys(firstWithExtras.userData) : [],
    },
  };
}

const REUSED_VECTOR = new THREE.Vector3();

/** 按 progress 重算并覆盖每个 mesh 的位移（不累加）。 */
function applyExplosion(index: ModelIndex, progress: number): void {
  const offsets = computeExplosionOffsets(
    index.groups,
    index.axis,
    progress,
    index.maxRadius,
    index.bodyRadius,
  );
  const current = new Map<string, [number, number, number]>();
  for (const item of offsets) current.set(item.id, item.offset);
  index.currentOffsets = current;
  for (const [mesh, groupId] of index.meshGroup) {
    const base = index.basePositions.get(mesh);
    if (!base) continue;
    const offset = current.get(groupId) ?? ZERO_OFFSET;
    mesh.position.set(base.x + offset[0], base.y + offset[1], base.z + offset[2]);
  }
}

/** 位移后的整具人体包围盒（按基座包围盒 + 组位移得到，每次只要遍历一遍网格）。 */
function explodedBounds(index: ModelIndex): THREE.Box3 {
  const box = new THREE.Box3();
  for (const mesh of index.meshes) {
    const base = index.baseBoxes.get(mesh);
    if (!base) continue;
    const offset = index.currentOffsets.get(index.meshGroup.get(mesh) ?? '') ?? ZERO_OFFSET;
    box.union(base.clone().translate(REUSED_VECTOR.set(offset[0], offset[1], offset[2])));
  }
  return box;
}

/** 把位移后的 mesh 基座包围盒并起来，得到某结构组当前的包围盒。 */
function currentBox(index: ModelIndex, id: string): THREE.Box3 | null {
  const box = new THREE.Box3();
  let found = false;
  for (const mesh of index.meshes) {
    if (!belongsTo(mesh, index.parents, id)) continue;
    const base = index.baseBoxes.get(mesh);
    if (!base) continue;
    const offset = index.currentOffsets.get(index.meshGroup.get(mesh) ?? '') ?? ZERO_OFFSET;
    box.union(base.clone().translate(new THREE.Vector3(offset[0], offset[1], offset[2])));
    found = true;
  }
  return found ? box : null;
}

/**
 * 外壳与可见性。
 *
 * 拆解必须「先去掉皮肤」才能看见内部，所以体表外壳随进度渐进隐去；
 * 到了完全隐去的阈值后直接把 236 个外壳网格设为不可见——既省掉这部分绘制，
 * 也避免一个几乎全透明的壳体继续截住射线、让人点不中里面的器官。
 * 若用户正好选中了体表本身（隔离目标就是外壳），则保持不透明，否则会看到一片空白。
 */
function applyVisibility(
  index: ModelIndex,
  isolateId: string | null,
  onlySystemId: string | null,
  progress: number,
): number {
  const isolateTargetsShell = isolateId === SHELL_STRUCTURE_ID;
  const opacity = isolateTargetsShell ? 1 : shellOpacity(progress);
  const hideShell = !isolateTargetsShell && clampProgress(progress) >= SHELL_FADE_END;

  for (const mesh of index.shellMeshes) {
    for (const material of materialsOf(mesh)) {
      // 只在「是否透明」真正翻转时触发重编译：每帧改 needsUpdate 会让 236 个网格各自重编着色器
      const transparent = opacity < 1;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.opacity = opacity;
      material.depthWrite = opacity >= 0.99;
    }
  }

  for (const mesh of index.meshes) {
    const bySystem = !onlySystemId || index.meshSystem.get(mesh) === onlySystemId;
    const byIsolate = !isolateId || belongsTo(mesh, index.parents, isolateId);
    const byShell = !(hideShell && index.shellSet.has(mesh));
    const visible = bySystem && byIsolate && byShell;
    mesh.visible = visible;
    /**
     * 同时把不可见的网格移出第 0 层：three 的射线检测会读 `layers`，
     * 仅靠 `visible=false` 并不能保证「看不见的壳体不再挡住点击」。
     * 这一步是「拆解之后仍然点得中里面的器官」的直接前提。
     */
    if (visible) mesh.layers.enable(0);
    else mesh.layers.disable(0);
  }
  return opacity;
}

/**
 * 高亮：在真实材质的自发光上叠加，不做材质替换。
 *
 * 每次都先把上一次改过自发光还原到基准值，再重新上色，因此
 * 「悬停 → 移开 → 选中」不会残留上一次的着色。
 */
function applyHighlight(index: ModelIndex, hoveredId: string | null, selectedId: string | null): void {
  for (const [material, base] of index.emissiveBase) {
    material.emissive?.copy(base.color);
    material.emissiveIntensity = base.intensity;
  }
  index.emissiveBase.clear();

  const paint = (id: string, color: THREE.Color, intensity: number) => {
    for (const mesh of index.meshes) {
      if (!belongsTo(mesh, index.parents, id)) continue;
      for (const material of materialsOf(mesh)) {
        if (!material.emissive) continue;
        if (!index.emissiveBase.has(material)) {
          index.emissiveBase.set(material, {
            color: material.emissive.clone(),
            intensity: material.emissiveIntensity ?? 1,
          });
        }
        material.emissive.copy(color);
        material.emissiveIntensity = intensity;
      }
    }
  };

  if (selectedId) paint(selectedId, SELECTED_EMISSIVE, SELECTED_INTENSITY);
  if (hoveredId && hoveredId !== selectedId) paint(hoveredId, HOVER_EMISSIVE, HOVER_INTENSITY);
}

type OrbitLike = { target: THREE.Vector3; update: () => void };

interface FramingGoal {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

/**
 * 取景：让**位移后的整体包围盒**填满画面。
 *
 * 分层位移到完全拆解时，最内层会被推到约一个体半径之外；若镜头不跟着拉远，
 * 拆解过程就会把人体推出画面（这是上一轮 spike 实测踩到的真实缺陷）。
 * 方向沿用用户当前的观察角度，因此取景只改变距离与中心，不改变视角。
 */
function framingGoal(
  index: ModelIndex,
  camera: THREE.PerspectiveCamera,
  controls: OrbitLike | null,
  padding: number,
  box?: THREE.Box3,
): FramingGoal {
  const target = (box ?? explodedBounds(index)).clone();
  const size = target.getSize(new THREE.Vector3());
  const center = target.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const lookAt = controls?.target ?? center;
  const direction = camera.position.clone().sub(lookAt);
  if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1);
  direction.normalize();
  return {
    position: center.clone().add(direction.multiplyScalar(maxDim * padding)),
    target: center,
  };
}

/** 封面用的真实字节进度：只订阅 drei 的加载进度，不参与舞台渲染决策。 */
function LoadProgressReporter({ onProgress }: { onProgress?: (state: FullBodyLoadState) => void }) {
  const { loaded, total, progress } = useProgress();
  const callback = useRef(onProgress);
  const lastRatio = useRef(-1);
  useEffect(() => {
    callback.current = onProgress;
  });
  useEffect(() => {
    const ratio = total > 0 ? loaded / total : progress / 100;
    if (!Number.isFinite(ratio)) return;
    if (Math.abs(ratio - lastRatio.current) < 0.002) return;
    lastRatio.current = ratio;
    callback.current?.({ loaded, total, ratio: clampProgress(ratio) });
  }, [loaded, total, progress]);
  return null;
}

interface ModelRigProps {
  /** 舞台挂载时刻：就绪耗时必须从「文件还没开始下载」算起，而不是从模型解析完算起 */
  startedAt: number;
  progress: number;
  selectedStructureId: string | null;
  isolate: boolean;
  onlySystemId: string | null;
  focusRequest: { id: string; nonce: number } | null;
  resetNonce: number;
  onSelectStructure: (hit: StructureHit | null) => void;
  onHoverStructure?: (hit: StructureHit | null) => void;
  onReady?: (stats: FullBodyStats) => void;
  onProbe?: (probe: FullBodyProbe) => void;
}

function ModelRig({
  startedAt,
  progress,
  selectedStructureId,
  isolate,
  onlySystemId,
  focusRequest,
  resetNonce,
  onSelectStructure,
  onHoverStructure,
  onReady,
  onProbe,
}: ModelRigProps) {
  const gltf = useGLTF(FULL_BODY_MODEL_URL);
  // 克隆一份再改：GLTFLoader 的缓存场景是共享的，直接改会污染其它消费者
  const index = useMemo(() => buildModelIndex(gltf.scene.clone(true)), [gltf.scene]);

  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const controls = useThree((state) => state.controls) as OrbitLike | null;
  /** 画布尺寸（CSS 像素）：把模型坐标投影成屏幕坐标时要用到 */
  const size = useThree((state) => state.size);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);

  const onReadyRef = useRef(onReady);
  const onProbeRef = useRef(onProbe);
  const onSelectRef = useRef(onSelectStructure);
  const onHoverRef = useRef(onHoverStructure);
  useEffect(() => {
    onReadyRef.current = onReady;
    onProbeRef.current = onProbe;
    onSelectRef.current = onSelectStructure;
    onHoverRef.current = onHoverStructure;
  });

  const goalRef = useRef<FramingGoal | null>(null);
  const visibleCount = useRef(0);
  const shellOpacityValue = useRef(1);

  /* 装配完成：设定合理的 near/far 与初始机位（尺度由真实包围盒决定，不写死数值） */
  useEffect(() => {
    const size = index.bounds.getSize(new THREE.Vector3());
    const center = index.bounds.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    camera.near = maxDim / 1000;
    camera.far = maxDim * 200;
    camera.updateProjectionMatrix();
    camera.position.set(center.x, center.y + size.y * 0.04, center.z + maxDim * 1.7);
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
    goalRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  /* 位移 + 可见性 + 外壳淡化：三者一起重算，避免互相覆盖 */
  useLayoutEffect(() => {
    applyExplosion(index, clampProgress(progress));
    const isolateId = isolate ? selectedStructureId : null;
    shellOpacityValue.current = applyVisibility(index, isolateId, onlySystemId, progress);
    visibleCount.current = index.meshes.reduce((total, mesh) => total + (mesh.visible ? 1 : 0), 0);
  }, [index, progress, isolate, selectedStructureId, onlySystemId]);

  /* 高亮：选中 + 悬停 */
  useLayoutEffect(() => {
    applyHighlight(index, hoveredId, selectedStructureId);
  }, [index, hoveredId, selectedStructureId]);

  /* 聚焦：基于真实几何包围盒（位移后的），不使用任何元数据落点。
     依赖里同时含 id：点选换到另一个结构时，nonce 不变也必须重新取景。 */
  useEffect(() => {
    if (!focusRequest) return;
    const box = currentBox(index, focusRequest.id);
    if (!box) return;
    goalRef.current = framingGoal(index, camera, controls, 2.1, box);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.id, focusRequest?.nonce]);

  /* 拆解程度变化 / 复位：重新取景，保证拆开的整体始终在画面里 */
  useEffect(() => {
    if (focusRequest) return; // 已聚焦或隔离时不抢镜头
    goalRef.current = framingGoal(index, camera, controls, 1.75);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, progress, resetNonce]);

  /* 相机平滑逼近目标 */
  useFrame((_, delta) => {
    const goal = goalRef.current;
    if (!goal) return;
    const k = 1 - Math.pow(0.002, Math.min(delta, 0.1));
    camera.position.lerp(goal.position, k);
    if (controls) controls.target.lerp(goal.target, k);
    controls?.update();
    if (camera.position.distanceTo(goal.position) < 0.002 * Math.max(1, goal.position.length())) {
      camera.position.copy(goal.position);
      if (controls) {
        controls.target.copy(goal.target);
        controls.update();
      }
      goalRef.current = null;
      // 相机停稳后再上报一次：投影出来的屏幕坐标必须是停稳后的读数
      emitProbe.current();
    }
  });

  /* 就绪契约：装配完成后再等一个有效帧 */
  const frameCount = useRef(0);
  const ready = useRef(false);
  useFrame(() => {
    frameCount.current += 1;
    if (ready.current || frameCount.current < 2) return;
    ready.current = true;
    onReadyRef.current?.({ ...index.stats, loadMs: Math.round(performance.now() - startedAt) });
  });

  /* 真实读数上报：位移后各探查结构组的包围盒 + 屏幕坐标 + 镜头位置 + 可见网格数。
     状态一变就立即上报一次；相机停稳后由渲染循环再补一次（见 useFrame）。 */
  const emitProbe = useRef<() => void>(() => {});
  useEffect(() => {
    emitProbe.current = () => {
      const centers: Record<string, [number, number, number]> = {};
      const radii: Record<string, number> = {};
      const screen: Record<string, { x: number; y: number } | null> = {};
      for (const id of PROBE_IDS) {
        const box = currentBox(index, id);
        if (!box) {
          screen[id] = null;
          continue;
        }
        const center = box.getCenter(new THREE.Vector3());
        centers[id] = [center.x, center.y, center.z];
        radii[id] = box.getSize(new THREE.Vector3()).length() / 2;
        const projected = center.clone().project(camera);
        screen[id] =
          projected.z > 1
            ? null
            : {
                x: (projected.x * 0.5 + 0.5) * size.width,
                y: (-projected.y * 0.5 + 0.5) * size.height,
              };
      }
      const focusPoint = controls?.target ?? new THREE.Vector3();
      const largestGroups = [...index.groups]
        .sort((a, b) => b.radius - a.radius)
        .slice(0, 8)
        .map((group) => {
          const offset = index.currentOffsets.get(group.id) ?? ZERO_OFFSET;
          return {
            id: group.id,
            radius: group.radius,
            offsetMagnitude: Math.hypot(offset[0], offset[1], offset[2]),
            meshCount: index.groupMeshCount.get(group.id) ?? 0,
          };
        });
      onProbeRef.current?.({
        progress: clampProgress(progress),
        centers,
        radii,
        screen,
        camera: {
          position: [camera.position.x, camera.position.y, camera.position.z],
          distance: camera.position.distanceTo(focusPoint),
        },
        visibleMeshes: visibleCount.current,
        shellOpacity: shellOpacityValue.current,
        largestGroups,
      });
    };
    emitProbe.current();
    // 隔离 / 系统过滤 / 拆解程度都会改变「可见网格数」，必须一起作为依赖，
    // 否则探针会停留在上一次的读数（这正是复查时抓到的过期读数问题）。
  }, [index, progress, controls, camera, size, isolate, selectedStructureId, onlySystemId]);

  const hitOf = (object: THREE.Object3D): StructureHit | null =>
    buildStructureHit(object, index.parents, FOREGROUND_STRUCTURE_IDS);

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const hit = hitOf(event.object);
    if (!hit || hit.targetId === hoveredRef.current) return;
    hoveredRef.current = hit.targetId;
    setHoveredId(hit.targetId);
    onHoverRef.current?.(hit);
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    const hit = hitOf(event.object);
    if (!hit || hit.targetId !== hoveredRef.current) return;
    hoveredRef.current = null;
    setHoveredId(null);
    onHoverRef.current?.(null);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelectRef.current(hitOf(event.object));
  };

  return (
    <primitive
      object={index.model}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}

export function FullBodyStage({
  progress,
  selectedStructureId,
  onSelectStructure,
  onHoverStructure,
  focusNonce,
  resetNonce,
  isolate,
  onlySystemId = null,
  onReady,
  onProbe,
  onProgress,
  ariaLabel,
  canvasKey,
}: FullBodyStageProps) {
  /** 舞台挂载时刻：作为「从零开始加载」的计时起点，包含 30 MB GLB 的下载与解析 */
  const [startedAt] = useState(() => performance.now());

  const focusRequest = useMemo(
    () => (selectedStructureId ? { id: selectedStructureId, nonce: focusNonce } : null),
    [selectedStructureId, focusNonce],
  );

  return (
    <div className="bd-stage__canvas" aria-label={ariaLabel} role="group">
      <Canvas
        key={canvasKey}
        frameloop="always"
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 6], fov: 38, near: 0.05, far: 200 }}
        onPointerMissed={() => onSelectStructure(null)}
      >
        <ambientLight intensity={0.78} />
        <hemisphereLight args={['#fdfbf7', '#e8e4dc', 0.5]} />
        <directionalLight position={[4, 6, 5]} intensity={1.2} color="#fffaf0" />
        <directionalLight position={[-5, 2, -4]} intensity={0.4} color="#e9eef5" />

        <OrbitControls
          makeDefault
          enablePan
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.8}
          zoomSpeed={0.75}
        />

        <LoadProgressReporter onProgress={onProgress} />

        <Suspense fallback={null}>
          <ModelRig
            startedAt={startedAt}
            progress={progress}
            selectedStructureId={selectedStructureId}
            isolate={isolate}
            onlySystemId={onlySystemId}
            focusRequest={focusRequest}
            resetNonce={resetNonce}
            onSelectStructure={onSelectStructure}
            onHoverStructure={onHoverStructure}
            onReady={onReady}
            onProbe={onProbe}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
