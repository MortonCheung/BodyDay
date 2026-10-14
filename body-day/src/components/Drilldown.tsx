import { useScaleVeil } from '../app/AppProviders';
import type { Scale } from '../domain';

/**
 * 跨尺度跳转按钮。
 *
 * 所有「进入更小尺度」的动作都必须经由它：
 * 它会先显示尺度轴遮罩，明确告诉用户「尺度变了、模型换了」，
 * 再切换到目标页面。这样不会让人误以为是一个模型连续放大。
 */
export function DrilldownButton({
  toPath,
  from,
  to,
  caption,
  label,
  variant = 'primary',
}: {
  toPath: string;
  from: Scale;
  to: Scale;
  caption: string;
  label: string;
  variant?: 'primary' | 'default';
}) {
  const veil = useScaleVeil();
  return (
    <button
      type="button"
      className={`bd-button${variant === 'primary' ? ' bd-button--primary' : ''}`}
      onClick={() => veil.run(toPath, { from, to, caption })}
    >
      {label}
    </button>
  );
}

/** 返回更大尺度（同样带尺度交代，方向相反） */
export function AscendButton({
  toPath,
  from,
  to,
  caption,
  label,
}: {
  toPath: string;
  from: Scale;
  to: Scale;
  caption: string;
  label: string;
}) {
  return (
    <DrilldownButton
      toPath={toPath}
      from={from}
      to={to}
      caption={caption}
      label={label}
      variant="default"
    />
  );
}
