import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppMode } from './AppProviders';
import { resolveView, type ViewKind } from './resolveView';
import { ROUTES } from './routes';
import { prefersReducedMotion } from '../design/motion';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ExploreWorkbench } from '../features/workbench/ExploreWorkbench';
import { AboutPage } from '../features/about/AboutPage';

/**
 * 应用外壳（稳定宿主）。
 *
 * 与 AgriScope 的「导航栏是稳定宿主，动画期间不重跑」一致：
 * 品牌区、主导航与模式开关在路由切换时不重新挂载，只有舞台内容随路由变化。
 *
 * 路由解析在这里一次性完成，且所有探索页面渲染的是**同一个工作台组件**，
 * 因此切换页面时三维场景不会被卸载重建 —— 这是「不出现先归位、再重新聚焦」的前提。
 */

const NAV_ITEMS: { label: string; to: string; kinds: ViewKind[] }[] = [
  { label: '首页', to: ROUTES.cover, kinds: ['cover'] },
  { label: '人体', to: ROUTES.body, kinds: ['body', 'system', 'organ'] },
  { label: '细胞', to: ROUTES.cell('neuron'), kinds: ['cell'] },
  { label: '关于', to: ROUTES.about, kinds: ['about'] },
];

export function AppShell() {
  const { mode, setMode } = useAppMode();
  const location = useLocation();
  const navigate = useNavigate();

  const view = useMemo(() => resolveView(location.pathname), [location.pathname]);

  useEffect(() => {
    if (view.kind === 'notfound') navigate(ROUTES.cover, { replace: true });
  }, [view.kind, navigate]);

  /* 纸张式页面过渡：只作用于两侧纸条，不动中央舞台 */
  const mainRef = useRef<HTMLElement>(null);
  const lastKey = useRef('');
  useEffect(() => {
    if (lastKey.current === view.path) return;
    const isFirst = lastKey.current === '';
    lastKey.current = view.path;
    if (isFirst || prefersReducedMotion()) return;
    const surfaces = mainRef.current?.querySelectorAll<HTMLElement>('[data-paper-surface]');
    surfaces?.forEach((surface, index) => {
      surface.animate(
        [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
        {
          duration: 420,
          delay: index * 60,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'backwards',
        },
      );
    });
  }, [view.path]);

  const activeKind = view.kind;

  return (
    <div className="bd-shell">
      <header className="bd-header">
        <div className="bd-header__inner">
          <Link className="bd-wordmark" to={ROUTES.cover} aria-label="BodyDay 首页">
            BodyDay
            <span className="bd-wordmark__sub">身体的一天</span>
          </Link>

          <span className="bd-header__spacer" />

          <nav className="bd-nav" aria-label="主导航">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                className="bd-nav__item"
                data-active={item.kinds.includes(activeKind)}
                to={item.to}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <span className="bd-header__spacer" />

          <nav className="bd-modeswitch" aria-label="模式切换">
            <button
              type="button"
              className="bd-modeswitch__item"
              data-active={mode === 'explore'}
              aria-pressed={mode === 'explore'}
              onClick={() => setMode('explore')}
            >
              自由探索
            </button>
            <button
              type="button"
              className="bd-modeswitch__item"
              data-active={mode === 'learn'}
              aria-pressed={mode === 'learn'}
              onClick={() => setMode('learn')}
            >
              引导教学
            </button>
          </nav>
        </div>
      </header>

      <main ref={mainRef}>
        <ErrorBoundary
          fallback={(error, reset) => (
            <div className="bd-container bd-page">
              <div className="bd-state" role="alert">
                <p className="bd-state__title">页面渲染出错</p>
                <p className="bd-state__detail">
                  当前视图未能完成渲染。这不会影响其它页面，你可以重试或回到首页重新进入。
                </p>
                <div className="bd-row">
                  <button type="button" className="bd-button" onClick={reset}>
                    重试
                  </button>
                  <Link className="bd-button bd-button--primary" to={ROUTES.cover}>
                    回到首页
                  </Link>
                </div>
                <p className="bd-caption">{error.message}</p>
              </div>
            </div>
          )}
        >
          {view.kind === 'about' ? (
            <AboutPage />
          ) : view.kind === 'notfound' ? null : (
            <ExploreWorkbench view={view} />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
