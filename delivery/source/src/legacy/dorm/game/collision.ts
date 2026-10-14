import { PLAYER_BOUNDS, player } from './state';

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };

/** 场景内不可穿越的矩形（XZ 平面，世界坐标） */
export const OBSTACLES: AABB[] = [
  // 床（沿左墙）
  { minX: -2.62, maxX: -1.56, minZ: -2.24, maxZ: -0.14 },
  // 书桌（靠后墙）
  { minX: -1.54, maxX: -0.06, minZ: -2.24, maxZ: -1.42 },
  // 椅子
  { minX: -1.14, maxX: -0.46, minZ: -1.0, maxZ: -0.3 },
  // 床头柜
  { minX: -2.5, maxX: -1.78, minZ: 0.07, maxZ: 0.75 },
  // 书架（靠右墙）
  { minX: 2.1, maxX: 2.62, minZ: 0.2, maxZ: 0.99 },
  // 落地绿植
  { minX: 2.12, maxX: 2.5, minZ: -1.76, maxZ: -1.4 },
  // 衣帽架
  { minX: 1.84, maxX: 2.36, minZ: 1.5, maxZ: 2.02 },
  // 垃圾桶
  { minX: 1.6, maxX: 1.94, minZ: 1.28, maxZ: 1.62 },
];

/** 圆形玩家 vs AABB 的滑动碰撞：分轴处理，撞上后沿墙滑行 */
export function resolveCollision(x: number, z: number): { x: number; z: number } {
  const r = player.radius;

  // 房间边界
  let nx = Math.min(Math.max(x, PLAYER_BOUNDS.minX + r), PLAYER_BOUNDS.maxX - r);
  let nz = Math.min(Math.max(z, PLAYER_BOUNDS.minZ + r), PLAYER_BOUNDS.maxZ - r);

  for (const b of OBSTACLES) {
    const left = b.minX - r;
    const right = b.maxX + r;
    const back = b.minZ - r;
    const front = b.maxZ + r;
    if (nx <= left || nx >= right || nz <= back || nz >= front) continue;

    // 计算从各个面推出去的最小位移
    const pushLeft = nx - left;
    const pushRight = right - nx;
    const pushBack = nz - back;
    const pushFront = front - nz;
    const min = Math.min(pushLeft, pushRight, pushBack, pushFront);
    if (min === pushLeft) nx = left;
    else if (min === pushRight) nx = right;
    else if (min === pushBack) nz = back;
    else nz = front;
  }

  return { x: nx, z: nz };
}
