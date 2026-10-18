import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import {
  FULL_BODY_MODEL_URL,
  PLANAR_UNIT_FALLBACK,
  PLANAR_UNIT_IDS,
  SHELL_FADE_END,
  SHELL_STRUCTURE_ID,
  STRUCTURE_TINT,
  buildParentMap,
  buildStructureHit,
  clampProgress,
  computePlanarLayout,
  isPublicDisplayExcluded,
  readableStructureName,
  resolveGroupMembers,
  shellOpacity,
  type LayoutGroup,
  type PlanarLayout,
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

/**
 * 点击判定阈值（像素）。
 *
 * three/R3F 在指针抬起时会派发 click，即使中途拖动了几百像素去旋转模型。
 * 没有这道阈值，「转动人体」会被当成「点到了体表」，用户一转模型就只剩皮肤。
 */
const CLICK_MOVE_SLOP = 6;

/**
 * 悬停：真实材质上的**中性暖白**自发光，保留原有彩绘，不出现「暗色剪影」，
 * 也不使用大面积深红色高亮（那会把解剖模型变成警示图）。
 */
const HOVER_EMISSIVE = new THREE.Color('#fff3e2');
const HOVER_INTENSITY = 0.2;
/** 选中：比悬停更亮的中性光，叠加「聚焦 + 其余结构淡化」，与悬停一眼可辨。
    强度刻意压得较低：过高会把器官本身的原色冲成粉白，反而丢失解剖辨识信息。 */
const SELECTED_EMISSIVE = new THREE.Color('#fff8ec');
const SELECTED_INTENSITY = 0.34;

/** 聚焦取景的留白系数：选中的结构约占画面一半，其余（已淡化的）人体留在画面里提供空间上下文 */
const FOCUS_PADDING = 2.8;

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
  /** 每个解剖系统经公开展示过滤后**真实可见**的网格数；为 0 的系统不能出现在筛选里 */
  systemMeshCount: Record<string, number>;
  /** 已验证器官的直接局部结构（仅结构数量合理的器官有值，用于详情页热点） */
  organParts: Record<string, { id: string; name: string }[]>;
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
  /** 镜头真实位置、观察目标与到焦点距离：用于判断取景是否随 progress 变化 */
  camera: {
    position: [number, number, number];
    /** OrbitControls 的观察目标：验收「取消选中后是否回到原视角」必须比对它 */
    target: [number, number, number];
    distance: number;
  };
  /** 当前全部可见网格数（外壳隐去与隔离生效的读数） */
  visibleMeshes: number;
  /** 外壳材质的实际不透明度（0 表示已隐去） */
  shellOpacity: number;
  /** 半径最大的若干可位移组：用于判断是否存在「超大组」导致整体飞出 */
  largestGroups: { id: string; radius: number; offsetMagnitude: number; meshCount: number }[];
  /** 平面展开的真实读数：单元数、二维范围、单元中心深度跨度（越小越接近同一平面） */
  planar: {
    unitCount: number;
    bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
    unitDepthSpread: number;
  };
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
  /**
   * 滚轮驱动拆解：**只有未选中任何结构时**才接管滚轮。
   * 选中结构后滚轮交还给 OrbitControls 做缩放，避免两种行为互相打架。
   */
  onExplodeWheel?: (direction: 1 | -1) => void;
  /**
   * 页面级隔离目标（器官页使用）：其余结构整体收起。
   * 为 null 时，选中结构只会让其余结构**淡化**，保留完整人体的空间上下文。
   */
  isolateStructureId?: string | null;
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
  /** 公开展示时应当隐去的网格（生殖系统 + 体表上的外生殖器区域） */
  excludedSet: Set<THREE.Mesh>;
  basePositions: Map<THREE.Mesh, THREE.Vector3>;
  baseBoxes: Map<THREE.Mesh, THREE.Box3>;
  /** 每组当前的位移向量（由 applyExplosion 写入） */
  currentOffsets: Map<string, [number, number, number]>;
  /** 最近一次平面布局结果（探针据此上报「是否真的排在同一平面上」） */
  currentLayout: PlanarLayout | null;
  /** 每组包含的网格数 */
  groupMeshCount: Map<string, number>;
  groups: LayoutGroup[];
  bounds: THREE.Box3;
  /** 整具人体包围盒的最大边（平面展开的间距基准） */
  bodyMaxDim: number;
  /** 每个解剖系统在当前过滤条件下**真实可见**的网格数（0 的系统不提供筛选入口） */
  systemMeshCount: Map<string, number>;
  /** 每个已验证器官的直接局部结构（id + 真实英文名），供详情页做热点列表 */
  organParts: Map<string, { id: string; name: string }[]>;
  /** 每个材质的高亮基准值，用于还原 */
  emissiveBase: Map<TintableMaterial, { color: THREE.Color; intensity: number }>;
  /** 每个材质的基准外观（不透明度 / 透明开关 / 写入深度），用于「淡化」与还原 */
  baseMaterialState: Map<
    TintableMaterial,
    { opacity: number; transparent: boolean; depthWrite: boolean }
  >;
  /** 淡化动画：目标不透明度（1 = 基准外观） */
  opacityTarget: Map<THREE.Mesh, number>;
  /** 淡化动画：当前不透明度（由渲染循环逐帧逼近目标） */
  opacityCurrent: Map<THREE.Mesh, number>;
  /** 尚未收敛、仍需逐帧推进的网格 */
  opacityDirty: Set<THREE.Mesh>;
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

/**
 * 结构组 → 平面展开的布局单元。
 *
 * 先沿解剖父链找已验证器官（心 / 肺 / 脑 / 脾 …）：找到就把整个器官作为一个单元，
 * 这样器官自身形状在展开后仍然完整；找不到则退回它所属的解剖系统。
 * 绝不按名字做模糊匹配。
 */
function resolveLayoutUnit(
  groupId: string,
  parents: Map<string, string>,
  system: string | null,
): string {
  let cursor: string | undefined = groupId;
  let guard = 0;
  while (cursor && guard < 64) {
    if (PLANAR_UNIT_IDS.includes(cursor)) return cursor;
    cursor = parents.get(cursor);
    guard += 1;
  }
  return system ?? PLANAR_UNIT_FALLBACK;
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

  /**
   * 体表中性化的边界（如实记录）：
   *
   * 试过把该区域顶点沿前后方向压平，实测会在骨盆处产生自相交破洞——比保留原状更糟，
   * 也违反「不得让身体局部凭空消失」。本工程不使用遮挡方块 / 球体补丁，
   * 因此**保留该处体表外壳原样**以保证轮廓连续，只隐去毛发几何；
   * 公开界面不提供生殖系统内容，这一限制已在「关于」页与交付文档中说明。
   */

  // 结构部分统一到暖调色板：让中央模型与暖白纸面属于同一套视觉语言（器官保留真实配色）
  for (const mesh of meshes) {
    const hex = STRUCTURE_TINT[meshSystem.get(mesh) ?? ''];
    if (!hex) continue;
    const tint = new THREE.Color(hex);
    for (const material of materialsOf(mesh)) {
      if (material.color) material.color.copy(tint);
    }
  }

  /**
   * 记录每个材质的基准外观。
   *
   * 「淡化」是在同一份克隆材质上改 opacity / transparent / depthWrite，
   * 因此必须先记下基准值，退出选中时才能逐项、精确地还原
   * （不是把所有材质粗暴设回 1，否则会抹掉资产原本的半透明部件）。
   */
  const baseMaterialState = new Map<
    TintableMaterial,
    { opacity: number; transparent: boolean; depthWrite: boolean }
  >();
  for (const mesh of meshes) {
    for (const material of materialsOf(mesh)) {
      if (baseMaterialState.has(material)) continue;
      baseMaterialState.set(material, {
        opacity: material.opacity ?? 1,
        transparent: Boolean(material.transparent),
        depthWrite: material.depthWrite !== false,
      });
    }
  }

  const parents = buildParentMap(model);

  const meshGroup = new Map<THREE.Mesh, string>();
  const groupMeshCount = new Map<string, number>();
  const basePositions = new Map<THREE.Mesh, THREE.Vector3>();
  const baseBoxes = new Map<THREE.Mesh, THREE.Box3>();
  const shellMeshes: THREE.Mesh[] = [];
  const excludedSet = new Set<THREE.Mesh>();
  const bounds = new THREE.Box3();
  const grouped = new Map<string, THREE.Box3>();
  const groupSystem = new Map<string, string | null>();

  for (const mesh of meshes) {
    basePositions.set(mesh, mesh.position.clone());
    const box = meshBoxInModelSpace(mesh, model);
    baseBoxes.set(mesh, box);
    bounds.union(box);
    if (belongsTo(mesh, parents, SHELL_STRUCTURE_ID)) shellMeshes.push(mesh);
    // 公开展示过滤：默认不出现生殖系统，以及体表上构成外生殖器的那块几何
    if (isPublicDisplayExcluded(meshSystem.get(mesh) ?? null, mesh.name)) excludedSet.add(mesh);
    const own = anatomyIdOf(mesh) ?? `__mesh_${meshes.indexOf(mesh)}`;
    const groupId = movableGroupOf(own, parents, hasGeometry);
    meshGroup.set(mesh, groupId);
    groupMeshCount.set(groupId, (groupMeshCount.get(groupId) ?? 0) + 1);
    if (!groupSystem.has(groupId)) groupSystem.set(groupId, meshSystem.get(mesh) ?? null);
    const existing = grouped.get(groupId);
    if (existing) existing.union(box);
    else grouped.set(groupId, box.clone());
  }

  const groups: LayoutGroup[] = [];
  for (const [id, box] of grouped) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const system = groupSystem.get(id) ?? null;
    const isShellGroup = id === SHELL_STRUCTURE_ID;
    groups.push({
      id,
      center: [center.x, center.y, center.z],
      size: [size.x, size.y, size.z],
      unit: resolveLayoutUnit(id, parents, system),
      system,
      shell: isShellGroup,
    });
  }

  /* 每个解剖系统「过滤后仍真实存在」的网格数：为 0 的系统不能提供筛选按钮 */
  const systemMeshCount = new Map<string, number>();
  for (const mesh of meshes) {
    if (excludedSet.has(mesh)) continue;
    const system = meshSystem.get(mesh);
    if (!system) continue;
    systemMeshCount.set(system, (systemMeshCount.get(system) ?? 0) + 1);
  }

  /**
   * 已验证器官的局部结构：只在「直接子结构数量少且可读」时才提供热点列表。
   * 端脑有 169 个直接子结构，摊成热点反而不可用——这一类返回空，
   * 详情页改为只讲器官整体的科普内容（不造假热点）。
   */
  const organParts = new Map<string, { id: string; name: string }[]>();
  for (const organId of PLANAR_UNIT_IDS) {
    const parts: { id: string; name: string }[] = [];
    for (const mesh of meshes) {
      if (excludedSet.has(mesh)) continue;
      const own = anatomyIdOf(mesh);
      if (!own || own === organId) continue;
      if (parents.get(own) !== organId) continue;
      if (parts.some((part) => part.id === own)) continue;
      const label = readableStructureName(mesh, own);
      parts.push({ id: own, name: label ?? own });
    }
    if (parts.length > 0 && parts.length <= 8) {
      parts.sort((a, b) => a.name.localeCompare(b.name));
      organParts.set(organId, parts);
    }
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

  const bodySize = bounds.getSize(new THREE.Vector3());
  const bodyMaxDim = Math.max(bodySize.x, bodySize.y, bodySize.z) || 1;

  return {
    model,
    meshes,
    parents,
    meshGroup,
    meshSystem,
    shellMeshes,
    shellSet: new Set(shellMeshes),
    excludedSet,
    basePositions,
    baseBoxes,
    currentOffsets: new Map(),
    currentLayout: null,
    groupMeshCount,
    groups,
    bounds,
    bodyMaxDim,
    systemMeshCount,
    organParts,
    emissiveBase: new Map(),
    baseMaterialState,
    opacityTarget: new Map(),
    opacityCurrent: new Map(),
    opacityDirty: new Set(),
    stats: {
      nodeCount,
      meshCount: meshes.length,
      triangleCount,
      uniqueAnatomyIds: ids.size,
      groupCounts,
      systemMeshCount: Object.fromEntries(systemMeshCount),
      organParts: Object.fromEntries(organParts),
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
function applyExplosion(index: ModelIndex, progress: number, onlySystemId: string | null): void {
  const layout = computePlanarLayout(index.groups, progress, index.bodyMaxDim, { onlySystemId });
  index.currentLayout = layout;
  const current = new Map<string, [number, number, number]>();
  for (const item of layout.offsets) current.set(item.id, item.offset);
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
 * 选中结构以外的一切都降到这个不透明度。
 *
 * 「淡化」而不是「隐藏」：保留完整人体的空间上下文，让用户知道选中的器官
 * 在身体里的什么位置。0.16 是在 0.12（纯幽灵）与 0.25（仍偏实）之间取的折中值，
 * 以实际截图判定为准。外壳比内部结构再低一档（见 applySceneLook），
 * 因为它体积最大、最容易糊住画面。
 */
const DIM_OPACITY = 0.16;
/** 外壳被淡化或渐隐时的不透明度上限：比内部结构更低，避免「幽灵皮肤」糊住画面 */
const SHELL_DIM_OPACITY = 0.1;
/** 不透明度高于这个值时，网格仍然可以接收点击 */
const RAYCAST_MIN_OPACITY = 0.3;

/**
 * 按基准值设置某个网格的不透明度。
 *
 * 三个必须同时处理的量：`opacity`（实际透明度）、`transparent`（是否进入透明队列）、
 * `depthWrite`（是否写深度）。淡化时关掉 depthWrite，否则半透明结构会互相遮挡出脏面。
 * `transparent` 只在**第一次**淡化时翻转一次并触发一次着色器重编译，
 * 之后不再反复触发——否则每次选中都会重编上百个材质。
 */
function setMeshOpacity(index: ModelIndex, mesh: THREE.Mesh, opacity: number): void {
  const opaque = opacity >= 0.999;
  for (const material of materialsOf(mesh)) {
    const base = index.baseMaterialState.get(material);
    if (!base) continue;
    const effective = opaque ? base.opacity : base.opacity * opacity;
    if (material.opacity !== effective) material.opacity = effective;
    if (!opaque && !material.transparent) {
      material.transparent = true;
      material.needsUpdate = true;
    }
    material.depthWrite = opaque ? base.depthWrite : false;
  }
}

/**
 * 场景外观总开关：位移后的可见性、淡化、外壳渐隐与射线可用性一次算清。
 *
 * - `isolateId`：页面级隔离（器官页把其余结构整体收起来）——保留隐藏语义；
 * - `selectedId`：用户点选——**只淡化**其余结构，不隐藏，保留空间上下文；
 * - 外壳不透明度由拆解进度驱动，被淡化时再取更低的一档；
 * - 凡是不透明度低到看不清的网格（含被隐去的壳体）都移出第 0 层，
 *   避免「看不见的几何继续挡住点击」。
 */
function applySceneLook(
  index: ModelIndex,
  isolateId: string | null,
  selectedId: string | null,
  onlySystemId: string | null,
  progress: number,
): { shellOpacity: number; visibleMeshes: number } {
  const isolateTargetsShell = isolateId === SHELL_STRUCTURE_ID;
  const shellFade = isolateTargetsShell ? 1 : shellOpacity(progress);
  const hideShell = !isolateTargetsShell && clampProgress(progress) >= SHELL_FADE_END;
  let visibleMeshes = 0;

  for (const mesh of index.meshes) {
    const isShell = index.shellSet.has(mesh);
    const hidden =
      index.excludedSet.has(mesh) ||
      (onlySystemId ? index.meshSystem.get(mesh) !== onlySystemId : false) ||
      (isolateId ? !belongsTo(mesh, index.parents, isolateId) : false) ||
      (hideShell && isShell);

    if (hidden) {
      mesh.visible = false;
      mesh.layers.disable(0);
      // 隐去的网格把当前不透明度记为 0：下次重新出现时从全透明淡入，而不是「啪」地出现
      index.opacityCurrent.set(mesh, 0);
      setMeshOpacity(index, mesh, 0);
      index.opacityDirty.delete(mesh);
      continue;
    }

    mesh.visible = true;
    visibleMeshes += 1;

    const dimmed = selectedId !== null && !belongsTo(mesh, index.parents, selectedId);
    let opacity = isShell ? shellFade : 1;
    if (dimmed) opacity = Math.min(opacity, isShell ? SHELL_DIM_OPACITY : DIM_OPACITY);

    /**
     * 这里只写「目标」，真正的过渡交给渲染循环逐帧逼近。
     * 于是「选中结构 → 其余淡化」是一段可见的淡出，而不是一帧内的突变。
     */
    index.opacityTarget.set(mesh, opacity);
    if (!index.opacityCurrent.has(mesh)) index.opacityCurrent.set(mesh, 0);
    index.opacityDirty.add(mesh);

    // 射线可用性按**目标**判定，避免过渡期间点击行为抖动
    const raycastable = opacity >= RAYCAST_MIN_OPACITY && (!dimmed || !isShell);
    if (raycastable) mesh.layers.enable(0);
    else mesh.layers.disable(0);
  }

  return { shellOpacity: shellFade, visibleMeshes };
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

type OrbitLike = {
  target: THREE.Vector3;
  update: () => void;
  enableDamping?: boolean;
  addEventListener?: (type: 'start' | 'end' | 'change', listener: () => void) => void;
  removeEventListener?: (type: 'start' | 'end' | 'change', listener: () => void) => void;
};

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
  /** 0 = 保持当前视角；1 = 完全正对屏幕（平面展开时用） */
  frontBias = 0,
): FramingGoal {
  const target = (box ?? explodedBounds(index)).clone();
  const size = target.getSize(new THREE.Vector3());
  const center = target.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const lookAt = controls?.target ?? center;
  const direction = camera.position.clone().sub(lookAt);
  if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1);
  direction.normalize();

  /**
   * 平面展开时镜头必须转到正面：否则二维排布会以透视斜角出现，
   * 「同一平面」的观感立刻消失。这里用插值而不是硬切，滚动过程中镜头是连续转过去的。
   */
  const bias = Math.min(1, Math.max(0, frontBias));
  if (bias > 0) {
    const front = new THREE.Vector3(0, 0.04, 1).normalize();
    direction.lerp(front, bias).normalize();
  }

  /**
   * 完全展开时按视锥精确适配：横竖两个方向都装得下，且不受结构大小差异影响。
   * 组装态沿用原来的「最大边 × padding」，保持既往观感。
   */
  let distance: number;
  if (bias > 0.05) {
    const fov = (camera.fov * Math.PI) / 180;
    const aspect = camera.aspect || 1;
    const distY = size.y / (2 * Math.tan(fov / 2));
    const distX = size.x / (2 * Math.tan(fov / 2) * Math.max(aspect, 1e-3));
    distance = Math.max(distY, distX, maxDim * 0.2) * padding;
  } else {
    distance = maxDim * padding;
  }

  return {
    position: center.clone().add(direction.multiplyScalar(distance)),
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
  /** 页面级隔离目标（器官页用）：其余结构整体收起；为 null 时只做淡化 */
  isolateStructureId: string | null;
  onlySystemId: string | null;
  focusRequest: { id: string; nonce: number } | null;
  resetNonce: number;
  onSelectStructure: (hit: StructureHit | null) => void;
  onHoverStructure?: (hit: StructureHit | null) => void;
  onReady?: (stats: FullBodyStats) => void;
  onProbe?: (probe: FullBodyProbe) => void;
  /** 判定这次「点击」是否其实是一次拖动（拖动旋转不应触发选中） */
  wasDrag: (clientX: number, clientY: number) => boolean;
}

function ModelRig({
  startedAt,
  progress,
  selectedStructureId,
  isolateStructureId,
  onlySystemId,
  focusRequest,
  resetNonce,
  onSelectStructure,
  onHoverStructure,
  onReady,
  onProbe,
  wasDrag,
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
  /** 选中前视角的快照：第一次聚焦前采集，取消选中时用来原路退回 */
  const viewSnapshot = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  /** 上一次的选中目标：用于识别「有选中 → 无选中」的跃迁 */
  const previousSelected = useRef<string | null>(null);
  const visibleCount = useRef(0);
  const shellOpacityValue = useRef(1);

  /**
   * 中断 OrbitControls 的阻尼惯性，并把相机的控制权交给程序化取景。
   *
   * 这是「镜头不会和手抢控制权」的关键：用户刚拖完，OrbitControls 内部还留着惯性，
   * `controls.update()` 每帧都会用惯性重新写回相机位置，把我们的平滑取景整段吃掉
   * （实测症状：点空白后镜头停在原地不动，而第二次点击又能恢复）。
   * 做法是把阻尼临时关掉跑一次 `update()`——three 在这个分支里会把惯性清零——再打开。
   */
  const stopCameraMomentum = () => {
    const orbit = controls;
    if (!orbit || orbit.enableDamping === false) return;
    orbit.enableDamping = false;
    orbit.update();
    orbit.enableDamping = true;
  };

  /** 统一入口：任何程序化取景都先中断惯性，然后写下目标机位 */
  const setCameraGoal = (goal: FramingGoal | null) => {
    stopCameraMomentum();
    goalRef.current = goal;
  };

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
    setCameraGoal(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  /* 位移 + 可见性 + 淡化 + 外壳渐隐：一次算清，避免互相覆盖 */
  useLayoutEffect(() => {
    applyExplosion(index, clampProgress(progress), onlySystemId);
    const look = applySceneLook(
      index,
      isolateStructureId,
      selectedStructureId,
      onlySystemId,
      progress,
    );
    shellOpacityValue.current = look.shellOpacity;
    visibleCount.current = look.visibleMeshes;
  }, [index, progress, isolateStructureId, selectedStructureId, onlySystemId]);

  /* 高亮：选中 + 悬停 */
  useLayoutEffect(() => {
    applyHighlight(index, hoveredId, selectedStructureId);
  }, [index, hoveredId, selectedStructureId]);

  /**
   * 聚焦：基于真实几何包围盒（位移后的），不使用任何元数据落点。
   * 依赖里同时含 id：点选换到另一个结构时，nonce 不变也必须重新取景。
   *
   * 第一次聚焦前会把**用户当前的相机位置与观察目标**压栈（快照），
   * 之后无论深入到第几级都不覆盖它——这样「取消选中」才能回到用户自己的视角，
   * 而不是回到某个写死的默认机位。
   */
  useEffect(() => {
    if (!focusRequest) return;
    const box = currentBox(index, focusRequest.id);
    if (!box) return;
    if (!viewSnapshot.current) {
      viewSnapshot.current = {
        position: camera.position.clone(),
        target: (controls?.target ?? index.bounds.getCenter(new THREE.Vector3())).clone(),
      };
    }
    /* 器官详解页（隔离单器官）取景更近：让该器官占据画面主体，与人体探索明显不同 */
    const padding = isolateStructureId ? 1.82 : FOCUS_PADDING;
    setCameraGoal(framingGoal(index, camera, controls, padding, box));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.id, focusRequest?.nonce]);

  /**
   * 恢复选中前的视角：由**舞台自己**识别「有选中 → 无选中」这一次状态跃迁。
   *
   * 最初的做法是由外层递增一个 `restoreNonce` 来通知，结果因为跨组件的更新顺序
   * 不可靠（第一次点空白时快照还没轮到被消费），出现「点空白镜头不动、点第二次才回来」
   * 的怪现象。改成本地跃迁判断后，点空白、Esc、逐级返回三种出口都走同一条路径。
   */
  useEffect(() => {
    const previous = previousSelected.current;
    previousSelected.current = selectedStructureId;
    if (!previous || selectedStructureId) return;
    const snapshot = viewSnapshot.current;
    viewSnapshot.current = null;
    if (!snapshot) return;
    setCameraGoal({
      position: snapshot.position.clone(),
      target: snapshot.target.clone(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStructureId]);

  /* 拆解程度变化 / 复位：重新取景，保证展开后的平面阵列始终完整在画面里 */
  useEffect(() => {
    if (focusRequest) return; // 已聚焦或隔离时不抢镜头
    const t = clampProgress(progress);
    const eased = t * t * (3 - 2 * t);
    /* 前 15% 保持原视角，之后镜头连续转到正面；不是硬切 */
    const bias = Math.min(1, Math.max(0, (eased - 0.15) / 0.55));
    setCameraGoal(
      framingGoal(index, camera, controls, bias > 0.05 ? 1.04 : 1.75, undefined, bias),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, progress, resetNonce]);

  /* 相机平滑逼近目标 */
  useFrame((_, delta) => {
    const goal = goalRef.current;
    if (!goal) return;
    /**
     * 收敛速度按时间步计算，并对 delta 设一个较宽松的上限（0.4s）。
     * 上限太小会在低帧率设备上把动画拖成好几秒——软件渲染的验收环境实测就是这样
     * （每秒 1–3 帧时，取景要 5 秒以上才到位）；放大到 0.4s 后，低帧率下也能在 1–2 帧内到位。
     */
    const k = 1 - Math.pow(0.002, Math.min(delta, 0.4));
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

  /* 淡化动画：把当前不透明度逐帧逼近目标 */
  useFrame((_, delta) => {
    if (index.opacityDirty.size === 0) return;
    // 时间常数约 70ms：60fps 下约 0.2s 收敛；低帧率下也不会拖成好几秒
    const k = 1 - Math.exp(-Math.min(delta, 0.4) / 0.07);
    for (const mesh of index.opacityDirty) {
      const target = index.opacityTarget.get(mesh) ?? 1;
      const current = index.opacityCurrent.get(mesh) ?? 0;
      const next = Math.abs(target - current) < 0.005 ? target : current + (target - current) * k;
      index.opacityCurrent.set(mesh, next);
      setMeshOpacity(index, mesh, next);
      if (next === target) index.opacityDirty.delete(mesh);
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
        .filter((group) => !group.shell)
        .sort(
          (a, b) =>
            Math.max(b.size[0], b.size[1], b.size[2]) - Math.max(a.size[0], a.size[1], a.size[2]),
        )
        .slice(0, 8)
        .map((group) => {
          const offset = index.currentOffsets.get(group.id) ?? ZERO_OFFSET;
          return {
            id: group.id,
            radius: Math.max(group.size[0], group.size[1], group.size[2]) / 2,
            offsetMagnitude: Math.hypot(offset[0], offset[1], offset[2]),
            meshCount: index.groupMeshCount.get(group.id) ?? 0,
          };
        });
      onProbeRef.current?.({
        progress: clampProgress(progress),
        centers,
        radii,
        screen,
        planar: {
          unitCount: index.currentLayout?.unitCount ?? 0,
          bounds: index.currentLayout?.bounds ?? null,
          unitDepthSpread: index.currentLayout?.unitDepthSpread ?? 0,
        },
        camera: {
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [focusPoint.x, focusPoint.y, focusPoint.z],
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
  }, [index, progress, controls, camera, size, isolateStructureId, selectedStructureId, onlySystemId]);

  /**
   * 与 OrbitControls 的协作（这是「手动拖动」与「自动取景」之间的握手）。
   *
   * - `start`：用户一开始拖动就放弃当前的自动取景目标，避免镜头和手互相抢控制权；
   * - `end`：交互结束后补报一次真实读数——否则验收侧读到的相机位置会停在拖动前
   *   （实测踩到：横向拖动明明转了模型，读数却一动不动）。
   */
  useEffect(() => {
    if (!controls?.addEventListener) return undefined;
    const handleStart = () => {
      goalRef.current = null;
    };
    const handleEnd = () => emitProbe.current();
    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);
    return () => {
      controls.removeEventListener?.('start', handleStart);
      controls.removeEventListener?.('end', handleEnd);
    };
  }, [controls]);

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
    // 拖动旋转模型时，指针抬起仍会派发 click；这里按位移阈值把它排除掉
    if (wasDrag(event.nativeEvent.clientX, event.nativeEvent.clientY)) return;
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
  onExplodeWheel,
  isolateStructureId = null,
  onlySystemId = null,
  onReady,
  onProbe,
  onProgress,
  ariaLabel,
  canvasKey,
}: FullBodyStageProps) {
  /** 舞台挂载时刻：作为「从零开始加载」的计时起点，包含 31.8 MB GLB 的下载与解析 */
  const [startedAt] = useState(() => performance.now());

  /**
   * 指针按下的位置：用来区分「点击选中」与「拖动旋转」。
   * 没有这道判断时，转动人体也会顺手选中体表——用户会看到「转一下模型就只剩皮肤」。
   *
   * 监听直接挂在真实的 canvas 元素上（而不是走 R3F 的 Canvas props）：
   * 只有拿到原生事件，才能保证按下位置一定被记录，指针拖出画布时也不会丢。
   */
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasEl) return undefined;
    const rememberStart = (event: PointerEvent) => {
      pointerStart.current = { x: event.clientX, y: event.clientY };
    };
    canvasEl.addEventListener('pointerdown', rememberStart, { capture: true });
    return () => canvasEl.removeEventListener('pointerdown', rememberStart, { capture: true });
  }, [canvasEl]);

  const wasDrag = (clientX: number, clientY: number): boolean => {
    /**
     * 注意：这里**不能**清空 pointerStart。
     *
     * 同一次拖动会派发不止一次点击判定（实测一次拖动会走两次判定），
     * 若第一次判定就把按下位置消费掉，第二次就会把这次拖动误判成点击——
     * 于是「转一下模型」又变成了「选中体表」。按下位置只在下一次 pointerdown 时被覆盖。
     */
    const start = pointerStart.current;
    return start !== null && Math.hypot(clientX - start.x, clientY - start.y) > CLICK_MOVE_SLOP;
  };

  const focusRequest = useMemo(
    () => (selectedStructureId ? { id: selectedStructureId, nonce: focusNonce } : null),
    [selectedStructureId, focusNonce],
  );

  /**
   * 滚轮仲裁。
   *
   * 没有选中任何结构时（人体总览）：滚轮 = 拆解/组装，缩放开在此关闭，
   * 并在 canvas 的**捕获阶段**拦下 wheel，避免它同时被 OrbitControls 当作缩放。
   * 选中结构之后：滚轮交还给 OrbitControls（`enableZoom` 重新打开）用于观察当前结构。
   * 监听只挂在三维画布上，右侧知识纸条的滚动完全不受影响。
   */
  const explodeWheelEnabled = Boolean(onExplodeWheel) && !selectedStructureId;
  const explodeWheelRef = useRef(onExplodeWheel);
  useEffect(() => {
    explodeWheelRef.current = onExplodeWheel;
  });
  useEffect(() => {
    if (!canvasEl || !explodeWheelEnabled) return undefined;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      explodeWheelRef.current?.(event.deltaY > 0 ? 1 : -1);
    };
    canvasEl.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => canvasEl.removeEventListener('wheel', handleWheel, { capture: true });
  }, [canvasEl, explodeWheelEnabled]);

  return (
    <div className="bd-stage__canvas" aria-label={ariaLabel} role="group">
      <Canvas
        key={canvasKey}
        frameloop="always"
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 6], fov: 38, near: 0.05, far: 200 }}
        onCreated={(state) => setCanvasEl(state.gl.domElement)}
        onPointerMissed={(event) => {
          // 在空白处的拖动同样不算「点空白取消」
          if (wasDrag(event.clientX, event.clientY)) return;
          onSelectStructure(null);
        }}
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
          /* 未选中结构时滚轮用来拆解人体，因此这里关掉原生缩放；选中后交还给缩放 */
          enableZoom={!explodeWheelEnabled}
        />

        <LoadProgressReporter onProgress={onProgress} />

        <Suspense fallback={null}>
          <ModelRig
            startedAt={startedAt}
            progress={progress}
            selectedStructureId={selectedStructureId}
            isolateStructureId={isolateStructureId}
            onlySystemId={onlySystemId}
            focusRequest={focusRequest}
            resetNonce={resetNonce}
            onSelectStructure={onSelectStructure}
            onHoverStructure={onHoverStructure}
            onReady={onReady}
            onProbe={onProbe}
            wasDrag={wasDrag}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
