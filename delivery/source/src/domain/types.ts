/**
 * BodyDay 领域类型：纯数据、可验证、可扩展。
 *
 * 两条关键约定：
 * 1. 分类本体的规范 ID 与「模型本地 ID」分开存储 —— 分类 ID（`id`）用于关系图与导航，
 *    模型本地 ID（`atlasStructureId` / `organAssetId`）只用于真实模型寻址。
 * 2. 任何 `atlasStructureId` 都必须先在真实 atlas metadata 中存在，禁止写死猜测。
 */

/** 跨尺度层级：人体 → 系统 → 器官 → 组织 → 细胞 → 细胞器/部件 */
export type Scale = 'body' | 'system' | 'organ' | 'tissue' | 'cell' | 'organelle';

export type EntityKind = Scale;

/** `reviewed` = 已逐条核对来源；`pending` = 待核，不进入正式科普正文 */
export type ReviewStatus = 'reviewed' | 'pending';

export interface SourceRecord {
  id: string;
  publisher: string;
  title: string;
  url: string;
  accessDate: string;
  license?: string;
  /** 该来源的适用范围（能支持哪些说法、不能支持哪些说法） */
  scope: string;
}

export interface FactItem {
  label: string;
  text: string;
  sourceIds: string[];
}

/** 健康行动/认识：器官与细胞如何工作 → 与健康行为/常见问题的关系 → 可采取的有依据行动 */
export interface HealthItem {
  title: string;
  text: string;
  sourceIds: string[];
}

export interface BodyEntity {
  id: string;
  nameZh: string;
  nameEn?: string;
  kind: EntityKind;
  /** 所属上级实体（用于层级与面包屑） */
  parentId?: string;
  /** Vanatome atlas 中真实存在的结构 ID；用于「体内聚焦」 */
  atlasStructureId?: string;
  /** 独立器官 GLB 资源 ID；用于「器官独立查看」 */
  organAssetId?: string;
  /** 程序化几何 ID；用于细胞层 */
  proceduralId?: string;
  summary: string;
  labels: string[];
  facts?: FactItem[];
  health?: HealthItem[];
  sources: string[];
  reviewStatus: ReviewStatus;
  /** 科学示意边界说明（模型不按真实比例等） */
  scaleNote?: string;
}

export type RelationType =
  | 'part_of'          // 结构隶属
  | 'functional'       // 功能相关
  | 'circulates_through' // 循环输送关系
  | 'disease_context'  // 明确疾病机制
  | 'extends_to';      // 层次延伸（尺度向下）

export interface KnowledgeRelation {
  id: string;
  fromId: string;
  toId: string;
  relationType: RelationType;
  /** 关系的科学语义必须显式写出，不能默认理解为「拥有」 */
  description: string;
  sourceIds: string[];
  confidence: 'high' | 'medium';
  reviewedAt: string;
}

export interface QuizOption {
  key: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  answerKey: string;
  explanation: string;
  sourceIds: string[];
}

export type LessonStepKind = 'observe' | 'interact' | 'explain' | 'quiz' | 'summary';

export interface LessonStep {
  id: string;
  kind: LessonStepKind;
  title: string;
  body: string;
  /** 该步骤指向的真实实体（模型结构） */
  targetEntityId?: string;
  /** 需要完成的真实交互，例如 `select:cerebrum` / `focus:neuron-axon` */
  requiredInteraction?: string;
  question?: QuizQuestion;
  sourceIds?: string[];
}

export interface GuidedLesson {
  id: string;
  title: string;
  theme: string;
  goal: string;
  /** 课程入口实体 */
  entryEntityId: string;
  steps: LessonStep[];
  sourceIds: string[];
}

/** 尺度轴定义，用于跨尺度导航与转场遮罩 */
export interface ScaleDefinition {
  id: Scale;
  labelZh: string;
  labelEn: string;
  note: string;
}
