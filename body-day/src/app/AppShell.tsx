import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStartupState } from './AppProviders';
import { resolveView, type ViewKind } from './resolveView';
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
 * 只有舞台内容随路由变化。顶栏是五项层级导航（身体 / 系统 / 器官 / 细胞 / 关于），
 * 与路由双向同步，支持浏览器前进后退与刷新直达；
 * 结构选择本身仍然交给中间那具真实人体（点模型，而不是翻目录）。
 *
 * 启动闸门开启时，整个外壳是 `inert` 的：封面之下三维场景照常加载与渲染，
 * 但用户点击「进入探索」之前无法聚焦、点击或读屏任何内部组件。
 */

/**
 * 三项主导航：人体探索 / 器官详解 / 关于。
 *
 * 每一项都落到**真实存在**的路由（官方 10–20 个可直达页面要求）：
 * 人体探索即人体工作台；器官详解进入一个已核实几何真实存在的器官；
 * 关于是方法页。封面 `#/` 由左上角 BodyDay 回到 `#/explore`（不是另一具人体首页）。
 * 取消原有的五项目录与任何模式切换。
 */
const NAV: { label: string; to: string; kinds: ViewKind[] }[] = [
  { label: '人体探索', to: ROUTES.explore, kinds: ['body'] },
  { label: '器官详解', to: ROUTES.detail('heart'), kinds: ['detail'] },
  { label: '关于', to: ROUTES.about, kinds: ['about'] },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { phase, gateActive } = useStartupState();

  const view = useMemo(() => resolveView(location.pathname), [location.pathname]);

  useEffect(() => {
    if (view.kind === 'notfound') navigate(ROUTES.cover, { replace: true });
  }, [view.kind, navigate]);

  /* 点击「进入探索」之后落到人体工作台（`#/explore`），入口本身不再留在地址栏里 */
  useEffect(() => {
    if (gateActive && phase === 'exploring' && view.kind === 'cover') {
      navigate(ROUTES.explore, { replace: true });
    }
  }, [gateActive, phase, view.kind, navigate]);

  /* 统一路由过渡：只淡入一层主体，不再对多张纸张做 clipPath 动画 */
  const mainRef = useRef<HTMLElement>(null);
  const lastKey = useRef('');
  useEffect(() => {
    if (lastKey.current === view.path) return;
    const isFirst = lastKey.current === '';
    lastKey.current = view.path;
    const surface = mainRef.current;
    if (isFirst || prefersReducedMotion() || !surface) return;
    surface.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
  }, [view.path]);

  const blocked = gateActive && phase !== 'exploring';
  const showCover = blocked;

  return (
    <>
      <div className="bd-shell" inert={blocked} aria-hidden={blocked}>
        <header className="bd-header">
          <div className="bd-header__inner">
            <Link className="bd-wordmark" to={ROUTES.explore} aria-label="BodyDay 人体探索">
              BodyDay
              <span className="bd-wordmark__sub">身体的一天</span>
            </Link>

            <span className="bd-header__spacer" />

            <nav className="bd-nav" aria-label="全局">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  className="bd-nav__item"
                  data-active={item.kinds.includes(view.kind)}
                  to={item.to}
                >
                  {item.label}
                </Link>
              ))}
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
                    <Link className="bd-button bd-button--primary" to={ROUTES.explore}>
                      回到人体探索
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
