import { useEffect, useRef, useState } from 'react';
import { useStartupActions, useStartupState } from '../../app/AppProviders';
import { FULL_BODY_MODEL_SIZE_HINT } from '../../three/lazyStages';
import './startup.css';

/**
 * 启动入口（同节点形变）。
 *
 * 入口只有一个控件，而且自始至终是**同一个 `<button>` DOM 节点**：
 * 模型加载时它是一条 240×3 的进度条，真实就绪后原地形变 148×44 的
 * 「进入探索」按钮（宽高/底色/进度填充的透明度一起过渡），
 * 形变完成之前不可点击——避免出现「3px 高的按钮已经能点」这种假就绪。
 *
 * 100% 只能由真实 ready 信号驱动；加载失败或长时间无进展时只给最小重试。
 * 版权署名与科学声明迁到「关于」页，入口画面上不出现口号、说明与页脚。
 */

/** 形变时长（与 startup.css 的 620ms 对应），形变结束后按钮才可点 */
const MORPH_MS = 640;
/** 超过这个时长仍未就绪，给出最小重试入口，避免用户干等 */
const SLOW_LOAD_HINT_MS = 45_000;

export function StartupCover() {
  const { phase, loaded, total, ratio } = useStartupState();
  const { enter } = useStartupActions();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [settled, setSettled] = useState(false);
  const [slow, setSlow] = useState(false);

  const ready = phase === 'ready-to-enter' || phase === 'entering';
  const entering = phase === 'entering';
  const clickable = settled && phase === 'ready-to-enter';

  /* 就绪 → 形变 → 形变完成才可点（时间与 CSS 过渡一致） */
  useEffect(() => {
    if (!ready) {
      setSettled(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setSettled(true), MORPH_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (ready) return undefined;
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  /* 可点后把焦点交给入口，键盘与读屏用户不必自己寻找 */
  useEffect(() => {
    if (clickable) buttonRef.current?.focus();
  }, [clickable]);

  const downloadedMb = (loaded / 1_000_000).toFixed(1);
  const totalMb = total > 0 ? (total / 1_000_000).toFixed(1) : FULL_BODY_MODEL_SIZE_HINT;

  return (
    <div className="bd-entry" data-state={entering ? 'entering' : ready ? 'ready' : 'loading'}>
      <button
        type="button"
        ref={buttonRef}
        className="bd-entry__morph"
        data-ready={ready}
        data-settled={settled}
        disabled={!clickable}
        onClick={enter}
        aria-label={clickable ? '进入探索' : '正在准备三维人体'}
      >
        <span
          className="bd-entry__fill"
          aria-hidden="true"
          style={{ transform: `scaleX(${Math.max(0, Math.min(ratio, 1))})` }}
        />
        <span className="bd-entry__label">进入探索</span>
      </button>

      {/* 进度只对读屏播报，画面上始终只有这一个控件 */}
      <p className="bd-entry__sr" role="status" aria-live="polite">
        {ready
          ? '三维人体已就绪，可以进入探索'
          : `正在准备三维人体，已加载 ${downloadedMb} MB，共 ${totalMb} MB`}
      </p>

      {slow && !ready ? (
        <div className="bd-entry__fallback">
          <span>加载时间偏长，请检查网络</span>
          <button type="button" className="bd-entry__retry" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </div>
      ) : null}
    </div>
  );
}
