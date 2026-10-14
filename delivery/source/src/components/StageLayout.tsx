import type { ReactNode } from 'react';

/**
 * 舞台页统一版面：左侧轨道（层级/结构）+ 中央舞台 + 右侧说明。
 * 移动端由 stage.css 降级为单列（舞台优先）。
 */
export function StageLayout({
  header,
  rail,
  stage,
  info,
  footer,
}: {
  header: ReactNode;
  rail: ReactNode;
  stage: ReactNode;
  info: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="bd-container bd-container--wide bd-page">
      {header}
      <div className="bd-stage-page">
        <aside className="bd-stage-page__rail">{rail}</aside>
        <section aria-label="三维舞台">{stage}</section>
        <aside className="bd-stage-page__info">{info}</aside>
      </div>
      {footer ? <div style={{ marginTop: 'var(--bd-space-8)' }}>{footer}</div> : null}
    </div>
  );
}
