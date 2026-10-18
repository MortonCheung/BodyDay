import { ENTITY_MAP, type BodyEntity } from '../domain';

/**
 * 器官桥接（organBridge）。
 *
 * 只做一件事：把「本工程真实渲染的 Z-Anatomy 整具人体 GLB 里存在的结构」映射到
 * 合法的器官详解 ID。这里是**人工核对表**，每一行的依据都写在 `evidence` 里：
 *
 * - 只允许沿解剖父链（`anatomyParentId`）或已登记实体映射；
 * - 严禁 `name.includes('brain')` 这类字符串模糊匹配——本文件里没有任何子串推断；
 * - 无法核实几何真实存在、或没有可核查科普内容的器官，一律 `certainty:'needs-review'`
 *   且 `target:null`（界面据此隐藏入口，绝不造假按钮）；
 * - 手册明文要求：`spleen` 绝不能映射成 `pancreas` 或任何别的器官——本表把
 *   `spleen` 明确映射到自身，并把 `pancreas` 单独列在 needs-review；
 * - `thebuggeddev/anatomy` 仓库根目录没有 LICENSE，其器官模型与代码一律**不得复制**，
 *   因此本表只认本工程已合法分发的整具人体 GLB。
 */

export type OrganCertainty = 'verified' | 'needs-review';

export interface OrganBridgeRow {
  /** 结构 ID：GLB `extras.anatomyId` 实测值，或作为分组被 `anatomyParentId` 引用的实测值 */
  sourceId: string;
  /** 已核对的结构名（用于展示与核对） */
  sourceName: string;
  /** 目标器官 ID（`#/detail/:organId` 使用）；needs-review 时为 null */
  target: string | null;
  certainty: OrganCertainty;
  /** 核对依据（写清是「实测存在」还是「未核实」） */
  evidence: string;
}

export const ORGAN_BRIDGE: OrganBridgeRow[] = [
  {
    sourceId: 'heart',
    sourceName: '心脏',
    target: 'heart',
    certainty: 'verified',
    evidence: 'GLB 中 4 个心脏腔室网格（left/right atrium、left/right ventricle）以 anatomyParentId=heart 归属该分组，聚焦/隔离可用。',
  },
  {
    sourceId: 'cerebrum',
    sourceName: '大脑（端脑）',
    target: 'brain',
    certainty: 'verified',
    evidence: 'GLB 中 169 个端脑结构以 anatomyParentId=cerebrum 归属该分组；已登记实体 brain 的 atlasStructureId=cerebrum。',
  },
  {
    sourceId: 'cerebellum',
    sourceName: '小脑',
    target: 'brain',
    certainty: 'verified',
    evidence: 'GLB 中 33 个结构以 anatomyParentId=cerebellum 归属；沿解剖父链归属到脑，但它在模型中与端脑是并列分组。',
  },
  {
    sourceId: 'brainstem',
    sourceName: '脑干',
    target: 'brain',
    certainty: 'verified',
    evidence: 'GLB 中 6 个结构以 anatomyParentId=brainstem 归属；沿解剖父链归属到脑主体。',
  },
  {
    sourceId: 'lungs',
    sourceName: '肺',
    target: 'lungs',
    certainty: 'verified',
    evidence:
      'GLB 中 5 个肺叶网格（右肺 upper/middle/lower、左肺 upper/lower）以 anatomyParentId=lungs 归属，anatomySystem=respiratory；聚焦/隔离可用。',
  },
  {
    sourceId: 'spleen',
    sourceName: '脾脏',
    target: 'spleen',
    certainty: 'verified',
    evidence: 'GLB 中 spleen 自身即带几何的独立网格节点（anatomySystem=lymphatic），已登记实体 spleen 的 atlasStructureId=spleen。',
  },

  /* ---------- 以下为「未核实/暂不开放」的器官：隐藏入口，不造假按钮 ---------- */
  {
    sourceId: 'liver',
    sourceName: '肝',
    target: null,
    certainty: 'needs-review',
    evidence: 'GLB 中存在 liver 几何节点，但本工程没有与该器官对应、经核对的科普内容与实体映射，故不开放入口。',
  },
  {
    sourceId: 'kidneys',
    sourceName: '肾',
    target: null,
    certainty: 'needs-review',
    evidence: 'GLB 中 kidneys 仅作为分组被引用（子节点 kidneys-kidney-left/right），本工程无内容与实体映射，故不开放入口。',
  },
  {
    sourceId: 'pancreas',
    sourceName: '胰腺',
    target: null,
    certainty: 'needs-review',
    evidence: 'GLB 中存在 pancreas 几何节点；按手册不得与脾脏混淆，且本工程无对应科普内容，故标 needs-review。',
  },
  {
    sourceId: 'eyeball',
    sourceName: '眼球',
    target: null,
    certainty: 'needs-review',
    evidence: '未在本工程 GLB 的 extras.anatomyId 中核实到 eyeball 几何，故不开放入口。',
  },
  {
    sourceId: 'intestine',
    sourceName: '肠',
    target: null,
    certainty: 'needs-review',
    evidence: '未核实到整段 intestine 的单一结构 ID（真实几何以 large-intestine-* 各段呈现），故不开放入口。',
  },
  {
    sourceId: 'skin',
    sourceName: '皮肤',
    target: null,
    certainty: 'needs-review',
    evidence: '体表由 body-shell 承担，未核实独立 skin 结构 ID，故不开放入口。',
  },
];

/** 通过人工核对、可安全进入器官详解页的器官 ID（仅来自 verified 行）。 */
export const VERIFIED_ORGAN_IDS: string[] = Array.from(
  new Set(
    ORGAN_BRIDGE.filter((row) => row.certainty === 'verified' && row.target).map(
      (row) => row.target as string,
    ),
  ),
);

const BRIDGE_BY_SOURCE = new Map(
  ORGAN_BRIDGE.filter((row) => row.certainty === 'verified' && row.target).map((row) => [
    row.sourceId,
    row.target as string,
  ]),
);

/**
 * 结构 ID → 已核实器官 ID。只做精确查表（含沿解剖父链已由舞台解析好的目标传入），
 * 命中不到返回 null——绝不使用子串或模糊匹配。
 */
export function organTargetForStructure(structureId: string | null | undefined): string | null {
  if (!structureId) return null;
  return BRIDGE_BY_SOURCE.get(structureId) ?? null;
}

export function isVerifiedOrgan(organId: string | null | undefined): boolean {
  return Boolean(organId && VERIFIED_ORGAN_IDS.includes(organId));
}

/** 器官 ID → 展示名（仅已核实器官；否则 null）。 */
export function organDisplayName(organId: string | null | undefined): string | null {
  return resolveOrganDetail(organId)?.displayName ?? null;
}

/**
 * 每个可进入的器官，对应一个用于聚焦/隔离的真实结构 ID。
 * 心脏 → heart；脑 → cerebrum（端脑整体）；肺 → lungs；脾脏 → spleen。
 */
export const ORGAN_DETAIL_STRUCTURE: Record<string, string> = {
  heart: 'heart',
  brain: 'cerebrum',
  lungs: 'lungs',
  spleen: 'spleen',
};

/**
 * 肺在本作品中没有独立领域实体，这里按**可核查的空间/结构事实**构造一张最小实体：
 * 位置与分叶来自本工程真实渲染的 GLB；「气体交换」一句沿用仓库中已成稿的呼吸系统定位（S19）。
 * 缺失的「与健康的关系」整段不渲染——信息不足就不编造。
 */
const LUNGS_ENTITY: BodyEntity = {
  id: 'lungs',
  nameZh: '肺',
  nameEn: 'Lungs',
  kind: 'organ',
  parentId: 'respiratory-system',
  summary: '肺位于胸腔内，左右各一，是呼吸系统进行气体交换的主要器官。',
  labels: ['气体交换'],
  facts: [
    { label: '位置', text: '位于胸腔内，左右各一。（结构来自本作品真实渲染的人体图谱）', sourceIds: ['S17'] },
    { label: '分叶', text: '本作品模型按左肺两叶、右肺三叶呈现；分叶是肺的解剖分区。', sourceIds: ['S17'] },
    { label: '作用', text: '负责气体交换：把氧气带入体内，并把二氧化碳排出。', sourceIds: ['S19'] },
  ],
  sources: ['S17', 'S19'],
  reviewStatus: 'reviewed',
};

export interface OrganDetailSpec {
  organId: string;
  /** 用于聚焦/隔离的真实结构 ID */
  structureId: string;
  /** 器官详解页右侧卡片的实体（brain/heart/spleen 复用已登记实体；lungs 用最小实体） */
  entity: BodyEntity;
  displayName: string;
}

/** 解析器官详解页所需的全部数据；未核实的 organId 返回 null（调用方回退到探索页）。 */
export function resolveOrganDetail(organId: string | null | undefined): OrganDetailSpec | null {
  if (!isVerifiedOrgan(organId)) return null;
  const id = organId as string;
  const structureId = ORGAN_DETAIL_STRUCTURE[id];
  if (!structureId) return null;
  const entity = id === 'lungs' ? LUNGS_ENTITY : ENTITY_MAP[id];
  if (!entity) return null;
  return { organId: id, structureId, entity, displayName: entity.nameZh };
}
