import { ENTITY_MAP, SYSTEM_MAP } from '../domain';
import type { Scale } from '../domain';

/**
 * BodyDay 路由表与页面索引。
 *
 * 产品形态是一个「空间工作台」：中央始终是**真实的三维人体**。
 * 结构的选择完全交给模型（点选、聚焦、隔离、拆解），
 * 页面的差别只是镜头与右纸条随选中连续变化，而不是换一套外壳。
 *
 * 可独立直达、具有实质内容与独立交互的「页面」共 11 个（含首页与关于）：
 *  01 /                              首页 · 启动封面 + 完整人体
 *  02 /body                          人体总览（不经封面，可直接深链）
 *  03 /systems/nervous-system        神经系统
 *  04 /systems/cardiovascular-system 循环系统
 *  05 /systems/lymphatic-system      淋巴系统
 *  06 /organ/brain                   大脑
 *  07 /organ/heart                   心脏
 *  08 /organ/spleen                  脾脏
 *  09 /cell/neuron                   神经元
 *  10 /cell/leukocyte                白细胞
 *  11 /about                         关于 · 数据与方法
 */
export const ROUTES = {
  cover: '/',
  body: '/body',
  system: (id: string) => `/systems/${id}`,
  organ: (id: string) => `/organ/${id}`,
  cell: (id: string) => `/cell/${id}`,
  about: '/about',
} as const;

export interface PageIndexEntry {
  no: string;
  title: string;
  path: string;
  scale: Scale;
  summary: string;
}

/** 与赛事页面计数一致的可核查索引（同时用于交付文档与站内导航） */
export const PAGE_INDEX: PageIndexEntry[] = [
  { no: '01', title: '首页 · 启动封面与完整人体', path: '/', scale: 'body', summary: '第一帧即开始加载真实三维人体；模型真正就绪后由用户点击「进入探索」。进入后呈现完整人体，可转动、点选与逐层拆解。' },
  { no: '02', title: '人体总览', path: '/body', scale: 'body', summary: '完整人体总览，不经封面可直接深链进入；点选任一结构即高亮并聚焦，右栏换成该结构的知识。' },
  { no: '03', title: '神经系统', path: '/systems/nervous-system', scale: 'system', summary: '人体中只显示神经系统，点选其中任一结构即可聚焦并查看知识。' },
  { no: '04', title: '循环系统', path: '/systems/cardiovascular-system', scale: 'system', summary: '人体中只显示循环系统，真实结构可逐个点选。' },
  { no: '05', title: '淋巴系统', path: '/systems/lymphatic-system', scale: 'system', summary: '人体中只显示淋巴系统，真实结构可逐个点选。' },
  { no: '06', title: '大脑', path: '/organ/brain', scale: 'organ', summary: '镜头聚焦大脑并隐去其它结构；右栏给出脑的知识、健康关联，以及进入神经元的真实链路。' },
  { no: '07', title: '心脏', path: '/organ/heart', scale: 'organ', summary: '镜头聚焦心脏；说明四腔、瓣膜与循环功能，并澄清白细胞只是流经而非在此生成。' },
  { no: '08', title: '脾脏', path: '/organ/spleen', scale: 'organ', summary: '镜头聚焦脾脏；说明淋巴器官的免疫角色与血液过滤功能，并可进入白细胞。' },
  { no: '09', title: '神经元', path: '/cell/neuron', scale: 'cell', summary: '在细胞层查看胞体、树突、轴突与髓鞘，点选部件联动知识。' },
  { no: '10', title: '白细胞', path: '/cell/leukocyte', scale: 'cell', summary: '在细胞层查看细胞膜、细胞质与细胞核，澄清白细胞的生成与到达方式。' },
  { no: '11', title: '关于 · 数据与方法', path: '/about', scale: 'body', summary: '作品定位、数据来源、科学方法、模型与许可、科学示意边界说明，以及全部页面的可核查索引。' },
];

/** 实体 → 可直达的页面路径（用于跨尺度跳转与引导步骤定位） */
export function routeForEntity(entityId: string | null | undefined): string | null {
  if (!entityId) return null;
  const entity = ENTITY_MAP[entityId];
  if (!entity) return null;

  if (entity.kind === 'body') return ROUTES.body;
  if (entity.kind === 'system') {
    return SYSTEM_MAP[entity.id] ? ROUTES.system(entity.id) : ROUTES.body;
  }
  if (entity.kind === 'organ') {
    return ENTITY_MAP[entity.id]?.atlasStructureId ? ROUTES.organ(entity.id) : ROUTES.body;
  }
  if (entity.kind === 'cell') return ROUTES.cell(entity.id);
  // 细胞部件：回到它所属的细胞
  if (entity.kind === 'organelle' && entity.parentId) {
    const parent = ENTITY_MAP[entity.parentId];
    if (parent?.kind === 'cell') return ROUTES.cell(parent.id);
  }
  return ROUTES.body;
}
