/**
 * BodyDay 路由表与页面索引。
 *
 * 15 个可独立直达、具有实质内容的「页面」：
 *  01 /                     封面
 *  02 /guide                使用向导
 *  03 /body                 人体总览
 *  04 /systems/:systemId    人体系统（神经 / 循环 / 淋巴）
 *  05 /organ/brain          大脑探索
 *  06 /cell/neuron          神经元探索
 *  07 /lesson/neural        神经科普课
 *  08 /organ/spleen         脾脏探索
 *  09 /cell/leukocyte       白细胞探索
 *  10 /lesson/immune        免疫科普课
 *  11 /organ/heart          心脏探索
 *  12 /lesson/circulation   循环关联课
 *  13 /relations            科学关系图
 *  14 /summary              学习总结
 *  15 /about                封底 / 关于
 */
export const ROUTES = {
  cover: '/',
  guide: '/guide',
  body: '/body',
  system: (id: string) => `/systems/${id}`,
  organ: (id: string) => `/organ/${id}`,
  cell: (id: string) => `/cell/${id}`,
  lesson: (id: string) => `/lesson/${id}`,
  relations: '/relations',
  summary: '/summary',
  about: '/about',
} as const;

export interface PageIndexEntry {
  no: string;
  title: string;
  path: string;
  scale: 'body' | 'organ' | 'cell' | 'meta';
  summary: string;
}

/** 与赛事页面计数一致的可核查索引（同时用于交付文档与站内导航） */
export const PAGE_INDEX: PageIndexEntry[] = [
  { no: '01', title: '封面', path: '/', scale: 'meta', summary: '产品身份、科普目标，进入自由探索或引导教学。' },
  { no: '02', title: '使用向导', path: '/guide', scale: 'meta', summary: '操作方式、跨尺度说明、科学示意边界与免责声明。' },
  { no: '03', title: '人体总览', path: '/body', scale: 'body', summary: '可转动完整人体，系统列表与结构层级。' },
  { no: '04', title: '人体系统', path: '/systems/:systemId', scale: 'body', summary: '神经系统 / 循环系统 / 淋巴系统的结构与系统切换。' },
  { no: '05', title: '大脑探索', path: '/organ/brain', scale: 'organ', summary: '脑的体内聚焦、区域说明与进入神经元的入口。' },
  { no: '06', title: '神经元探索', path: '/cell/neuron', scale: 'cell', summary: '胞体、树突、轴突、髓鞘的部件选择与知识联动。' },
  { no: '07', title: '神经科普课', path: '/lesson/neural', scale: 'cell', summary: '引导步骤、真实模型交互、测验与反馈。' },
  { no: '08', title: '脾脏探索', path: '/organ/spleen', scale: 'organ', summary: '脾脏的体内聚焦、免疫关系与进入白细胞的入口。' },
  { no: '09', title: '白细胞探索', path: '/cell/leukocyte', scale: 'cell', summary: '细胞膜、细胞质、细胞核的部件选择与知识联动。' },
  { no: '10', title: '免疫科普课', path: '/lesson/immune', scale: 'cell', summary: '免疫防御机制引导、误解纠正与测验。' },
  { no: '11', title: '心脏探索', path: '/organ/heart', scale: 'organ', summary: '心脏的体内聚焦、四腔与瓣膜结构与循环知识入口。' },
  { no: '12', title: '循环关联课', path: '/lesson/circulation', scale: 'organ', summary: '心脏 → 血液 → 白细胞的跨器官 / 细胞导航与测验。' },
  { no: '13', title: '科学关系图', path: '/relations', scale: 'meta', summary: '器官、细胞与关系类型，可按类型筛选并回到模型。' },
  { no: '14', title: '学习总结', path: '/summary', scale: 'meta', summary: '已发现结构、课程进度、测验作答与清空记录。' },
  { no: '15', title: '封底 / 关于', path: '/about', scale: 'meta', summary: '方法、来源、版权与科学免责声明。' },
];
