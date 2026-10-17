import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SCALE_MAP, getSource, type BodyEntity, type Scale } from '../domain';

/* ---------------- 面包屑：始终显示当前尺度与上级路径 ---------------- */

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="bd-breadcrumbs" aria-label="当前位置">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {index > 0 ? <span className="bd-breadcrumbs__sep" aria-hidden="true">/</span> : null}
          {item.to ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span className="bd-breadcrumbs__current" aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ---------------- 尺度徽标 ---------------- */

export function ScaleBadge({ scale }: { scale: Scale }) {
  const def = SCALE_MAP[scale];
  return (
    <span className="bd-scale" data-scale={scale}>
      <span className="bd-scale__dot" aria-hidden="true" />
      {def?.labelZh ?? scale}
      <span className="bd-caption" style={{ textTransform: 'none', letterSpacing: 0 }}>
        {def?.note}
      </span>
    </span>
  );
}

/* ---------------- 页头 ---------------- */

export function PageHeader({
  eyebrow,
  title,
  lead,
  scale,
  crumbs,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  scale?: Scale;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <header className="bd-stack bd-stack--tight">
      {crumbs ? <Breadcrumbs items={crumbs} /> : null}
      <div className="bd-spread" style={{ alignItems: 'flex-end' }}>
        <div className="bd-stack bd-stack--tight" style={{ maxWidth: '62ch' }}>
          {eyebrow ? <span className="bd-label">{eyebrow}</span> : null}
          <h1 className="bd-hero">{title}</h1>
          {lead ? <p className="bd-lead">{lead}</p> : null}
        </div>
        <div className="bd-row">
          {scale ? <ScaleBadge scale={scale} /> : null}
          {actions}
        </div>
      </div>
    </header>
  );
}

/* ---------------- 知识卡 ---------------- */

export function KnowledgeCard({
  entity,
  showSources = true,
}: {
  entity: BodyEntity;
  /** 探索界面里不展开来源清单（统一收进「关于」），避免把知识读成数据表 */
  showSources?: boolean;
}) {
  const systemTone =
    entity.id === 'brain' || entity.id === 'nervous-system' || entity.id.startsWith('neuron')
      ? 'neural'
      : entity.id === 'heart' || entity.id === 'cardiovascular-system'
        ? 'vascular'
        : entity.id === 'spleen' || entity.id === 'lymphatic-system' || entity.id.startsWith('leukocyte')
          ? 'immune'
          : '';

  return (
    <article className={`bd-knowledge${systemTone ? ` bd-knowledge--${systemTone}` : ''}`}>
      <div className="bd-knowledge__head">
        <h3 className="bd-title">{entity.nameZh}</h3>
        {entity.nameEn ? <span className="bd-meta">{entity.nameEn}</span> : null}
      </div>
      <p className="bd-body-secondary">{entity.summary}</p>

      {entity.facts && entity.facts.length > 0 ? (
        <dl className="bd-knowledge__facts">
          {entity.facts.map((fact) => (
            <div className="bd-knowledge__fact" key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {entity.health && entity.health.length > 0 ? (
        <div className="bd-stack bd-stack--tight">
          <span className="bd-label">与健康的关系</span>
          {entity.health.map((h) => (
            <div className="bd-knowledge__fact" key={h.title}>
              <dt>{h.title}</dt>
              <dd>{h.text}</dd>
            </div>
          ))}
        </div>
      ) : null}

      {showSources ? <SourceList ids={entity.sources} /> : null}
    </article>
  );
}

/* ---------------- 来源列表 ---------------- */

export function SourceList({ ids, title = '知识来源' }: { ids: string[]; title?: string }) {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return null;
  return (
    <div className="bd-sources">
      <span className="bd-label">{title}</span>
      {unique.map((id) => {
        const source = getSource(id);
        if (!source) return null;
        return (
          <div className="bd-sources__item" key={id}>
            <span className="bd-sources__mark">{id}</span>
            <span>
              {source.publisher}，《{source.title}》。
              <a href={source.url} target="_blank" rel="noreferrer noopener">
                原始链接
              </a>
              <span className="bd-caption" style={{ marginLeft: 6 }}>
                访问日期 {source.accessDate}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- 提示条 ---------------- */

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'ok';
  title?: string;
  children: ReactNode;
}) {
  const color = tone === 'warn' ? 'var(--bd-warn)' : tone === 'ok' ? 'var(--bd-ok)' : 'var(--bd-ink-muted)';
  return (
    <div
      className="bd-panel bd-panel--flat"
      style={{ borderLeft: `2px solid ${color}`, paddingLeft: 'var(--bd-space-4)' }}
    >
      {title ? <p className="bd-title" style={{ fontSize: 'var(--bd-fs-small)' }}>{title}</p> : null}
      <div className="bd-body-secondary">{children}</div>
    </div>
  );
}

/* ---------------- 空状态 / 不可用 ---------------- */

export function Unavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="bd-panel bd-panel--sunken">
      <p className="bd-title" style={{ fontSize: 'var(--bd-fs-small)' }}>{title}</p>
      <p className="bd-body-secondary">{detail}</p>
    </div>
  );
}
