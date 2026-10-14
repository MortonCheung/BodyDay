import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAppMode } from './AppProviders';
import { ROUTES } from './routes';
import { ErrorBoundary } from '../components/ErrorBoundary';

/**
 * 应用外壳（稳定宿主）。
 *
 * 与 AgriScope 的「导航栏是稳定宿主，动画期间不重跑」一致：
 * 顶部品牌 / 模式切换 / 全局入口在路由切换时不重新挂载，
 * 只有舞台与内容区随路由变化。
 */
export function AppShell() {
  const { mode, setMode } = useAppMode();
  const location = useLocation();

  return (
    <div className="bd-shell">
      <header className="bd-header">
        <div className="bd-header__inner">
          <Link className="bd-wordmark" to={ROUTES.cover} aria-label="返回 BodyDay 封面">
            BodyDay
            <span className="bd-wordmark__sub">身体的一天</span>
          </Link>

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

          <span className="bd-header__spacer" />

          <div className="bd-header__actions">
            <Link className="bd-button bd-button--quiet bd-desktop-only" to={ROUTES.body}>
              人体
            </Link>
            <Link className="bd-button bd-button--quiet bd-desktop-only" to={ROUTES.relations}>
              关系图
            </Link>
            <Link className="bd-button bd-button--quiet" to={ROUTES.summary}>
              学习记录
            </Link>
            <Link className="bd-button bd-button--quiet" to={ROUTES.about}>
              关于
            </Link>
          </div>
        </div>
      </header>

      <main>
        <ErrorBoundary
          fallback={(error, reset) => (
            <div className="bd-container bd-page">
              <div className="bd-state" role="alert">
                <p className="bd-state__title">页面渲染出错</p>
                <p className="bd-state__detail">
                  当前视图未能完成渲染。这不会影响其它页面，你可以重试或回到封面重新进入。
                </p>
                <div className="bd-row">
                  <button type="button" className="bd-button" onClick={reset}>
                    重试
                  </button>
                  <Link className="bd-button bd-button--primary" to={ROUTES.cover}>
                    回到封面
                  </Link>
                </div>
                <p className="bd-caption">{error.message}</p>
              </div>
            </div>
          )}
        >
          <Outlet key={location.pathname} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
