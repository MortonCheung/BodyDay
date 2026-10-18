/**
 * 解剖结构 ↔ BodyDay 领域实体 的映射层（纯数据，不引入任何渲染依赖）。
 *
 * V2 起人体由本作品自建的 R3F 舞台渲染（见 `three/FullBodyStage.tsx`），
 * 因此这里不再承担 atlas 目录加载，只保留三件事：
 * 1. 已在真实模型中核对过的结构 ID 常量；
 * 2. 结构 ID 与领域实体 ID 的双向映射（含英文名与系统名口径）；
 * 3. 系统 ID → 中文名的展示口径。
 *
 * 约定：任何写进代码的结构 ID，都必须先在真实 GLB 的 `extras.anatomyId` 中出现过。
 */

/** 实测存在于 GLB `extras.anatomyId` 中的关键结构 ID（前置核对，禁止猜测）。 */
export const ATLAS_STRUCTURE_IDS = {
  /** 体表外壳：整具人体的最外层，拆解时随进度渐进隐去 */
  bodyShell: 'body-shell',
  cerebrum: 'cerebrum',
  cerebellum: 'cerebellum',
  brainstem: 'brainstem',
  heart: 'heart',
  spleen: 'spleen',
  /** 肺：GLB 中 5 个肺叶网格以 anatomyParentId=lungs 归属（anatomySystem=respiratory） */
  lungs: 'lungs',
} as const;

export type AtlasStructureId = (typeof ATLAS_STRUCTURE_IDS)[keyof typeof ATLAS_STRUCTURE_IDS];

/** atlas 系统 ID → 中文名（与 GLB 的 `extras.anatomySystem` 取值一一对应） */
export const SYSTEM_LABELS: Record<string, string> = {
  cardiovascular: '循环系统',
  digestive: '消化系统',
  endocrine: '内分泌系统',
  lymphatic: '淋巴系统',
  muscular: '肌肉系统',
  nervous: '神经系统',
  'regional-anatomy': '体表与区域解剖',
  reproductive: '生殖系统',
  respiratory: '呼吸系统',
  skeletal: '骨骼系统',
  urinary: '泌尿系统',
};

export function systemLabel(systemId: string | null | undefined): string | null {
  if (!systemId) return null;
  return SYSTEM_LABELS[systemId] ?? null;
}

/* ---------------- 结构 ID ↔ BodyDay 实体 ID ---------------- */

/**
 * BodyDay 已建立科普卡片的器官结构 → 其所属领域实体。
 *
 * 这些结构在真实模型里都是**整块器官几何**（cerebrum 为端脑整体、heart 为整颗心、
 * spleen 为整个脾），因此可以直接作为「聚焦 + 隔离」的目标。
 */
export const ORGAN_STRUCTURE_ENTITY: Record<string, string> = {
  cerebrum: 'brain',
  cerebellum: 'brain',
  brainstem: 'brain',
  heart: 'heart',
  spleen: 'spleen',
};

/** 领域实体 → 用于聚焦的结构 ID（必须是真实存在的结构） */
export const ENTITY_STRUCTURE: Record<string, string> = {
  brain: ATLAS_STRUCTURE_IDS.cerebrum,
  heart: ATLAS_STRUCTURE_IDS.heart,
  spleen: ATLAS_STRUCTURE_IDS.spleen,
};

/** 全部已登记器官结构 ID（供舞台判定「点到了已登记的器官」） */
export const ORGAN_STRUCTURE_IDS: string[] = Object.keys(ORGAN_STRUCTURE_ENTITY);

/**
 * 可作为「整块结构」被点选的已登记结构 ID。
 *
 * 除器官外还包含体表外壳：在装配状态下，用户点到的第一层几乎总是皮肤，
 * 若把它拆成「一个皮肤面片」来选中会非常怪。归并到 `body-shell` 整块，
 * 既符合解剖层级（体表本就是一层结构），也让高亮落在能看懂的轮廓上。
 * 注意体表没有独立的科普卡片，界面会如实说明，而不是编一段内容。
 */
export const FOREGROUND_STRUCTURE_IDS: string[] = [
  ...ORGAN_STRUCTURE_IDS,
  ATLAS_STRUCTURE_IDS.lungs,
  ATLAS_STRUCTURE_IDS.bodyShell,
];

/**
 * 已登记结构在界面上的中文名。
 *
 * 有对应领域实体的结构（大脑、心脏…）也用这张表，是为了让「点某块结构」时
 * 标题显示的是**整块结构**的名字，而不是被点中的那一小块曲线的名字。
 * 没有对应实体、也不在这张表里的结构，则退回它的真实英文解剖名。
 */
export const STRUCTURE_LABELS: Record<string, string> = {
  [ATLAS_STRUCTURE_IDS.bodyShell]: '体表（皮肤）',
  [ATLAS_STRUCTURE_IDS.cerebrum]: '大脑（端脑）',
  [ATLAS_STRUCTURE_IDS.cerebellum]: '小脑',
  [ATLAS_STRUCTURE_IDS.brainstem]: '脑干',
  [ATLAS_STRUCTURE_IDS.heart]: '心脏',
  [ATLAS_STRUCTURE_IDS.spleen]: '脾脏',
  [ATLAS_STRUCTURE_IDS.lungs]: '肺',
};

export function entityForStructure(structureId: string | null | undefined): string | null {
  if (!structureId) return null;
  return ORGAN_STRUCTURE_ENTITY[structureId] ?? null;
}

export function atlasStructureFor(entityId: string | null | undefined): string | null {
  if (!entityId) return null;
  return ENTITY_STRUCTURE[entityId] ?? null;
}

/* ---------------- 三维点选的结果对象 ---------------- */
/**
 * 一次真实点选的结果。
 *
 * `targetId` 与 `structureId` 分开，是为了让「点大脑里的某个脑区」既精确又符合直觉：
 * 高亮/隔离/聚焦作用在 `targetId`（整块端脑），而面板可以同时告诉用户
 * 他实际点到的是 `structureId`（某个具体脑区）。
 */
export interface StructureHit {
  /** 高亮 / 隔离 / 聚焦的作用目标：已登记结构优先，否则为被点结构自身 */
  targetId: string;
  /** 被点中的那一个结构自身的 anatomyId */
  structureId: string;
  /** 沿解剖父链命中的已登记结构（cerebrum / heart / spleen / body-shell）；没有则为 null */
  knownStructureId: string | null;
  /** 真实解剖英文名（未登记中文名的结构使用它，不编造译名） */
  name: string | null;
  /** atlas 系统 ID（如 nervous） */
  systemId: string | null;
}

/** 点选结果 → 可展示的结构信息（把内部 ID 挡在用户界面之外）。 */
export interface StructureInfo {
  structureId: string;
  /** 能映射到 BodyDay 实体时给出实体 ID，否则为 null */
  entityId: string | null;
  /** 优先已登记中文名；没有登记中文名时退回真实英文解剖名；两者都没有则为 null */
  name: string | null;
  /** 中文系统名 */
  system: string | null;
  /** 被点中的细分结构（与 targetId 不同时才有意义） */
  partName: string | null;
}

export function describeStructure(hit: StructureHit): StructureInfo {
  const entityId = entityForStructure(hit.knownStructureId);
  // 「点到了整块结构内部的某一小块」是常见情况（如端脑下的某个脑区）：
  // 此时 name 取整块结构的名字，partName 才是被点中的那一小块的真实解剖名。
  const partName =
    hit.knownStructureId && hit.structureId !== hit.knownStructureId ? hit.name : null;
  return {
    structureId: hit.targetId,
    entityId,
    name: (hit.knownStructureId ? STRUCTURE_LABELS[hit.knownStructureId] : null) ?? hit.name,
    system: systemLabel(hit.systemId),
    partName,
  };
}
