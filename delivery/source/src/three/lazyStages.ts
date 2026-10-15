import { lazy } from 'react';

/**
 * 三维舞台的按需加载入口。
 *
 * 目的很直接：封面、关于这些内容**不需要** three.js 运行时。
 * 把三维运行时做成独立分块，只有真正进入人体或细胞层时才下载它，首屏不承担这部分体积。
 */
export const FullBodyStage = lazy(() =>
  import('./FullBodyStage').then((m) => ({ default: m.FullBodyStage })),
);

export const CellStage = lazy(() =>
  import('./CellStage').then((m) => ({ default: m.CellStage })),
);

/** 供封面在等待期间提示真实资产体积（不加载 three） */
export const FULL_BODY_MODEL_SIZE_HINT = '31.8 MB';
