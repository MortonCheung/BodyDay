import type { KnowledgeRelation, RelationType } from './types';

export const RELATION_TYPE_LABEL: Record<RelationType, string> = {
  part_of: '结构隶属',
  functional: '功能相关',
  circulates_through: '循环输送',
  disease_context: '疾病语境',
  extends_to: '尺度延伸',
};

export const RELATION_TYPE_NOTE: Record<RelationType, string> = {
  part_of: '一种结构在解剖层级上从属于另一种结构。',
  functional: '两者在功能上相互关联，但不表示其中一个「拥有」另一个。',
  circulates_through: '某类细胞或物质通过循环系统被运输到该处，不代表在此生成。',
  disease_context: '在明确的疾病机制语境下，两者才产生关联。',
  extends_to: '从当前尺度向下进入更小的尺度层级。',
};

const REVIEWED_AT = '2026-10-14';

/**
 * BodyDay 科学关系表。
 *
 * 设计原则：每一条关系都显式写出自己的科学语义，
 * **禁止使用自动生成的「所有器官 → 任意细胞」兜底规则**。
 */
export const RELATIONS: KnowledgeRelation[] = [
  /* ---- 结构隶属 ---- */
  {
    id: 'r-brain-nervous',
    fromId: 'brain',
    toId: 'nervous-system',
    relationType: 'part_of',
    description: '脑属于中枢神经系统，与脊髓共同构成中枢部分。',
    sourceIds: ['S02'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'r-heart-cardiovascular',
    fromId: 'heart',
    toId: 'cardiovascular-system',
    relationType: 'part_of',
    description: '心脏是循环系统的核心器官，为血液流动提供动力。',
    sourceIds: ['S03'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'r-spleen-lymphatic',
    fromId: 'spleen',
    toId: 'lymphatic-system',
    relationType: 'part_of',
    description: '脾脏是淋巴系统中最大的淋巴器官。',
    sourceIds: ['S05'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },

  /* ---- 尺度延伸：器官 → 细胞 ---- */
  {
    id: 'r-brain-neuron',
    fromId: 'brain',
    toId: 'neuron',
    relationType: 'extends_to',
    description:
      '脑由神经组织构成，神经组织中含有大量神经元。注意：这是「神经组织相关细胞」的关系，不表示某个脑区只有一种神经元。',
    sourceIds: ['S01', 'S02'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'r-spleen-leukocyte',
    fromId: 'spleen',
    toId: 'leukocyte',
    relationType: 'functional',
    description:
      '脾脏是免疫细胞聚集与免疫应答发生的重要场所之一，与白细胞存在免疫功能关联；白细胞本身主要在骨髓生成。',
    sourceIds: ['S04', 'S05'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'r-heart-leukocyte',
    fromId: 'heart',
    toId: 'leukocyte',
    relationType: 'circulates_through',
    description:
      '白细胞随血液被循环系统输送到全身，因此会流经心脏。这是循环输送关系：心脏提供动力，并不生成白细胞。',
    sourceIds: ['S03', 'S04'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },

  /* ---- 功能相关 ---- */
  {
    id: 'r-neuron-brain',
    fromId: 'neuron',
    toId: 'brain',
    relationType: 'functional',
    description: '神经元的电信号活动是脑实现感觉整合、运动控制与认知功能的基础。',
    sourceIds: ['S01', 'S06'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'r-leukocyte-lymphatic',
    fromId: 'leukocyte',
    toId: 'lymphatic-system',
    relationType: 'functional',
    description: '免疫细胞通过淋巴管与淋巴结迁移与聚集，淋巴系统是免疫应答的重要结构基础。',
    sourceIds: ['S05', 'S14'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'r-heart-brain',
    fromId: 'heart',
    toId: 'brain',
    relationType: 'functional',
    description: '循环系统为脑持续供应含氧血液与营养；脑的正常功能依赖稳定的血液供应。',
    sourceIds: ['S03', 'S06'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },

  /* ---- 疾病语境（只在明确机制下成立） ---- */
  {
    id: 'r-sleep-neuron',
    fromId: 'brain',
    toId: 'neuron',
    relationType: 'disease_context',
    description:
      '长期睡眠不足与注意力、记忆等认知功能下降相关，其背后涉及神经系统的功能状态；此处讨论的是功能影响，不是结构性病变诊断。',
    sourceIds: ['S08'],
    confidence: 'medium',
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'r-hypertension-heart',
    fromId: 'cardiovascular-system',
    toId: 'heart',
    relationType: 'disease_context',
    description: '高血压是心血管疾病的重要危险因素，长期血压升高会增加心脏负担。',
    sourceIds: ['S12', 'S07'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'r-spleen-leukocyte-disease',
    fromId: 'spleen',
    toId: 'leukocyte',
    relationType: 'disease_context',
    description:
      '脾脏与免疫细胞的疾病关联需要谨慎表述：脾脏参与血液过滤与免疫应答，其功能异常可影响血液细胞的处理，但具体疾病需由临床诊断确认。',
    sourceIds: ['S05'],
    confidence: 'medium',
    reviewedAt: REVIEWED_AT,
  },

  /* ---- 预防性健康语境 ---- */
  {
    id: 'r-vaccine-leukocyte',
    fromId: 'leukocyte',
    toId: 'lymphatic-system',
    relationType: 'functional',
    description: '免疫接种通过让免疫系统提前识别病原体特征，使白细胞在真实感染时能够更快、更有效地应答。',
    sourceIds: ['S18'],
    confidence: 'high',
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'r-activity-neuron',
    fromId: 'neuron',
    toId: 'brain',
    relationType: 'disease_context',
    description: '规律身体活动与更好的整体健康及脑健康指标相关；此处说明的是健康行为关联，不是治疗手段。',
    sourceIds: ['S10', 'S13'],
    confidence: 'medium',
    reviewedAt: REVIEWED_AT,
  },
];

export const RELATION_MAP: Record<string, KnowledgeRelation> = Object.fromEntries(
  RELATIONS.map((r) => [r.id, r]),
);

export function relationsOf(entityId: string): KnowledgeRelation[] {
  return RELATIONS.filter((r) => r.fromId === entityId || r.toId === entityId);
}

export function relationsFrom(entityId: string): KnowledgeRelation[] {
  return RELATIONS.filter((r) => r.fromId === entityId);
}

export function relationsTo(entityId: string): KnowledgeRelation[] {
  return RELATIONS.filter((r) => r.toId === entityId);
}

/**
 * 只返回**确实能打开 3D 模型**的向下关系，用于「进入细胞」按钮的可用性判断。
 * 不存在的模型一律返回空数组，由界面显示受控的不可用状态。
 */
export function drilldownTargets(
  entityId: string,
  canRender: (entityId: string) => boolean,
): string[] {
  return RELATIONS.filter((r) => r.fromId === entityId && r.relationType === 'extends_to')
    .map((r) => r.toId)
    .filter((id, index, arr) => arr.indexOf(id) === index)
    .filter(canRender);
}
