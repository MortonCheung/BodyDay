import type { ScaleDefinition, SourceRecord } from './types';

/** 所有来源均在 2026-10-14 实际发起 HTTP 请求校验可达性。 */
export const ACCESS_DATE = '2026-10-14';

export const SOURCES: SourceRecord[] = [
  {
    id: 'S01',
    publisher: 'OpenStax（莱斯大学）',
    title: 'Anatomy and Physiology 2e · 12.2 Nervous Tissue',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/12-2-nervous-tissue',
    accessDate: ACCESS_DATE,
    license: 'CC BY 4.0',
    scope: '神经元的形态（胞体、树突、轴突）与电信号传导的基本机制；不含临床诊疗建议。',
  },
  {
    id: 'S02',
    publisher: 'OpenStax（莱斯大学）',
    title: 'Anatomy and Physiology 2e · 12.1 Basic Structure and Function of the Nervous System',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/12-1-basic-structure-and-function-of-the-nervous-system',
    accessDate: ACCESS_DATE,
    license: 'CC BY 4.0',
    scope: '中枢神经系统与周围神经系统的组织层级；支持「脑由神经组织构成」的说法。',
  },
  {
    id: 'S03',
    publisher: 'OpenStax（莱斯大学）',
    title: 'Anatomy and Physiology 2e · 19.1 Heart Anatomy',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy',
    accessDate: ACCESS_DATE,
    license: 'CC BY 4.0',
    scope: '心脏的腔室、瓣膜与泵血路径；支持「心脏是循环动力器官」。',
  },
  {
    id: 'S04',
    publisher: 'OpenStax（莱斯大学）',
    title: 'Anatomy and Physiology 2e · 18.1 An Overview of Blood',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/18-1-an-overview-of-blood',
    accessDate: ACCESS_DATE,
    license: 'CC BY 4.0',
    scope: '血液成分（血浆、红细胞、白细胞、血小板）与运输功能；支持「白细胞随血液运输」。',
  },
  {
    id: 'S05',
    publisher: 'OpenStax（莱斯大学）',
    title: 'Anatomy and Physiology 2e · 21.1 Anatomy of the Lymphatic and Immune Systems',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/21-1-anatomy-of-the-lymphatic-and-immune-systems',
    accessDate: ACCESS_DATE,
    license: 'CC BY 4.0',
    scope: '淋巴系统器官（含脾脏）与免疫系统结构；支持「脾脏属免疫相关器官」的说法。',
  },
  {
    id: 'S06',
    publisher: '美国国立神经疾病与卒中研究所（NINDS / NIH）',
    title: 'Brain Basics',
    url: 'https://www.ninds.nih.gov/health-information/public-education/brain-basics',
    accessDate: ACCESS_DATE,
    scope: '脑的基本分区与功能、睡眠对脑健康的作用；不含个体化诊疗建议。',
  },
  {
    id: 'S07',
    publisher: '美国国立心肺血液研究所（NHLBI / NIH）',
    title: 'Heart',
    url: 'https://www.nhlbi.nih.gov/health/heart',
    accessDate: ACCESS_DATE,
    scope: '心脏功能与循环系统健康的通用科普；支持血压/血脂相关健康行为说明。',
  },
  {
    id: 'S08',
    publisher: '美国国立心肺血液研究所（NHLBI / NIH）',
    title: 'Sleep Deprivation',
    url: 'https://www.nhlbi.nih.gov/health/sleep-deprivation',
    accessDate: ACCESS_DATE,
    scope: '睡眠不足对认知、免疫与心血管的影响；支持「规律睡眠」的健康行动建议。',
  },
  {
    id: 'S09',
    publisher: '美国国立糖尿病、消化与肾脏疾病研究所（NIDDK / NIH）',
    title: 'What Is Diabetes?',
    url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes',
    accessDate: ACCESS_DATE,
    scope: '血糖调节与胰岛素作用；仅在明确语境下讨论胰腺与免疫的关系。',
  },
  {
    id: 'S10',
    publisher: '世界卫生组织（WHO）',
    title: 'Physical activity',
    url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
    accessDate: ACCESS_DATE,
    scope: '身体活动的健康收益与推荐量；支持运动与神经、循环、免疫健康的关系。',
  },
  {
    id: 'S11',
    publisher: '世界卫生组织（WHO）',
    title: 'Healthy diet',
    url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    accessDate: ACCESS_DATE,
    scope: '均衡膳食的通用原则；支持饮食与慢性病风险的科普说明。',
  },
  {
    id: 'S12',
    publisher: '世界卫生组织（WHO）',
    title: 'Hypertension',
    url: 'https://www.who.int/news-room/fact-sheets/detail/hypertension',
    accessDate: ACCESS_DATE,
    scope: '高血压的全球负担与危险因素；支持循环系统健康行为的科普说明。',
  },
  {
    id: 'S13',
    publisher: '美国疾病控制与预防中心（CDC）',
    title: 'Physical Activity Basics',
    url: 'https://www.cdc.gov/physical-activity-basics/',
    accessDate: ACCESS_DATE,
    scope: '身体活动基础指南与分年龄建议；与 WHO 建议互为交叉核对。',
  },
  {
    id: 'S14',
    publisher: 'MedlinePlus（美国国家医学图书馆 / NIH）',
    title: 'Blood',
    url: 'https://medlineplus.gov/blood.html',
    accessDate: ACCESS_DATE,
    scope: '血液的组成与功能概述；支持白细胞的运输与防御角色说明。',
  },
  {
    id: 'S15',
    publisher: '国家卫生健康委员会',
    title: '中国公民健康素养——基本知识与技能（2024年版）',
    url: 'https://www.nhc.gov.cn/xcs/c100123/202405/73a4927142f34152abed875634a3c13b.shtml',
    accessDate: ACCESS_DATE,
    scope: '国家层面的健康素养条目，用于对齐健康生活方式、青少年健康与常见病预防方向。注：该站点对自动化访问有防护，人工浏览器可正常打开。',
  },
  {
    id: 'S16',
    publisher: 'Human Reference Atlas（HuBMAP）',
    title: '3D Reference Library',
    url: 'https://humanatlas.io/3d-reference-library',
    accessDate: ACCESS_DATE,
    license: 'CC BY 4.0',
    scope: '器官 3D 参考模型的来源与版本说明；用于 BodyDay 器官独立模型的溯源。',
  },
  {
    id: 'S17',
    publisher: 'Vanatome / Z-Anatomy',
    title: 'Vanatome Human Atlas 1.4.0（含 ASSET-LICENSE.md）',
    url: 'https://github.com/vixotic/Vanatome',
    accessDate: ACCESS_DATE,
    license: '代码 MIT / 资产 CC BY-SA 4.0（Z-Anatomy 衍生）',
    scope: '人体各系统解剖结构与层级关系；用于人体层与体内器官聚焦。',
  },
  {
    id: 'S18',
    publisher: '世界卫生组织（WHO）',
    title: 'Immunization（问答）',
    url: 'https://www.who.int/news-room/questions-and-answers/item/immunization',
    accessDate: ACCESS_DATE,
    scope: '免疫接种如何帮助身体获得免疫保护；支持「疫苗训练免疫系统」的科普说明。',
  },
  {
    id: 'S19',
    publisher: 'OpenStax（莱斯大学）',
    title: 'Anatomy and Physiology 2e · Ch. 1 Introduction（含器官系统总览）',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction',
    accessDate: ACCESS_DATE,
    license: 'CC BY 4.0',
    scope: '人体器官系统的划分与整体结构层级；用于各系统的一句话定位，不含具体临床结论。',
  },
];

export const SOURCE_MAP: Record<string, SourceRecord> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s]),
);

export function getSource(id: string): SourceRecord | undefined {
  return SOURCE_MAP[id];
}

/** 尺度轴：跨尺度导航的基准定义 */
export const SCALES: ScaleDefinition[] = [
  { id: 'body', labelZh: '人体', labelEn: 'Body', note: '完整人体，约 1.7 米尺度' },
  { id: 'system', labelZh: '系统', labelEn: 'System', note: '器官组成的解剖系统' },
  { id: 'organ', labelZh: '器官', labelEn: 'Organ', note: '厘米级器官，如脑、心、脾' },
  { id: 'tissue', labelZh: '组织', labelEn: 'Tissue', note: '由细胞与细胞间质构成' },
  { id: 'cell', labelZh: '细胞', labelEn: 'Cell', note: '微米级细胞，如神经元、白细胞' },
  { id: 'organelle', labelZh: '结构', labelEn: 'Structure', note: '细胞内部可识别结构' },
];

export const SCALE_MAP: Record<string, ScaleDefinition> = Object.fromEntries(
  SCALES.map((s) => [s.id, s]),
);
