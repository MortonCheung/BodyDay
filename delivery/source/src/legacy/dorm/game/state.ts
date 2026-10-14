/**
 * 全局可变游戏状态：避免每帧 setState 造成 React 重渲染。
 * 所有高频数据（玩家坐标、相机角度、按键）都放在这里。
 */

export const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  arrowUp: false,
  arrowLeft: false,
  arrowDown: false,
  arrowRight: false,
  run: false,
};

/** 当前所在房间（后续剧情复用该场景时的入口） */
export const ROOM = {
  minX: -2.6,
  maxX: 2.6,
  minZ: -2.2,
  maxZ: 2.2,
  height: 2.75,
  wallThickness: 0.12,
};

export const player = {
  x: 0.35,
  z: 1.35,
  facing: Math.PI,
  /** 0~1 的行进强度，驱动走步动画 */
  moveAmount: 0,
  moving: false,
  radius: 0.27,
};

/** 相机环绕参数（围绕玩家）：斜俯视「娃娃屋」构图，一屏看清全屋与两扇门 */
export const camera = {
  yaw: 0.66,
  pitch: 0.6,
  dist: 7.8,
  minDist: 5.0,
  maxDist: 11.5,
  minPitch: 0.3,
  maxPitch: 1.15,
};

/** 玩家可行走边界（含墙厚与安全边距） */
export const PLAYER_BOUNDS = {
  minX: ROOM.minX + 0.34,
  maxX: ROOM.maxX - 0.34,
  minZ: ROOM.minZ + 0.34,
  maxZ: ROOM.maxZ - 0.34,
};

export const game = {
  mode: 'day' as 'day' | 'night',
  hint: null as string | null,
  /** 当前可交互点的 id */
  nearInteract: null as string | null,
  /** 弹窗打开时冻结移动输入 */
  dialogOpen: false,
};
