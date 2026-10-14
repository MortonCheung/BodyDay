import { lazy } from 'react';

/**
 * 三维舞台的按需加载入口。
 *
 * 目的很直接：封面、向导、关系图、学习总结、关于这些页面**不需要** three.js。
 * 把三维运行时做成独立分块，只有真正进入三维页面时才下载它，
 * 首屏不承担这部分体积。
 */
export const AtlasStage = lazy(() =>
  import('./AtlasStage').then((m) => ({ default: m.AtlasStage })),
);

export const CellStage = lazy(() =>
  import('./CellStage').then((m) => ({ default: m.CellStage })),
);
