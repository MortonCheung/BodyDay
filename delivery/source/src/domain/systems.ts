import type { Scale } from './types';

/**
 * 系统层数据。
 *
 * `atlasId` 为 Vanatome atlas catalog 中**实测存在**的系统 ID；
 * `open` 表示 BodyDay 为其提供了独立专题页（器官与细胞深潜）。
 * 其余系统同样可以真实加载制作浏览，但不提供专属科普专题，
 * 避免为了「覆盖数量」编写没有来源支撑的内容。
 */

export interface SystemBrief {
  /** BodyDay 路由使用的系统 ID */
  id: string;
  /** atlas catalog 中的系统 ID */
  atlasId: string;
  nameZh: string;
  nameEn: string;
  /** bundle 是否已知（用于懒加载） */
  bundle: string;
  /** 是否提供独立专题页 */
  open: boolean;
  brief: string;
  sourceIds: string[];
}

export const SYSTEMS: SystemBrief[] = [
  {
    id: 'nervous-system',
    atlasId: 'nervous',
    nameZh: '神经系统',
    nameEn: 'Nervous system',
    bundle: 'nervous',
    open: true,
    brief:
      '由脑、脊髓与遍布全身的神经构成，负责接收、整合与传递信息。神经系统由中枢与周围两大部分组成。',
    sourceIds: ['S02', 'S19'],
  },
  {
    id: 'cardiovascular-system',
    atlasId: 'cardiovascular',
    nameZh: '循环系统',
    nameEn: 'Cardiovascular system',
    bundle: 'cardiovascular',
    open: true,
    brief:
      '由心脏、血管与血液构成，把氧气、营养物质与各类细胞运送到全身，并把代谢产物带走。',
    sourceIds: ['S03', 'S19'],
  },
  {
    id: 'lymphatic-system',
    atlasId: 'lymphatic',
    nameZh: '淋巴系统',
    nameEn: 'Lymphatic system',
    bundle: 'lymphatic',
    open: true,
    brief:
      '由淋巴管、淋巴结、脾脏等构成，参与组织间液的回收，同时是免疫系统的重要结构基础。',
    sourceIds: ['S05', 'S19'],
  },
  {
    id: 'skeletal-system',
    atlasId: 'skeletal',
    nameZh: '骨骼系统',
    nameEn: 'Skeletal system',
    bundle: 'skeletal',
    open: false,
    brief:
      '支撑身体、保护内脏器官，与肌肉共同产生运动；骨髓也是血细胞生成的重要场所。',
    sourceIds: ['S04', 'S19'],
  },
  {
    id: 'muscular-system',
    atlasId: 'muscular',
    nameZh: '肌肉系统',
    nameEn: 'Muscular system',
    bundle: 'muscular',
    open: false,
    brief:
      '通过肌肉收缩产生运动、维持姿势并参与产热。规律身体活动有助于维持肌肉功能。',
    sourceIds: ['S10', 'S19'],
  },
  {
    id: 'respiratory-system',
    atlasId: 'respiratory',
    nameZh: '呼吸系统',
    nameEn: 'Respiratory system',
    bundle: 'respiratory',
    open: false,
    brief: '负责气体交换：把氧气带入体内，并把二氧化碳排出。',
    sourceIds: ['S19'],
  },
  {
    id: 'digestive-system',
    atlasId: 'digestive',
    nameZh: '消化系统',
    nameEn: 'Digestive system',
    bundle: 'digestive',
    open: false,
    brief: '把食物分解为可吸收的营养物质，并处理不能被吸收的残渣。',
    sourceIds: ['S11', 'S19'],
  },
  {
    id: 'endocrine-system',
    atlasId: 'endocrine',
    nameZh: '内分泌系统',
    nameEn: 'Endocrine system',
    bundle: 'endocrine',
    open: false,
    brief: '通过激素调节代谢、生长与生殖等长期生理过程。血糖调节即与其中的胰岛相关。',
    sourceIds: ['S09', 'S19'],
  },
  {
    id: 'urinary-system',
    atlasId: 'urinary',
    nameZh: '泌尿系统',
    nameEn: 'Urinary system',
    bundle: 'urinary',
    open: false,
    brief: '过滤血液、生成并排出尿液，参与体液量与电解质平衡的调节。',
    sourceIds: ['S19'],
  },
  {
    id: 'reproductive-system',
    atlasId: 'reproductive',
    nameZh: '生殖系统',
    nameEn: 'Reproductive system',
    bundle: 'reproductive',
    open: false,
    brief: '与生殖相关的器官系统。BodyDay 仅作结构层面的浏览定位，不展开专题内容。',
    sourceIds: ['S19'],
  },
  {
    id: 'regional-anatomy',
    atlasId: 'regional-anatomy',
    nameZh: '体表与区域解剖',
    nameEn: 'Regional anatomy',
    bundle: 'regional-anatomy',
    open: false,
    brief: '按身体区域而非系统来观察解剖结构；BodyDay 用它提供完整人体的外轮廓参照。',
    sourceIds: ['S19'],
  },
];

export const SYSTEM_MAP: Record<string, SystemBrief> = Object.fromEntries(
  SYSTEMS.map((s) => [s.id, s]),
);

export function getSystem(id: string | null | undefined): SystemBrief | undefined {
  if (!id) return undefined;
  return SYSTEM_MAP[id];
}

export function getSystemByAtlasId(atlasId: string): SystemBrief | undefined {
  return SYSTEMS.find((s) => s.atlasId === atlasId);
}

/** 尺度轴上的定位（用于页头徽标与转场） */
export const SYSTEM_SCALE: Scale = 'system';
