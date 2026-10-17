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
 * 五项顶栏：身体 / 系统 / 器官 / 细胞 / 关于。
 *
 * 每一项都落到**真实存在**的路由（10–20 个可独立打开的页面要求），
 * 不做「首页」这类重复入口——封面 `#/` 由左上角的 BodyDay 回到。
 * 系统与器官的默认页取已有详尽科普的项（神经系统 / 大脑），不虚构专门页面。
 */
const NAV: { label: string; to: string; kinds: ViewKind[] }[] = [
  { label: '身体', to: ROUTES.body, kinds: ['body'] },
  { label: '系统', to: ROUTES.system('nervous-system'), kinds: ['system'] },
  { label: '器官', to: ROUTES.organ('brain'), kinds: ['organ'] },
  { label: '细胞', to: ROUTES.cell('neuron'), kinds: ['cell'] },
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

  /* 点击「进入探索」之后落到人体总览（`#/body`），入口本身不再留在地址栏里 */
  useEffect(() => {
    if (gateActive && phase === 'exploring' && view.kind === 'cover') {
      navigate(ROUTES.body, { replace: true });
    }
  }, [gateActive, phase, view.kind, navigate]);

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
