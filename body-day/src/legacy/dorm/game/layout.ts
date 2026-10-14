import { ROOM } from './state';

/**
 * 寝室平面布局（单位：米，世界坐标 XZ 平面，Y 为高度）。
 * 所有结构件与家具都从这里的常量取值，避免摆放漂移。
 *
 * 房间：x ∈ [-2.6, 2.6]，z ∈ [-2.2, 2.2]，层高 2.75，墙厚 0.12。
 * 相机默认位于 +x / +z 方向的斜上方，因此"远墙"是后墙(z-)与左墙(x-)，
 * 两扇门都安排在远墙上，保证一眼能看到。
 */
export const LAYOUT = {
  /** 后墙上的窗户 */
  window: { x0: 0.2, x1: 1.3, y0: 0.95, y1: 2.1, cx: 0.75, cy: 1.525, w: 1.1, h: 1.15 },
  /** 后墙上的出口门 */
  doorExit: { x0: 1.5, x1: 2.4, cx: 1.95, w: 0.9, h: 2.05 },
  /** 左墙上的卫生间门 */
  doorBath: { z0: 0.67, z1: 1.53, cz: 1.1, w: 0.86, h: 2.05 },

  /** 床（沿左墙，床头朝后） */
  bed: { cx: -2.08, cz: -1.18, rotY: 0, scale: 1.72 },
  /** 书桌（靠后墙，面向房间） */
  desk: { cx: -0.8, cz: -1.81, rotY: 0, scale: 1.9 },
  /** 椅子 */
  chair: { cx: -0.8, cz: -1.12, rotY: Math.PI, scale: 1.55 },
  /** 床头柜 */
  nightstand: { cx: -2.15, cz: 0.41, rotY: Math.PI / 2, scale: 1.2 },
  /** 书架（靠右墙） */
  bookcase: { cx: 2.36, cz: 0.59, rotY: -Math.PI / 2, scale: 1.8 },
  /** 地毯 */
  rug: { cx: 0.45, cz: 0.35, rotY: -0.18, scale: 1.18 },
  /** 卫生间门口地垫 */
  bathMat: { cx: -2.26, cz: 1.1, rotY: Math.PI / 2, scale: 1.6 },
  /** 出口门口地垫 */
  exitMat: { cx: 1.95, cz: -1.86, rotY: 0, scale: 1.6 },
  /** 落地绿植（右后角） */
  plant: { cx: 2.3, cz: -1.58, rotY: 0.5, scale: 1.45 },
  /** 衣帽架（右前角） */
  coatRack: { cx: 2.1, cz: 1.76, rotY: -0.5, scale: 1.9 },
  /** 垃圾桶 */
  trash: { cx: 1.77, cz: 1.45, rotY: 0, scale: 1.3 },

  /** 桌面物体的高度基准（桌面板顶部） */
  deskTopY: 0.72,
} as const;

/** 交互点（近距离提示 + E 键） */
export const INTERACT_POINTS = [
  {
    id: 'bathroom',
    label: '卫生间门',
    x: -2.28,
    z: LAYOUT.doorBath.cz,
    radius: 0.95,
  },
  {
    id: 'exit',
    label: '寝室出口',
    x: LAYOUT.doorExit.cx,
    z: -1.92,
    radius: 0.95,
  },
] as const;

export type InteractId = (typeof INTERACT_POINTS)[number]['id'];

export const OUTER = {
  x: ROOM.maxX + ROOM.wallThickness,
  z: ROOM.maxZ + ROOM.wallThickness,
  innerX: ROOM.minX - ROOM.wallThickness,
  innerZ: ROOM.minZ - ROOM.wallThickness,
} as const;
