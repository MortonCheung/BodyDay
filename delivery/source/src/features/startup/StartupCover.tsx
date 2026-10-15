import { useEffect, useRef, useState } from 'react';
import { useStartupActions, useStartupState } from '../../app/AppProviders';
import { FULL_BODY_MODEL_SIZE_HINT } from '../../three/lazyStages';
import './startup.css';

/**
 * 启动封面。
 *
 * 入口规定：**完整独立封面 → 模型真正就绪 → 用户手动点击「进入探索」**。
 * 封面之下三维场景其实已经在真实渲染（就绪判定依赖有效帧），但封面不透明，
 * 在用户点击之前既看不到、也操作不了内部任何组件（由 AppShell 的 `inert` 保证）。
 */

/** 超过这个时长仍未就绪，给出网络提示与重新加载入口，避免用户干等 */
const SLOW_LOAD_HINT_MS = 45_000;

export function StartupCover() {
  const { phase, loaded, total, ratio } = useStartupState();
  const { enter } = useStartupActions();
  const enterRef = useRef<HTMLButtonElement>(null);
  const [slow, setSlow] = useState(false);

  const ready = phase === 'ready-to-enter' || phase === 'entering';
  const entering = phase === 'entering';

  useEffect(() => {
    if (ready) return undefined;
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  /* 就绪后把焦点交给「进入探索」，键盘与读屏用户不必自己寻找入口 */
  useEffect(() => {
    if (phase === 'ready-to-enter') enterRef.current?.focus();
  }, [phase]);

  const downloadedMb = (loaded / 1_000_000).toFixed(1);
  const totalMb = total > 0 ? (total / 1_000_000).toFixed(1) : FULL_BODY_MODEL_SIZE_HINT;

  return (
    <div className="bd-cover" data-state={entering ? 'entering' : ready ? 'ready' : 'loading'}>
      <div className="bd-cover__inner">
        <p className="bd-cover__wordmark">BodyDay</p>
        <p className="bd-cover__sub">身体的一天 · 跨尺度人体科普</p>
        <hr className="bd-cover__rule" />

        <div className="bd-cover__status">
          {ready ? (
            <>
              <p className="bd-cover__label">三维人体已就绪</p>
              <button
                type="button"
                ref={enterRef}
                className="bd-cover__enter"
                disabled={entering}
                onClick={enter}
              >
                进入探索
              </button>
              <p className="bd-cover__note">
                进入后可以转动这具人体、点击任意结构，或把它整个拆开，一层一层往里看。
              </p>
            </>
          ) : (
            <>
              <p className="bd-cover__label" role="status" aria-live="polite">
                正在准备三维人体
              </p>
              <div className="bd-cover__track" aria-hidden="true">
                <div
                  className="bd-cover__bar"
                  style={{ transform: `scaleX(${Math.max(ratio, 0.02)})` }}
                />
              </div>
              <p className="bd-cover__note">
                真实资产 {totalMb} MB · 已加载 {downloadedMb} MB
                {slow ? ' · 加载时间偏长，请检查网络后重新加载' : ''}
              </p>
              {slow ? (
                <button
                  type="button"
                  className="bd-button bd-button--sm"
                  onClick={() => window.location.reload()}
                >
                  重新加载
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <p className="bd-cover__foot">
        人体解剖模型：Z-Anatomy（CC BY-SA 4.0）· 完整来源与许可写在「关于」
      </p>
    </div>
  );
}
