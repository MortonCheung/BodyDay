/**
 * BodyDay 的组织层级（tissue）占位说明与体表/器官注解文本。
 *
 * 说明：
 * 1. BodyDay 的**人体层与器官层全部来自 Vanatome atlas 中真实且完整的结构**
 *    （`cerebrum` / `heart` / `spleen` 均为整块器官几何），因此不再另配器官 GLB。
 * 2. 曾评估 Open Anatomy Studio 的 `public/models/*.glb`，实测其内容为**局部解剖参照**
 *    （brain.glb 仅含嗅球与视交叉；heart.glb 仅含二尖瓣与主动脉瓣；spleen.glb 仅含
 *    脾结肠面），不足以作为「完整器官」展示，故决定不采用，避免科学误导。
 *    该评估记录见 `docs/REFERENCE_ADOPTION.md`。
 */

export interface RegionNote {
  title: string;
  text: string;
  sourceIds: string[];
}

/** 器官的区域说明（文字注解，不与模型做逐点配准，界面会显式标注「区域说明」） */
export const ORGAN_REGION_NOTES: Record<string, RegionNote[]> = {
  brain: [
    { title: '端脑（大脑）', text: '承担感觉整合、随意运动、语言与高级认知。表面沟回增大了皮层面积。', sourceIds: ['S06'] },
    { title: '小脑', text: '位于脑的后下方，参与运动协调、精细动作与平衡。', sourceIds: ['S06'] },
    { title: '脑干', text: '连接脑与脊髓，含调节呼吸、心率与觉醒的生命中枢。', sourceIds: ['S06'] },
  ],
  heart: [
    { title: '心房', text: '接收回心血液：右心房收体循环回流血，左心房收肺循环回流血。', sourceIds: ['S03'] },
    { title: '心室', text: '泵出血液：右心室把血送入肺，左心室把血送往全身；左心室壁更厚。', sourceIds: ['S03'] },
    { title: '瓣膜', text: '房室瓣与半月瓣在压力变化时开闭，保证血液单向流动、防止倒流。', sourceIds: ['S03'] },
    { title: '冠状动脉', text: '为心肌自身供血的血管；心肌需要持续供氧才能维持泵血。', sourceIds: ['S07'] },
  ],
  spleen: [
    { title: '位置与被膜', text: '位于左上腹、胃的后外侧，受肋骨保护，表面包被致密结缔组织被膜。', sourceIds: ['S05'] },
    { title: '白髓与红髓', text: '白髓参与免疫应答，红髓参与血液过滤与衰老红细胞的处理。', sourceIds: ['S05'] },
    { title: '脾门', text: '脾动脉、脾静脉与淋巴管出入脾脏的门户。', sourceIds: ['S05'] },
  ],
};

/** 组织层级（tissue）：BodyDay 说明「细胞如何组成组织」，但不单独渲染体渲染 */
export const TISSUE_NOTES: RegionNote[] = [
  {
    title: '神经组织',
    text: '由神经元与神经胶质细胞构成。神经元负责信号传导，胶质细胞承担支持、绝缘与代谢调节。',
    sourceIds: ['S01', 'S02'],
  },
  {
    title: '血液（液态组织）',
    text: '血液由血浆与血细胞（红细胞、白细胞、血小板）组成，是循环系统运输的载体。',
    sourceIds: ['S04'],
  },
  {
    title: '淋巴组织',
    text: '淋巴组织是免疫细胞聚集与应答的结构基础，脾脏与淋巴结属于其中的器官化结构。',
    sourceIds: ['S05'],
  },
];

export const ATLAS_ATTRIBUTION_TEXT =
  '人体解剖模型：Z-Anatomy（CC BY-SA 4.0），来自 Vanatome Human Atlas 1.4.0 的整具人体资源（curated-full-body），运行时由本作品自建的三维舞台加载。';

export function getRegionNotes(organEntityId: string | null | undefined): RegionNote[] {
  if (!organEntityId) return [];
  return ORGAN_REGION_NOTES[organEntityId] ?? [];
}
