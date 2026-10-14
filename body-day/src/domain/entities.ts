import type { BodyEntity } from './types';

/**
 * BodyDay 实体表。
 *
 * 编写规则：
 * - `atlasStructureId` 只填**已在 Vanatome 1.4.0 metadata 中实测存在**的 ID
 *   （`cerebrum` / `heart` / `spleen` 均已核对）。
 * - `organAssetId` 只填**已核验许可**的独立器官模型（HRA / HuBMAP，CC BY 4.0）。
 * - 未覆盖的节点不强行跳入不相关模型，改为提供可阅读知识与明确说明。
 */
export const ENTITIES: BodyEntity[] = [
  /* ================= 人体 ================= */
  {
    id: 'human',
    nameZh: '人体',
    nameEn: 'Human body',
    kind: 'body',
    summary:
      '人体由若干解剖系统协同构成。BodyDay 从这里出发，可以逐层向下进入系统、器官、组织与细胞。',
    labels: ['多尺度', '起点'],
    facts: [
      { label: '组织层级', text: '细胞 → 组织 → 器官 → 系统 → 人体，是解剖学的经典层级关系。', sourceIds: ['S02'] },
      { label: '系统数量', text: 'BodyDay 采用的人体图谱收录 11 个系统，本作品开放其中的神经、循环与免疫相关路径。', sourceIds: ['S17'] },
    ],
    sources: ['S02', 'S17'],
    reviewStatus: 'reviewed',
    scaleNote: '三维模型为科普示意，结构与真实人体比例不完全一致。',
  },

  /* ================= 系统 ================= */
  {
    id: 'nervous-system',
    nameZh: '神经系统',
    nameEn: 'Nervous system',
    kind: 'system',
    parentId: 'human',
    summary: '由脑、脊髓与遍布全身的神经构成，负责接收、整合与传递信息。',
    labels: ['中枢', '周围'],
    facts: [
      { label: '两大分部', text: '中枢神经系统包括脑与脊髓；周围神经系统包括脑神经、脊神经及其分支。', sourceIds: ['S02'] },
      { label: '基本单元', text: '神经组织由神经元与神经胶质细胞构成，神经元是承载电信号传递的细胞。', sourceIds: ['S01'] },
    ],
    sources: ['S01', 'S02'],
    reviewStatus: 'reviewed',
  },
  {
    id: 'cardiovascular-system',
    nameZh: '循环系统',
    nameEn: 'Cardiovascular system',
    kind: 'system',
    parentId: 'human',
    summary: '由心脏、血管与血液构成，把氧气、营养物质与细胞运送到全身各处。',
    labels: ['运输', '动力'],
    facts: [
      { label: '两条循环', text: '肺循环把血液送到肺完成气体交换，体循环把含氧血液送往全身组织。', sourceIds: ['S03'] },
      { label: '运输内容', text: '血液运输红细胞、白细胞、血小板、血浆蛋白与代谢产物。', sourceIds: ['S04'] },
    ],
    sources: ['S03', 'S04'],
    reviewStatus: 'reviewed',
  },
  {
    id: 'lymphatic-system',
    nameZh: '淋巴系统',
    nameEn: 'Lymphatic system',
    kind: 'system',
    parentId: 'human',
    summary: '由淋巴管、淋巴结、脾脏等构成，参与体液回流并承担重要的免疫防御功能。',
    labels: ['免疫', '回流'],
    facts: [
      { label: '免疫功能', text: '淋巴系统是免疫系统的重要结构基础，脾脏与淋巴结是其中的免疫相关器官。', sourceIds: ['S05'] },
      { label: '体液回流', text: '淋巴管把组织间液回收并送回静脉循环。', sourceIds: ['S05'] },
    ],
    sources: ['S05'],
    reviewStatus: 'reviewed',
  },

  /* ================= 器官 ================= */
  {
    id: 'brain',
    nameZh: '大脑',
    nameEn: 'Cerebrum / Brain',
    kind: 'organ',
    parentId: 'nervous-system',
    atlasStructureId: 'cerebrum',
    organAssetId: 'brain',
    summary:
      '脑位于颅腔内，是中枢神经系统的核心。端脑（大脑）负责感觉整合、随意运动、语言与高级认知。',
    labels: ['中枢', '神经组织'],
    facts: [
      { label: '位置', text: '位于颅腔内，与脑干、小脑共同组成脑的主体部分。', sourceIds: ['S06'] },
      { label: '构成', text: '脑由神经组织构成，其中包含大量神经元与神经胶质细胞。', sourceIds: ['S01', 'S02'] },
      { label: '主要分区', text: '常按端脑（大脑）、小脑、脑干来分区描述。', sourceIds: ['S06'] },
    ],
    health: [
      { title: '睡眠与脑', text: '充足的规律睡眠对认知、情绪与神经系统功能有重要作用；长期睡眠不足会损害注意力与记忆表现。', sourceIds: ['S06', 'S08'] },
      { title: '身体活动', text: '规律身体活动有益于整体健康，也与脑健康和生活质量相关。', sourceIds: ['S10'] },
    ],
    sources: ['S01', 'S02', 'S06', 'S08', 'S10'],
    reviewStatus: 'reviewed',
    scaleNote: '脑的三维模型用于结构示意，不含真实比例与病理变化。',
  },
  {
    id: 'heart',
    nameZh: '心脏',
    nameEn: 'Heart',
    kind: 'organ',
    parentId: 'cardiovascular-system',
    atlasStructureId: 'heart',
    organAssetId: 'heart',
    summary: '心脏是循环系统的动力泵，通过有节律的收缩把血液推向肺与全身。',
    labels: ['动力泵', '循环'],
    facts: [
      { label: '四个腔', text: '右心房、右心室、左心房、左心室；左右两侧由室间隔分开。', sourceIds: ['S03'] },
      { label: '瓣膜', text: '房室瓣与半月瓣保证血液单向流动，防止倒流。', sourceIds: ['S03'] },
      { label: '与白细胞的真实关系', text: '白细胞主要在骨髓生成，随血液被输送到全身；心脏提供的是循环动力，而不是生成白细胞。', sourceIds: ['S04'] },
    ],
    health: [
      { title: '血压管理', text: '高血压是心血管疾病的重要危险因素，减少高盐饮食、保持身体活动有助于血压管理。', sourceIds: ['S12', 'S07'] },
      { title: '规律运动', text: '规律的中等强度身体活动有助于心血管健康。', sourceIds: ['S10', 'S13'] },
    ],
    sources: ['S03', 'S04', 'S07', 'S10', 'S12', 'S13'],
    reviewStatus: 'reviewed',
  },
  {
    id: 'spleen',
    nameZh: '脾脏',
    nameEn: 'Spleen',
    kind: 'organ',
    parentId: 'lymphatic-system',
    atlasStructureId: 'spleen',
    organAssetId: 'spleen',
    summary: '脾脏位于左上腹，是最大的淋巴器官，参与血液过滤与免疫应答。',
    labels: ['淋巴器官', '免疫'],
    facts: [
      { label: '位置', text: '位于左上腹，胃的后外侧，受肋骨保护。', sourceIds: ['S05'] },
      { label: '免疫角色', text: '作为淋巴器官，脾脏是免疫细胞聚集、识别与应答的重要场所之一。', sourceIds: ['S05'] },
      { label: '血液过滤', text: '脾脏过滤血液，并参与清除衰老或受损的红细胞。', sourceIds: ['S05'] },
    ],
    health: [
      { title: '免疫功能与生活方式', text: '充足睡眠、均衡膳食与规律身体活动是支持免疫功能的基础性生活方式因素。', sourceIds: ['S08', 'S11', 'S10'] },
      { title: '疫苗的意义', text: '免疫接种通过训练免疫系统识别特定病原体，从而在真正接触时更快、更有效地应答。', sourceIds: ['S18'] },
    ],
    sources: ['S05', 'S08', 'S10', 'S11', 'S18'],
    reviewStatus: 'reviewed',
    scaleNote: '脾脏三维模型用于结构示意，未按真实比例渲染。',
  },

  /* ================= 细胞 ================= */
  {
    id: 'neuron',
    nameZh: '神经元',
    nameEn: 'Neuron',
    kind: 'cell',
    parentId: 'brain',
    proceduralId: 'neuron',
    summary:
      '神经元是神经系统的基本功能细胞，负责接收、整合并传递电信号。脑的神经组织中含有大量神经元。',
    labels: ['神经组织', '电信号'],
    facts: [
      { label: '基本形态', text: '一个典型的神经元由胞体、树突与轴突三部分构成。', sourceIds: ['S01'] },
      { label: '信号方式', text: '在轴突上以电信号（动作电位）传导，在突触处以化学递质传给下一个细胞。', sourceIds: ['S01'] },
      { label: '与大脑的关系', text: '「大脑 → 神经元」表示神经组织相关的细胞，并不表示某一个脑区只有一种神经元；脑内神经元类型多样。', sourceIds: ['S01', 'S02'] },
    ],
    health: [
      { title: '睡眠与神经功能', text: '睡眠不足会影响注意力、记忆与情绪调节等神经系统相关功能。', sourceIds: ['S08'] },
      { title: '运动与脑健康', text: '规律身体活动与更好的脑健康指标相关。', sourceIds: ['S10'] },
    ],
    sources: ['S01', 'S02', 'S08', 'S10'],
    reviewStatus: 'reviewed',
    scaleNote: '细胞模型为程序化科学示意，形态与真实神经元不完全一致，不按真实比例。',
  },
  {
    id: 'leukocyte',
    nameZh: '白细胞',
    nameEn: 'White blood cell / Leukocyte',
    kind: 'cell',
    parentId: 'spleen',
    proceduralId: 'leukocyte',
    summary:
      '白细胞是血液中免疫细胞的总称，包括中性粒细胞、淋巴细胞、单核细胞等，主要在骨髓生成，随血液与淋巴循环到达全身。',
    labels: ['免疫细胞', '血液'],
    facts: [
      { label: '组成', text: '白细胞并非单一细胞，而是若干具有防御功能的细胞类型的统称。', sourceIds: ['S04'] },
      { label: '生成位置', text: '血细胞（含白细胞）主要在骨髓中生成。', sourceIds: ['S04'] },
      { label: '到达方式', text: '白细胞随血液运输，并可经血管壁进入组织；淋巴系统也参与免疫细胞的迁移。', sourceIds: ['S04', 'S14', 'S05'] },
    ],
    health: [
      { title: '疫苗如何起作用', text: '免疫接种让免疫系统提前「认识」病原体特征，在真实感染时能够更快启动针对性应答。', sourceIds: ['S18'] },
      { title: '睡眠与免疫', text: '睡眠不足会影响免疫系统的正常功能。', sourceIds: ['S08'] },
    ],
    sources: ['S04', 'S05', 'S08', 'S14', 'S18'],
    reviewStatus: 'reviewed',
    scaleNote: '细胞模型为程序化科学示意，白细胞在真实血液中形态多样，此模型为概括性表达。',
  },

  /* ============ 细胞内部结构（部件） ============ */
  {
    id: 'neuron-soma',
    nameZh: '胞体',
    nameEn: 'Soma / Cell body',
    kind: 'organelle',
    parentId: 'neuron',
    proceduralId: 'neuron-soma',
    summary: '胞体是神经元的代谢中心，含有细胞核与多数细胞器，也是信号整合的场所。',
    labels: ['细胞结构'],
    facts: [{ label: '作用', text: '来自树突的信号在胞体处汇总，决定是否产生向外的电信号。', sourceIds: ['S01'] }],
    sources: ['S01'],
    reviewStatus: 'reviewed',
  },
  {
    id: 'neuron-dendrite',
    nameZh: '树突',
    nameEn: 'Dendrite',
    kind: 'organelle',
    parentId: 'neuron',
    proceduralId: 'neuron-dendrite',
    summary: '树突是从胞体伸出的分支结构，主要接收来自其他神经元的信号。',
    labels: ['细胞结构', '输入'],
    facts: [{ label: '作用', text: '树突扩大接收面积，把信号传向胞体。', sourceIds: ['S01'] }],
    sources: ['S01'],
    reviewStatus: 'reviewed',
  },
  {
    id: 'neuron-axon',
    nameZh: '轴突',
    nameEn: 'Axon',
    kind: 'organelle',
    parentId: 'neuron',
    proceduralId: 'neuron-axon',
    summary: '轴突是从胞体伸出的长突起，把电信号从胞体一侧传向远处，末端形成突触。',
    labels: ['细胞结构', '输出'],
    facts: [{ label: '作用', text: '动作电位沿轴突传导，在轴突末梢通过突触把信息传给下一个细胞。', sourceIds: ['S01'] }],
    sources: ['S01'],
    reviewStatus: 'reviewed',
  },
  {
    id: 'neuron-myelin',
    nameZh: '髓鞘',
    nameEn: 'Myelin sheath',
    kind: 'organelle',
    parentId: 'neuron',
    proceduralId: 'neuron-myelin',
    summary: '髓鞘是包绕在部分轴突外的绝缘结构，可加快电信号传导速度。',
    labels: ['细胞结构', '绝缘'],
    facts: [{ label: '作用', text: '髓鞘由胶质细胞形成，使信号沿轴突的传导更快、更稳定。', sourceIds: ['S01'] }],
    sources: ['S01'],
    reviewStatus: 'reviewed',
  },
  {
    id: 'leukocyte-membrane',
    nameZh: '细胞膜',
    nameEn: 'Cell membrane',
    kind: 'organelle',
    parentId: 'leukocyte',
    proceduralId: 'leukocyte-membrane',
    summary: '细胞膜把细胞与外界分开，并参与识别与物质交换。',
    labels: ['细胞结构'],
    facts: [{ label: '免疫相关', text: '免疫细胞表面的膜分子参与识别目标与细胞间通信。', sourceIds: ['S05'] }],
    sources: ['S05'],
    reviewStatus: 'reviewed',
  },
  {
    id: 'leukocyte-cytoplasm',
    nameZh: '细胞质',
    nameEn: 'Cytoplasm',
    kind: 'organelle',
    parentId: 'leukocyte',
    proceduralId: 'leukocyte-cytoplasm',
    summary: '细胞质是细胞膜与细胞核之间的区域，含多种细胞器，是代谢与防御反应发生的场所。',
    labels: ['细胞结构'],
    facts: [{ label: '功能', text: '白细胞在细胞质中完成吞噬、颗粒释放等防御相关过程。', sourceIds: ['S05'] }],
    sources: ['S05'],
    reviewStatus: 'reviewed',
  },
  {
    id: 'leukocyte-nucleus',
    nameZh: '细胞核',
    nameEn: 'Nucleus',
    kind: 'organelle',
    parentId: 'leukocyte',
    proceduralId: 'leukocyte-nucleus',
    summary: '细胞核储存遗传信息并调控细胞活动；不同白细胞的核形态差异明显，是分类的重要依据。',
    labels: ['细胞结构'],
    facts: [{ label: '形态差异', text: '例如中性粒细胞核分叶，淋巴细胞核相对圆形，单核细胞核呈肾形。', sourceIds: ['S04'] }],
    sources: ['S04'],
    reviewStatus: 'reviewed',
  },
];

export const ENTITY_MAP: Record<string, BodyEntity> = Object.fromEntries(
  ENTITIES.map((e) => [e.id, e]),
);

export function getEntity(id: string | null | undefined): BodyEntity | undefined {
  if (!id) return undefined;
  return ENTITY_MAP[id];
}

export function getEntitiesByKind(kind: BodyEntity['kind']): BodyEntity[] {
  return ENTITIES.filter((e) => e.kind === kind);
}

export function getChildren(parentId: string): BodyEntity[] {
  return ENTITIES.filter((e) => e.parentId === parentId);
}

/** 从任意实体向上回溯到 human，得到面包屑路径 */
export function getAncestry(id: string): BodyEntity[] {
  const chain: BodyEntity[] = [];
  let current: BodyEntity | undefined = ENTITY_MAP[id];
  let guard = 0;
  while (current && guard < 12) {
    chain.unshift(current);
    current = current.parentId ? ENTITY_MAP[current.parentId] : undefined;
    guard += 1;
  }
  return chain;
}
