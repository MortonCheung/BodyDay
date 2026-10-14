/**
 * BodyDay 动效令牌。
 *
 * 只有一个判据：删掉这段动画，用户是否更难理解「我在哪一层 / 这是不是同一个对象」？
 * 若答案是否定的，它就不应该存在。
 * 三类动画服务跨尺度导航：route（进退）、camera（空间推近）、scale（换模型时的尺度交代）。
 */
export const MOTION_DURATION = {
  fast: 0.18,
  content: 0.16,
  normal: 0.28,
  slow: 0.44,
  /** 页面之间进退 */
  route: 0.42,
  /** 文字/导航下划线 hover 与 active 共用 */
  underline: 0.22,
  /** 同类选中项共享指示器移动 */
  selection: 0.32,
  /** 指针经过时轻微抬起：一次性、可中断 */
  hoverLift: 0.2,
  /** 相机在人体→器官之间的平滑推近 */
  camera: 0.82,
  /** 跨尺度换模型：遮罩 + 尺度交代 */
  scale: 0.82,
  /** 尺度遮罩淡入淡出 */
  overlay: 0.46,
  /** 开场 */
  opening: 1.8,
} as const;

export const MOTION_EASE = {
  out: [0.16, 1, 0.3, 1] as const,
  standard: [0.22, 0.61, 0.36, 1] as const,
} as const;

export const MOTION_SPRING = {
  direct: { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 },
  soft: { type: 'spring', stiffness: 300, damping: 34, mass: 1 },
} as const;

export type MotionKey = keyof typeof MOTION_DURATION;

/** prefers-reduced-motion 时降级为**瞬时**，而不是换一段更短的动画。 */
export function motionDuration(key: MotionKey, reducedMotion: boolean): number {
  return reducedMotion ? 0 : MOTION_DURATION[key];
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
