import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStartupState } from './AppProviders';
import { resolveView } from './resolveView';
import { ROUTES } from './routes';
import { prefersReducedMotion } from '../design/motion';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ExploreWorkbench } from '../features/workbench/ExploreWorkbench';
import { AboutPage } from '../features/about/AboutPage';
import { StartupCover } from '../features/startup/StartupCover';

/**
 * 应用外壳（稳定宿主）。
 *
 * 与 AgriScope 的「导航栏是稳定宿主」一致：顶栏在路由切换时不重新挂载，
 * 只有舞台内容随路由变化。V2 的顶栏收敛到两条信息：左侧品牌，右侧「关于」——
 * 结构选择全部交给中间那具真实人体，不再提供页面链接栏与模式切换。
 *
 * 启动闸门开启时，整个外壳是 `inert` 的：封面之下三维场景照常加载与渲染，
 * 但用户点击「进入探索」之前无法聚焦、点击或读屏任何内部组件。
 */

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { phase, gateActive } = useStartupState();

  const view = useMemo(() => resolveView(location.pathname), [location.pathname]);

  useEffect(() => {
    if (view.kind === 'notfound') navigate(ROUTES.cover, { replace: true });
  }, [view.kind, navigate]);

  /* 纸张式页面过渡：只作用于纸条，不动中央舞台 */
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

  const blocked = gateActive && phase !== 'exploring';
  const showCover = blocked;

  return (
    <>
      <div className="bd-shell" inert={blocked} aria-hidden={blocked}>
        <header className="bd-header">
          <div className="bd-header__inner">
            <Link className="bd-wordmark" to={ROUTES.cover} aria-label="BodyDay 首页">
              BodyDay
              <span className="bd-wordmark__sub">身体的一天</span>
            </Link>

            <span className="bd-header__spacer" />

            <nav className="bd-nav" aria-label="全局">
              <Link
                className="bd-nav__item"
                data-active={view.kind === 'about'}
                to={ROUTES.about}
              >
                关于
              </Link>
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
                    <Link className="bd-button bd-button--primary" to={ROUTES.body}>
                      回到人体总览
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

      {showCover ? <StartupCover /> : null}
    </>
  );
}
