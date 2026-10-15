import * as THREE from 'three';
import { ATLAS_STRUCTURE_IDS, type StructureHit } from '../services/atlas';
import { FULL_BODY_MODEL_URL } from '../services/anatomyModel';

/**
 * 整具人体拆解舞台的纯计算内核。
 *
 * 这里只做与渲染无关的事：把 glTF 场景图读成「结构组」、按真实几何算拆解位移、
 * 以及给出整具人体模型的地址。所有函数都是**确定性**的——同样的输入必然得到同样的输出；
 * 位移量永远由 progress 重新计算而非累加，这是「反复拆解 0→1→0→1 不产生累计偏移」的前提。
 */

export { FULL_BODY_MODEL_URL };

/* ---------------- 拆解位移的定标常量 ---------------- */

/** 位移距离 = 该组包围球半径 × 强度 × 缓动进度。 */
export const EXPLOSION_SPREAD = 1.15;
/** 位移方向里保留的向上分量：避免只做水平扇形散开，保持整体轮廓的可读性。 */
export const EXPLOSION_UP_BIAS = 0.32;
/** 包围球半径下限，避免极小组件的位移距离退化为 0。 */
export const EXPLOSION_MIN_RADIUS = 0.06;
/**
 * 单组位移距离的半径上限系数（相对整具人体的包围球半径）。
 *
 * 这是实机验证发现的问题的护栏：`body-shell`（236 个网格）这类**整体外壳**的包围球
 * 半径几乎等于整具人体，若不设上限，它会带着位移量把人体推出画面（实测 1.09 单位，
 * 相机距离只有 2.96）。设上限后「越大越不动」，外层轮廓得以保留。
 */
export const EXPLOSION_MAX_RADIUS_RATIO = 0.25;

/**
 * 按解剖系统分层的径向位移：同一系统的结构组移动到同一个「层」。
 *
 * 这不是装饰性的随机散开，而是一次**有解剖含义的逐层剥离**：
 * 从体表（皮肤）→ 肌肉 → 骨骼 → 内脏/管道 → 深部调节系统，
 * 越靠内的系统在完全拆解时被推得越远，因此内层不再被外层挡住。
 * 未登记的系统（理论上不存在）默认落在第 0 层，只做自身尺寸定标的位移。
 */
export const EXPLOSION_SYSTEM_LAYER: Record<string, number> = {
  'regional-anatomy': 0,
  muscular: 1,
  skeletal: 2,
  cardiovascular: 3,
  lymphatic: 3,
  respiratory: 3,
  digestive: 3,
  urinary: 3,
  nervous: 4,
  endocrine: 4,
  reproductive: 4,
};

/** 每一层额外增加的径向距离 = 人体包围球半径 × 该比例。 */
export const EXPLOSION_LAYER_STEP_RATIO = 0.17;

/** 体表外壳的结构 ID：拆解时它不承担「被推开」的角色，而是随进度渐进隐去。 */
export const SHELL_STRUCTURE_ID = ATLAS_STRUCTURE_IDS.bodyShell;

/**
 * 结构部分的统一色板（按解剖系统）。
 *
 * 原始资产里「体表 / 骨骼 / 肌肉」默认使用同一组偏冷的青色，放在暖白纸面上会明显跳色；
 * 这里把它们统一到暖调（象牙 ↔ 陶土），让中央的模型与纸面属于同一套视觉语言。
 * 内脏、管道、神经等**保留资产自带的真实解剖配色**——那些颜色本身就承担了辨识功能。
 *
 * 这是一次显式的外观修改（属于 CC BY-SA 4.0 要求「标明修改」的部分），
 * 「关于 · 数据与方法」页已如实说明。
 */
export const STRUCTURE_TINT: Record<string, string> = {
  'regional-anatomy': '#dcc7b6',
  skeletal: '#d9c6ae',
  muscular: '#c39a84',
};

/** 外壳完全隐去所需的进度：`body-shell` 在 [0, 0.4] 内由不透明变为隐去。 */
export const SHELL_FADE_END = 0.4;

/** 拆解进度钳制到 [0, 1]；非法输入（NaN / Infinity）按 0 处理，不抛错。 */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * 外壳的实时不透明度。
 *
 * 拆解开始时需要先「去掉皮肤」才能看到内部——否则位移再大也会被最外层挡住。
 * 这条曲线是单调递减的平滑过渡，progress = 0 时恒为 1（完全组装态外观不变）。
 * 回归计算：smoothstep 保证两端变化率为 0，拖动进度条时不会出现突变。
 */
export function shellOpacity(progress: number): number {
  const t = clampProgress(progress);
  if (t >= SHELL_FADE_END) return 0;
  const u = t / SHELL_FADE_END;
  const eased = u * u * (3 - 2 * u);
  return 1 - eased;
}

/**
 * 人体纵轴的中轴点（只取水平分量）。
 * 径向位移方向 = 从这条中轴指向结构组中心，因此不使用随机向量。
 */
export function computeBodyAxis(box: THREE.Box3): [number, number, number] {
  const center = box.getCenter(new THREE.Vector3());
  return [center.x, 0, center.z];
}

/**
 * 结构父子关系表：`anatomyId → anatomyParentId`。
 *
 * 依据 glTF 的 `extras`（three 的 GLTFLoader 会写进 `Object3D.userData`）。
 * 真实 GLB 的 `scenes[0].nodes` 是平铺的，所以解剖层级只能从这个表读，不能靠场景图父子链。
 */
export function buildParentMap(root: THREE.Object3D): Map<string, string> {
  const map = new Map<string, string>();
  root.traverse((object) => {
    const id = object.userData?.anatomyId;
    const parentId = object.userData?.anatomyParentId;
    if (typeof id === 'string' && id.length > 0 && typeof parentId === 'string' && parentId.length > 0) {
      map.set(id, parentId);
    }
  });
  return map;
}

/**
 * 取某个分组结构的**后代**集合（不含该分组节点自身）。
 *
 * `heart` / `cerebrum` / `cerebellum` 这类节点本身没有几何，几何挂在后代上；
 * 向上回溯沿 `anatomyParentId` 链进行，直到命中 groupId。回溯深度有上限，避免脏数据成环。
 */
export function resolveGroupMembers(
  root: THREE.Object3D,
  groupId: string,
  parentMap?: Map<string, string>,
): THREE.Object3D[] {
  const parents = parentMap ?? buildParentMap(root);
  const members: THREE.Object3D[] = [];
  root.traverse((object) => {
    const id = object.userData?.anatomyId;
    if (typeof id !== 'string' || id.length === 0) return;
    let cursor = parents.get(id);
    let guard = 0;
    while (cursor && guard < 64) {
      if (cursor === groupId) {
        members.push(object);
        return;
      }
      cursor = parents.get(cursor);
      guard += 1;
    }
  });
  return members;
}

/**
 * 从某个结构沿解剖父链向上找**最近的已登记器官结构**。
 *
 * 用于把「点到大楼里的某个房间」归并成「点到了大楼」：例如点到端脑下的某个脑区，
 * 归并目标仍是 `cerebrum`，界面据此高亮整块端脑。命中不到时返回 null，不做任何猜测。
 */
export function resolveOrganStructure(
  structureId: string,
  parents: Map<string, string>,
  known: readonly string[],
): string | null {
  if (known.includes(structureId)) return structureId;
  let cursor = parents.get(structureId);
  let guard = 0;
  while (cursor && guard < 64) {
    if (known.includes(cursor)) return cursor;
    cursor = parents.get(cursor);
    guard += 1;
  }
  return null;
}

/** 由整具人体包围盒推出「单组位移半径」的上限。 */
export function explosionMaxRadius(bounds: THREE.Box3): number {
  return (bounds.getSize(new THREE.Vector3()).length() / 2) * EXPLOSION_MAX_RADIUS_RATIO;
}

/**
 * 从节点名里取出**可展示的真实解剖英文名**。
 *
 * 真实 GLB 的节点名形如 `<结构ID>__<英文名>`（例：`cerebrum__Cerebrum`）。
 * 取不到可读名时返回 null，界面改为只显示系统或「未命名结构」，
 * 绝不把内部小写 ID 当作结构名展示。
 */
export function readableStructureName(object: THREE.Object3D, structureId: string): string | null {
  const raw = typeof object.name === 'string' ? object.name : '';
  const separator = raw.indexOf('__');
  const part = (separator >= 0 ? raw.slice(separator + 2) : raw).trim();
  if (!part || part === structureId) return null;
  // 全小写的名字实际上就是内部 ID，不作为解剖名展示
  if (!/[A-Z]/.test(part)) return null;
  return part;
}

/**
 * 把一次真实点选归一成面板可消费的 `StructureHit`。
 *
 * 全部数据都来自该网格自己的 `userData` 与解剖父链，不做任何猜测：
 * - 命中已登记结构（含体表外壳）→ 高亮/隔离/聚焦整块结构；
 * - 未命中 → 保留它自己的真实 ID 与真实英文名，界面据实说明暂无科普卡片。
 */
export function buildStructureHit(
  object: THREE.Object3D,
  parents: Map<string, string>,
  known: readonly string[],
): StructureHit | null {
  const structureId = object.userData?.anatomyId;
  if (typeof structureId !== 'string' || structureId.length === 0) return null;
  const knownStructureId = resolveOrganStructure(structureId, parents, known);
  const systemId = object.userData?.anatomySystem;
  return {
    targetId: knownStructureId ?? structureId,
    structureId,
    knownStructureId,
    name: readableStructureName(object, structureId),
    systemId: typeof systemId === 'string' && systemId.length > 0 ? systemId : null,
  };
}

/** 一个可位移的结构组：真实几何中心 + 自身尺寸 + 所属解剖层。 */
export interface ExplosionGroup {
  id: string;
  /** 该组网格在模型坐标系下的包围盒中心 */
  center: [number, number, number];
  /** 该组网格包围盒半径（半对角线），作为位移距离的尺度 */
  radius: number;
  /** 所属解剖层（见 `EXPLOSION_SYSTEM_LAYER`）；缺省为 0 */
  layer?: number;
}

/** 某个结构组在给定进度下的位移向量（模型坐标系）。 */
export interface ExplosionOffset {
  id: string;
  offset: [number, number, number];
}

/**
 * 按进度计算每个结构组的位移向量。
 *
 * 纯函数：位移只由 `progress` 与组的真实几何、解剖层决定，不读取也不写入任何累计状态。
 * 因此 progress = 0 时位移恒为 0，且同一 progress 反复调用结果完全相同。
 *
 * @param maxRadius  单组「按自身尺寸定标」的距离上限（护栏，防止超大组把人体推出画面）
 * @param bodyRadius 整具人体的包围球半径，用于把解剖层换算成真实距离
 */
export function computeExplosionOffsets(
  groups: readonly ExplosionGroup[],
  axis: [number, number, number],
  progress: number,
  maxRadius: number = Number.POSITIVE_INFINITY,
  bodyRadius: number = 0,
): ExplosionOffset[] {
  const t = clampProgress(progress);
  // smoothstep：两端变化率趋近 0，组装态与拆解态都更安静
  const eased = t * t * (3 - 2 * t);
  return groups.map((group) => {
    const radial = new THREE.Vector3(group.center[0] - axis[0], 0, group.center[2] - axis[2]);
    if (radial.lengthSq() < 1e-10) radial.set(0, 0, 1); // 恰好落在中轴上的组，给一个确定的兜底方向
    radial.normalize();
    const direction = radial.add(new THREE.Vector3(0, EXPLOSION_UP_BIAS, 0)).normalize();
    const scale = Math.max(EXPLOSION_MIN_RADIUS, Math.min(group.radius, maxRadius));
    const layer = Math.max(0, group.layer ?? 0);
    const distance = eased * (scale * EXPLOSION_SPREAD + layer * bodyRadius * EXPLOSION_LAYER_STEP_RATIO);
    // 组装态的位移就是精确的零向量（避免出现 -0 这种无意义的符号）
    if (distance === 0) return { id: group.id, offset: [0, 0, 0] };
    const offset: [number, number, number] = [
      direction.x * distance,
      direction.y * distance,
      direction.z * distance,
    ];
    return { id: group.id, offset };
  });
}
