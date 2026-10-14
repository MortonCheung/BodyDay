import { ENTITY_MAP, SYSTEM_MAP } from '../domain';
import type { Scale } from '../domain';

/**
 * BodyDay 路由表与页面索引。
 *
 * 产品形态是一个「空间工作台」：中央始终是人体三维模型，
 * 左栏是结构与图层操作，右栏是随选中联动的知识纸条。
 * 页面的差别不是换一套外壳，而是**镜头与两侧面板随选中连续变化**。
 *
 * 可独立直达、具有实质内容的「页面」共 11 个（含封面与封底），
 * 满足赛事对 H5 交互式作品「页面不少于 10 页、控制在 20 页以内」的要求：
 *  01 /                              封面 · 身体的一天
 *  02 /body                          人体总览
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
  { no: '01', title: '封面 · 身体的一天', path: '/', scale: 'body', summary: '第一帧即真实人体三维场景，欢迎语作为覆盖层；可立即转动模型并进入探索。' },
  { no: '02', title: '人体总览', path: '/body', scale: 'body', summary: '完整人体、解剖系统目录与结构树；点击人体结构，右栏知识纸条随之变化。' },
  { no: '03', title: '神经系统', path: '/systems/nervous-system', scale: 'system', summary: '在人体内单独查看神经系统，列出现实结构并可聚焦。' },
  { no: '04', title: '循环系统', path: '/systems/cardiovascular-system', scale: 'system', summary: '在人体内单独查看循环系统及其结构。' },
  { no: '05', title: '淋巴系统', path: '/systems/lymphatic-system', scale: 'system', summary: '在人体内单独查看淋巴系统及其结构。' },
  { no: '06', title: '大脑', path: '/organ/brain', scale: 'organ', summary: '镜头聚焦大脑，右栏给出脑的结构知识、健康关联与向下进入神经元的入口。' },
  { no: '07', title: '心脏', path: '/organ/heart', scale: 'organ', summary: '镜头聚焦心脏，说明四腔、瓣膜与循环功能，并澄清与白细胞的关系。' },
  { no: '08', title: '脾脏', path: '/organ/spleen', scale: 'organ', summary: '镜头聚焦脾脏，说明淋巴器官的免疫角色与血液过滤功能。' },
  { no: '09', title: '神经元', path: '/cell/neuron', scale: 'cell', summary: '在细胞层查看胞体、树突、轴突与髓鞘，点击部件联动知识。' },
  { no: '10', title: '白细胞', path: '/cell/leukocyte', scale: 'cell', summary: '在细胞层查看细胞膜、细胞质与细胞核，澄清白细胞的生成与到达方式。' },
  { no: '11', title: '关于 · 数据与方法', path: '/about', scale: 'body', summary: '作品定位、数据来源、科学方法、模型与许可、科学示意边界说明。' },
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
