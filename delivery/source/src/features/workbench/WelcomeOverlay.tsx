import { useEffect, useState } from 'react';

/**
 * 封面欢迎层。
 *
 * 关键约束：第一帧起真实的人体三维场景就已经在渲染，这里**只是盖在上面的一层文字**，
 * 不是独立页面，也不是需要点击才能进入的入口——它 `pointer-events: none`，
 * 用户可以在它淡出之前就转动模型、点选结构。
 *
 * 退场时机：模型就绪后停留约 2.4 秒自然淡出；若模型迟迟没就绪（冷启动要下载 11MB 模型），
 * 最多 9 秒也会淡出，避免开场拖沓。全程没有「开始 / 跳过」按钮。
 */

const WELCOME_LINES = [
  '今天，从哪开始？',
  '今天，想看看身体的哪一处？',
  '从一具完整的人体开始，慢慢往里走。',
  '身体的一天，从看清结构开始。',
];

const HOLD_AFTER_READY = 2400;
const HOLD_MAX = 9000;

export function WelcomeOverlay({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(true);
  const [line] = useState(() => WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)]);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), HOLD_MAX);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    const timer = window.setTimeout(() => setOpen(false), HOLD_AFTER_READY);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    <div className="bd-welcome" data-open={open} aria-hidden={!open}>
      <span className="bd-label bd-welcome__eyebrow">BodyDay · 身体的一天</span>
      <p className="bd-display bd-welcome__title">身体的一天</p>
      <p className="bd-welcome__line">{line}</p>
      <p className="bd-welcome__hint">转动模型，或直接点选任一结构开始探索。</p>
    </div>
  );
}
