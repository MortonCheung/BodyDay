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

/* ---------------- 平面展开（planar explosion）----------------
 *
 * 展开不是「径向炸开」。目标是：完整人体 → 滚轮向下 → 各器官从人体中分离 →
 * 最终在**面向屏幕的同一平面上**排成清楚、可点击的结构阵列。
 *
 * 做法（参考 Human Atlas 的 `explosion-layout.ts` 思路，但按本工程真实数据结构重写）：
 * 1. 把可位移结构组按「布局单元」归并：已验证器官各成一个单元（心 / 肺 / 脑 / 脾 …），
 *    其余结构按解剖系统归并。这样上千个微小网格不会被摊成不可读的碎片，
 *    而是以「一个器官」「一个系统」为单位参与二维打包。
 * 2. 用各单元的真实前视包围盒（x/y）做确定性货架式（shelf）矩形打包，留固定间距。
 * 3. 每个单元内的所有组平移同一个向量（保持该器官自身的形状），并把 z 拉到统一平面。
 * 4. 位移 = 目标位置 − 原始位置，再乘以缓动后的进度：progress = 0 时精确为 0，
 *    因此组装/展开完全可逆、可随时反向，且不累计任何偏移。
 */

/** 展开后相邻单元之间的间距 = 人体包围盒最大边 × 该比例。 */
export const PLANAR_GAP_RATIO = 0.04;
/** 打包时目标总宽相对「等面积正方形」的放宽系数：越大越扁、越容易被相机装下。 */
export const PLANAR_ASPECT = 1.5;

/** 参与「单独成单元」的已验证器官结构 ID。 */
export const PLANAR_UNIT_IDS: readonly string[] = [
  'heart',
  'lungs',
  'cerebrum',
  'cerebellum',
  'brainstem',
  'spleen',
  'liver',
  'kidneys',
  'stomach',
  'pancreas',
];

/** 未命中器官时，按解剖系统兜底成单元；未登记系统统一进这一组。 */
export const PLANAR_UNIT_FALLBACK = 'other';

/** 体表外壳的结构 ID：拆解时它不承担「被推开」的角色，而是随进度渐进隐去。 */
export const SHELL_STRUCTURE_ID = ATLAS_STRUCTURE_IDS.bodyShell;

/**
 * 结构部分的统一色板（按解剖系统）。
 *
 * 目标是一具**中性化、可公开展示**的人体：暖白纸面上的一尊浅色解剖模型，
 * 而不是红褐色色块或发光体。皮肤 / 骨骼 / 肌肉统一到低饱和的暖灰家族，
 * 三者靠明度差区分（骨骼最亮、皮肤居中、肌肉略深），
 * 内脏、管道、神经等**保留资产自带的真实解剖配色**——那些颜色本身承担辨识功能。
 *
 * 这是一次显式的外观修改（属于 CC BY-SA 4.0 要求「标明修改」的部分），
 * 「关于 · 数据与方法」页与 `public/models/ANATOMY_LICENSE.txt` 已如实说明。
 */
export const STRUCTURE_TINT: Record<string, string> = {
  'regional-anatomy': '#d5cec2',
  skeletal: '#e9e3d9',
  muscular: '#bfb2a4',
};

/**
 * 公开展示时默认隐去的解剖系统。
 *
 * 作品面向课堂与公开评审，默认展示的是**男女共有的结构**；
 * 生殖系统在本轮不作为展示内容（既不提供专题，也不出现在默认人体里）。
 */
export const PUBLIC_DISPLAY_EXCLUDED_SYSTEMS: readonly string[] = ['reproductive'];

/**
 * 公开展示时默认隐去的体表外壳区域（按真实节点名匹配）。
 *
 * 只隐去 `Pubic hairs`（该区域的毛发几何）。
 * **不再隐去 `Urogenital region` 外壳**：它属于 `body-shell` 本体表，
 * 整块移除会在骨盆处留下肉眼可见的缺口（实测：正面 / 侧面 / 背面都有空洞）。
 * 保留它、并让它的材质与周围皮肤完全一致，才能得到连续的人体轮廓。
 *
 * 本作品对体表不做整形改写；模型是成人解剖参考模型，公开展示层面只统一材质、
 * 不提供生殖系统内容，具体边界在「关于」页与交付文档中如实说明。
 */
export const PUBLIC_DISPLAY_EXCLUDED_SHELL_REGIONS: readonly string[] = ['Pubic hairs'];

/**
 * 把节点名归一化后再比较。
 *
 * 必须这么做，因为 three 的 GLTFLoader 会调用 `PropertyBinding.sanitizeNodeName`
 * 清洗名字：空格与点都会变成下划线。也就是说 GLB 里的
 * `body-shell__Urogenital region.l` 到了运行时是 `body-shell__Urogenital_region_l`。
 * 只按原始名字做子串匹配会**静默失效**（这正是首轮核对时抓到的问题）。
 */
function normalizeName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * 判断一个网格是否属于「公开展示时应当隐去」的集合。
 *
 * 纯函数：只看该网格的真实系统 ID 与真实节点名（已按上面的规则归一化），不做任何位置猜测。
 */
export function isPublicDisplayExcluded(systemId: string | null, nodeName: string): boolean {
  if (systemId && PUBLIC_DISPLAY_EXCLUDED_SYSTEMS.includes(systemId)) return true;
  const normalized = normalizeName(nodeName);
  return PUBLIC_DISPLAY_EXCLUDED_SHELL_REGIONS.some((region) =>
    normalized.includes(normalizeName(region)),
  );
}

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
  /* GLTFLoader 会把空格与点清洗成下划线，展示前还原成空格（Left_atrium → Left atrium） */
  const part = (separator >= 0 ? raw.slice(separator + 2) : raw).trim().replace(/_/g, ' ');
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

  /* 沿父链数出「点到的是本体的第几层」，用于区分「点中器官本体」与「点中脑回这类局部」 */
  let depthToKnown = -1;
  if (knownStructureId) {
    depthToKnown = 0;
    let cursor = parents.get(structureId);
    let guard = 0;
    while (cursor && guard < 64) {
      depthToKnown += 1;
      if (cursor === knownStructureId) break;
      cursor = parents.get(cursor);
      guard += 1;
    }
    if (cursor !== knownStructureId) depthToKnown = -1;
  }

  return {
    targetId: knownStructureId ?? structureId,
    structureId,
    knownStructureId,
    name: readableStructureName(object, structureId),
    systemId: typeof systemId === 'string' && systemId.length > 0 ? systemId : null,
    depthToKnown,
  };
}

/** 参与平面展开的一个结构组。 */
export interface LayoutGroup {
  id: string;
  /** 该组网格在模型坐标系下的包围盒中心 */
  center: [number, number, number];
  /** 该组网格包围盒的三轴尺寸（平面打包只用 x / y） */
  size: [number, number, number];
  /** 所属布局单元：已验证器官 ID，或解剖系统 ID */
  unit: string;
  /** 该组的解剖系统 ID（用于系统筛选后的重新布局） */
  system: string | null;
  /** 外壳网格不参与平面打包（展开时它本身就渐隐） */
  shell?: boolean;
}

/** 某个结构组在给定进度下的位移向量（模型坐标系）。 */
export interface LayoutOffset {
  id: string;
  offset: [number, number, number];
}

export interface PlanarLayout {
  offsets: LayoutOffset[];
  /** 展开后整体在 x / y 上的范围（模型坐标系；z 已收拢到同一平面附近） */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** 参与打包的布局单元数量（用于日志与验收） */
  unitCount: number;
  /**
   * 展开后**各单元中心**在 z 上的跨度（模型坐标系）。
   * 该值随进度线性收敛到 0，是「所有器官确实被收拢到同一深度平面」的直接证据。
   */
  unitDepthSpread: number;
}

interface UnitBox {
  unit: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerY: number;
  centerZ: number;
}

/**
 * 确定性货架式（shelf）矩形打包。
 *
 * 输入按高度降序排列，逐行从左到右摆放；一行放不下就换行，行高取该行最高者。
 * 不使用随机数、不依赖遍历顺序，因此同样的输入必然得到同样的布局——
 * 这是「同一进度反复调用结果完全一致」的前提。
 */
function shelfPack(
  rects: readonly { unit: string; w: number; h: number }[],
  width: number,
  gap: number,
): { placed: { unit: string; x: number; y: number; w: number; h: number }[]; height: number } {
  const rows: { items: { unit: string; x: number; w: number; h: number }[]; y: number; height: number }[] =
    [];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  let rowItems: { unit: string; x: number; w: number; h: number }[] = [];

  for (const rect of rects) {
    if (cursorX > 0 && cursorX + rect.w > width) {
      rows.push({ items: rowItems, y: cursorY, height: rowHeight });
      cursorX = 0;
      cursorY += rowHeight + gap;
      rowHeight = 0;
      rowItems = [];
    }
    rowItems.push({ unit: rect.unit, x: cursorX, w: rect.w, h: rect.h });
    cursorX += rect.w + gap;
    rowHeight = Math.max(rowHeight, rect.h);
  }
  if (rowItems.length > 0) rows.push({ items: rowItems, y: cursorY, height: rowHeight });

  /**
   * 行内**垂直居中**：骨骼这类高瘦单元会把整行撑高，
   * 若其余小器官一律顶对齐，行下方会留下一大片空白。居中后画面密度明显改善。
   */
  const placed: { unit: string; x: number; y: number; w: number; h: number }[] = [];
  for (const row of rows) {
    for (const item of row.items) {
      placed.push({ ...item, y: row.y + (row.height - item.h) / 2 });
    }
  }
  const height = rows.length > 0 ? rows[rows.length - 1].y + rows[rows.length - 1].height : 0;
  return { placed, height };
}

/**
 * 把结构组排到同一平面上。
 *
 * 纯函数：布局只由组的真实几何与单元归属决定，位移再乘以给定进度。
 * `progress = 0` 时每个 offset 都精确为 `[0, 0, 0]`，因此展开/组装严格可逆。
 *
 * @param bodyMaxDim 整具人体包围盒的最大边，用来把间距换算成与模型同尺度的距离
 * @param onlySystemId 系统筛选：只对可见系统重新打包，被隐藏的器官不再占据格子
 */
export function computePlanarLayout(
  groups: readonly LayoutGroup[],
  progress: number,
  bodyMaxDim: number,
  options?: { gapRatio?: number; aspect?: number; onlySystemId?: string | null },
): PlanarLayout {
  const gapRatio = options?.gapRatio ?? PLANAR_GAP_RATIO;
  const aspect = options?.aspect ?? PLANAR_ASPECT;
  const onlySystemId = options?.onlySystemId ?? null;
  const shellGroups = groups.filter((group) => group.shell);
  const layoutGroups = groups.filter(
    (group) => !group.shell && (!onlySystemId || group.system === onlySystemId),
  );

  const emptyBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  if (layoutGroups.length === 0) {
    return {
      offsets: groups.map((group) => ({ id: group.id, offset: [0, 0, 0] as [number, number, number] })),
      bounds: emptyBounds,
      unitCount: 0,
      unitDepthSpread: 0,
    };
  }

  const gap = Math.max(1e-4, bodyMaxDim * gapRatio);

  /* 1. 按单元聚合真实前视包围盒 */
  const units = new Map<string, UnitBox>();
  for (const group of layoutGroups) {
    const [cx, cy, cz] = group.center;
    const [sx, sy, sz] = group.size;
    const halfX = Math.max(Math.abs(sx), 1e-4) / 2;
    const halfY = Math.max(Math.abs(sy), 1e-4) / 2;
    const halfZ = Math.max(Math.abs(sz), 1e-4) / 2;
    const existing = units.get(group.unit);
    if (existing) {
      existing.minX = Math.min(existing.minX, cx - halfX);
      existing.maxX = Math.max(existing.maxX, cx + halfX);
      existing.minY = Math.min(existing.minY, cy - halfY);
      existing.maxY = Math.max(existing.maxY, cy + halfY);
      existing.minZ = Math.min(existing.minZ, cz - halfZ);
      existing.maxZ = Math.max(existing.maxZ, cz + halfZ);
    } else {
      units.set(group.unit, {
        unit: group.unit,
        minX: cx - halfX,
        maxX: cx + halfX,
        minY: cy - halfY,
        maxY: cy + halfY,
        minZ: cz - halfZ,
        maxZ: cz + halfZ,
        centerX: cx,
        centerY: cy,
        centerZ: cz,
      });
    }
  }
  for (const unit of units.values()) {
    unit.centerX = (unit.minX + unit.maxX) / 2;
    unit.centerY = (unit.minY + unit.maxY) / 2;
    unit.centerZ = (unit.minZ + unit.maxZ) / 2;
  }

  /* 2. 排序 + 估算目标总宽（等面积正方形的放宽版），再打包 */
  const unitRects = [...units.values()]
    .map((unit) => ({
      unit: unit.unit,
      w: Math.max(1e-3, unit.maxX - unit.minX),
      h: Math.max(1e-3, unit.maxY - unit.minY),
    }))
    .sort((a, b) => b.h - a.h || a.unit.localeCompare(b.unit));

  const totalArea = unitRects.reduce((sum, rect) => sum + (rect.w + gap) * (rect.h + gap), 0);
  const targetWidth = Math.max(...unitRects.map((rect) => rect.w), Math.sqrt(totalArea * aspect));
  const { placed, height } = shelfPack(unitRects, targetWidth, gap);
  const placedWidth = placed.reduce((max, rect) => Math.max(max, rect.x + rect.w), 0);

  /* 3. 打包结果居中到原点：相机只需要看一个以原点为中心的平面 */
  const offsetX = placedWidth / 2;
  const offsetY = height / 2;
  const targets = new Map<string, { x: number; y: number; z: number }>();
  for (const rect of placed) {
    targets.set(rect.unit, {
      x: rect.x + rect.w / 2 - offsetX,
      y: -(rect.y + rect.h / 2 - offsetY), // 屏幕向上为 +y，货架向下增长，这里翻转
      z: 0,
    });
  }

  /* 4. 单元内所有结构平移同一向量：器官自身形状保持不变，整体落到统一平面 */
  const t = clampProgress(progress);
  const eased = t * t * (3 - 2 * t);
  const offsets: LayoutOffset[] = groups.map((group) => {
    if (group.shell) return { id: group.id, offset: [0, 0, 0] };
    // 被系统筛选隐藏的组不参与布局，位移归零（它们本身已经不可见）
    if (onlySystemId && group.system !== onlySystemId) {
      return { id: group.id, offset: [0, 0, 0] };
    }
    const unit = units.get(group.unit);
    const target = targets.get(group.unit);
    if (!unit || !target) return { id: group.id, offset: [0, 0, 0] };
    const dx = target.x - unit.centerX;
    const dy = target.y - unit.centerY;
    const dz = target.z - unit.centerZ;
    if (eased === 0) return { id: group.id, offset: [0, 0, 0] };
    return {
      id: group.id,
      offset: [dx * eased, dy * eased, dz * eased],
    };
  });

  const minX = -placedWidth / 2;
  const maxX = placedWidth / 2;
  const minY = -height / 2;
  const maxY = height / 2;

  // 外壳分组不参与布局，但仍要出现在返回值里（调用方按 id 查表）
  for (const group of shellGroups) {
    if (!offsets.some((item) => item.id === group.id)) {
      offsets.push({ id: group.id, offset: [0, 0, 0] });
    }
  }

  /* 单元中心 z 的原始跨度 × (1 - eased)：展开完成后应当收敛到 0 */
  const unitZs = [...units.values()].map((unit) => unit.centerZ);
  const rawSpread = unitZs.length > 0 ? Math.max(...unitZs) - Math.min(...unitZs) : 0;

  return {
    offsets,
    bounds: { minX, minY, maxX, maxY },
    unitCount: units.size,
    unitDepthSpread: rawSpread * (1 - eased),
  };
}
