import { useState } from 'react';

/**
 * 三维选中状态的轻量模块。
 *
 * 与 `AtlasStage.tsx` 分开，是为了让页面可以在**不引入 three.js 运行时**的前提下
 * 使用这个 Hook 与类型 —— 三维舞台本身通过 `React.lazy` 按需加载。
 */
export interface StructureSelection {
  structureId: string;
  /** 能映射到 BodyDay 实体时才有值；否则为 null，界面应显示真实结构名并说明暂无科普卡片 */
  entityId: string | null;
  name: string;
  kind?: string;
  system: string;
}

export function useAtlasSelection(initial: string | null = null) {
  const [structureId, setStructureId] = useState<string | null>(initial);
  const [info, setInfo] = useState<StructureSelection | null>(null);
  return { structureId, setStructureId, info, setInfo };
}
