import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  FULL_BODY_MODEL_URL,
  buildParentMap,
  clampProgress,
  computeBodyAxis,
  computeExplosionOffsets,
  explosionMaxRadius,
  resolveGroupMembers,
  type ExplosionGroup,
} from './fullBody';

/**
 * 整具人体拆解舞台（V2 技术验证 C1）。
 *
 * 与 `AtlasStage`（Vanatome 封装）不同，这里直接用自己的 Canvas 承载 atlas 自带的
 * 「curated-full-body」整具人体 GLB，因此可以拿到真实网格对象并**逐组位移**。
 *
 * 位移永远是「按 progress 重新计算并覆盖 position」，从不累加；
 * 结构归属完全读 glTF 的 `extras`（three 会写进 `Object3D.userData`），不猜 ID。
 */

/** 用于取证的器官分组：heart / cerebrum / cerebellum / brainstem 是无几何的分组节点，spleen 自身即节点。 */
const PROBE_IDS = ['heart', 'cerebrum', 'cerebellum', 'brainstem', 'spleen'] as const;

const ZERO_OFFSET: [number, number, number] = [0, 0, 0];

/** 悬停高亮材质：共享一份，避免逐网格克隆材质。 */
const HOVER_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#c0392b',
  transparent: true,
  opacity: 0.92,
});
/** 选中材质：与悬停区分，保证「已选中」和「正经过」一眼可辨。 */
const SELECTED_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#111111',
  transparent: true,
  opacity: 0.92,
});

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
  /** 镜头真实位置与到焦点距离：用于判断取景是否随 progress 变化 */
  camera: { position: [number, number, number]; distance: number };
  /** 半径最大的若干可位移组：用于判断是否存在「超大组」导致整体飞出 */
  largestGroups: { id: string; radius: number; offsetMagnitude: number; meshCount: number }[];
}

export interface FullBodyStageProps {
  /** 拆解进度，受控，钳制在 [0,1] */
  progress: number;
  selectedStructureId: string | null;
  onSelectStructure: (id: string | null) => void;
  onHoverStructure?: (id: string | null) => void;
  /** 递增即把镜头聚焦到选中结构（基于真实几何包围盒） */
  focusNonce: number;
  /** 递增即把镜头复位到初始机位 */
  resetNonce: number;
  /** 隔离：只显示选中结构 */
  isolate: boolean;
  /** 装配完成 + 首个有效帧后触发一次 */
  onReady?: (stats: FullBodyStats) => void;
  /** 每次位移重算后上报真实包围盒读数（用于数值验收） */
  onProbe?: (probe: FullBodyProbe) => void;
  ariaLabel?: string;
  canvasKey?: string;
}

/** 舞台内部预先算好的模型索引：结构组、基座位置、基座包围盒、统计数字。 */
interface ModelIndex {
  model: THREE.Object3D;
  meshes: THREE.Mesh[];
  parents: Map<string, string>;
  /** mesh → 它所属的可位移组 id */
  meshGroup: Map<THREE.Mesh, string>;
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
  /** 高亮材质替换时记录的原始材质，用于还原 */
  baseMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
  highlighted: THREE.Mesh[];
  stats: Omit<FullBodyStats, 'loadMs'>;
}

function anatomyIdOf(object: THREE.Object3D): string | null {
  const id = object.userData?.anatomyId;
  return typeof id === 'string' && id.length > 0 ? id : null;
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

function buildModelIndex(model: THREE.Object3D): ModelIndex {
  const meshes: THREE.Mesh[] = [];
  const ids = new Set<string>();
  const hasGeometry = new Set<string>();
  let nodeCount = 0;

  model.traverse((object) => {
    // 根节点不算「模型节点」：atlas 的 nodeCount 指的是模型自身的 984 个节点
    if (object === model) return;
    nodeCount += 1;
    const id = anatomyIdOf(object);
    if (id) ids.add(id);
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;
      meshes.push(mesh);
      if (id) hasGeometry.add(id);
    }
  });

  const parents = buildParentMap(model);

  const meshGroup = new Map<THREE.Mesh, string>();
  const groupMeshCount = new Map<string, number>();
  const basePositions = new Map<THREE.Mesh, THREE.Vector3>();
  const baseBoxes = new Map<THREE.Mesh, THREE.Box3>();
  const bounds = new THREE.Box3();
  const grouped = new Map<string, THREE.Box3>();

  for (const mesh of meshes) {
    basePositions.set(mesh, mesh.position.clone());
    const box = meshBoxInModelSpace(mesh, model);
    baseBoxes.set(mesh, box);
    bounds.union(box);
    const own = anatomyIdOf(mesh) ?? `__mesh_${meshes.indexOf(mesh)}`;
    const groupId = movableGroupOf(own, parents, hasGeometry);
    meshGroup.set(mesh, groupId);
    groupMeshCount.set(groupId, (groupMeshCount.get(groupId) ?? 0) + 1);
    const existing = grouped.get(groupId);
    if (existing) existing.union(box);
    else grouped.set(groupId, box.clone());
  }

  const groups: ExplosionGroup[] = [];
  for (const [id, box] of grouped) {
    const center = box.getCenter(new THREE.Vector3());
    groups.push({
      id,
      center: [center.x, center.y, center.z],
      radius: box.getSize(new THREE.Vector3()).length() / 2,
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

  return {
    model,
    meshes,
    parents,
    meshGroup,
    groupMeshCount,
    basePositions,
    baseBoxes,
    currentOffsets: new Map(),
    groups,
    bounds,
    axis: computeBodyAxis(bounds),
    maxRadius: explosionMaxRadius(bounds),
    baseMaterials: new Map(),
    highlighted: [],
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

/** 按 progress 重算并覆盖每个 mesh 的位移（不累加）。 */
function applyExplosion(index: ModelIndex, progress: number): void {
  const offsets = computeExplosionOffsets(index.groups, index.axis, progress, index.maxRadius);
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

/** 把位移后的 mesh 基座包围盒并起来，得到某结构组当前的包围盒。 */
function currentBox(index: ModelIndex, id: string): THREE.Box3 | null {
  const box = new THREE.Box3();
  let found = false;
  for (const mesh of index.meshes) {
    if (!belongsTo(mesh, index.parents, id)) continue;
    const base = index.baseBoxes.get(mesh);
    if (!base) continue;
    const offset = index.currentOffsets.get(index.meshGroup.get(mesh) ?? '') ?? ZERO_OFFSET;
    box.union(
      base.clone().translate(new THREE.Vector3(offset[0], offset[1], offset[2])),
    );
    found = true;
  }
  return found ? box : null;
}

function applyHighlight(index: ModelIndex, hoveredId: string | null, selectedId: string | null): void {
  const restore = (mesh: THREE.Mesh) => {
    const base = index.baseMaterials.get(mesh);
    if (base) mesh.material = base;
  };
  for (const mesh of index.highlighted) restore(mesh);
  index.highlighted = [];

  const paint = (id: string, material: THREE.Material) => {
    for (const mesh of index.meshes) {
      if (Array.isArray(mesh.material)) continue; // 多材质网格保持原样，不做材质替换
      if (!belongsTo(mesh, index.parents, id)) continue;
      if (!index.baseMaterials.has(mesh)) index.baseMaterials.set(mesh, mesh.material);
      mesh.material = material;
      index.highlighted.push(mesh);
    }
  };

  if (selectedId) paint(selectedId, SELECTED_MATERIAL);
  if (hoveredId && hoveredId !== selectedId) paint(hoveredId, HOVER_MATERIAL);
}

function applyIsolation(index: ModelIndex, isolateId: string | null): void {
  if (!isolateId) {
    for (const mesh of index.meshes) mesh.visible = true;
    return;
  }
  const members = index.meshes.filter((mesh) => belongsTo(mesh, index.parents, isolateId));
  if (members.length === 0) {
    // 该结构在模型里没有可显示网格：不做隔离，避免出现全黑画面
    for (const mesh of index.meshes) mesh.visible = true;
    return;
  }
  const visible = new Set(members);
  for (const mesh of index.meshes) mesh.visible = visible.has(mesh);
}

type OrbitLike = { target: THREE.Vector3; update: () => void };

interface ModelRigProps {
  /** 舞台挂载时刻：就绪耗时必须从「文件还没开始下载」算起，而不是从模型解析完算起 */
  startedAt: number;
  progress: number;
  selectedStructureId: string | null;
  isolate: boolean;
  focusRequest: { id: string; nonce: number } | null;
  resetNonce: number;
  onSelectStructure: (id: string | null) => void;
  onHoverStructure?: (id: string | null) => void;
  onReady?: (stats: FullBodyStats) => void;
  onProbe?: (probe: FullBodyProbe) => void;
}

function ModelRig({
  startedAt,
  progress,
  selectedStructureId,
  isolate,
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

  const defaultsRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const goalRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  /* 模型就绪：设定合理的 near/far 与初始机位（尺度由真实包围盒决定，不写死数值） */
  useEffect(() => {
    const size = index.bounds.getSize(new THREE.Vector3());
    const center = index.bounds.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    camera.near = maxDim / 1000;
    camera.far = maxDim * 200;
    camera.updateProjectionMatrix();
    const distance = maxDim * 1.7;
    const position = new THREE.Vector3(center.x, center.y + size.y * 0.04, center.z + distance);
    camera.position.copy(position);
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
    defaultsRef.current = { position: position.clone(), target: center.clone() };
  }, [index, camera, controls]);

  /* 位移：每次 progress 变化都重算覆盖，绝不累加 */
  useLayoutEffect(() => {
    applyExplosion(index, clampProgress(progress));
  }, [index, progress]);

  /* 高亮：选中 + 悬停 */
  useLayoutEffect(() => {
    applyHighlight(index, hoveredId, selectedStructureId);
  }, [index, hoveredId, selectedStructureId]);

  /* 隔离 */
  useLayoutEffect(() => {
    applyIsolation(index, isolate ? selectedStructureId : null);
  }, [index, isolate, selectedStructureId]);

  /* 聚焦：基于真实几何包围盒（位移后的），不使用任何元数据落点 */
  useEffect(() => {
    if (!focusRequest || !defaultsRef.current) return;
    const box = currentBox(index, focusRequest.id) ?? index.bounds;
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const direction = camera.position.clone().sub(center);
    if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1);
    direction.normalize();
    const distance = Math.max(radius * 3.2, index.bounds.getSize(new THREE.Vector3()).length() * 0.18);
    goalRef.current = { position: center.clone().add(direction.multiplyScalar(distance)), target: center };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce]);

  /* 复位：回到初始机位 */
  useEffect(() => {
    if (resetNonce <= 0 || !defaultsRef.current) return;
    goalRef.current = {
      position: defaultsRef.current.position.clone(),
      target: defaultsRef.current.target.clone(),
    };
  }, [resetNonce]);

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

  /* 真实读数上报：位移后各探查结构组的包围盒中心/半径 + 镜头位置 + 最大组 */
  useEffect(() => {
    const centers: Record<string, [number, number, number]> = {};
    const radii: Record<string, number> = {};
    for (const id of PROBE_IDS) {
      const box = currentBox(index, id);
      if (!box) continue;
      const center = box.getCenter(new THREE.Vector3());
      centers[id] = [center.x, center.y, center.z];
      radii[id] = box.getSize(new THREE.Vector3()).length() / 2;
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
      camera: {
        position: [camera.position.x, camera.position.y, camera.position.z],
        distance: camera.position.distanceTo(focusPoint),
      },
      largestGroups,
    });
  }, [index, progress, controls, camera]);

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const id = anatomyIdOf(event.object);
    if (!id || id === hoveredRef.current) return;
    hoveredRef.current = id;
    setHoveredId(id);
    onHoverRef.current?.(id);
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    const id = anatomyIdOf(event.object);
    if (!id || id !== hoveredRef.current) return;
    hoveredRef.current = null;
    setHoveredId(null);
    onHoverRef.current?.(null);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelectRef.current(anatomyIdOf(event.object));
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
  onReady,
  onProbe,
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

        <Suspense fallback={null}>
          <ModelRig
            startedAt={startedAt}
            progress={progress}
            selectedStructureId={selectedStructureId}
            isolate={isolate}
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
