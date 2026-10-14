import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, SourceList, Notice } from '../../components/ui';
import { ROUTES } from '../../app/routes';
import {
  ENTITY_MAP,
  RELATIONS,
  RELATION_TYPE_LABEL,
  RELATION_TYPE_NOTE,
  type RelationType,
} from '../../domain';

/**
 * 13 科学关系图。
 *
 * 关键设计：**关系类型必须显式可见**。
 * 点选某个关系会带着尺度交代跳转到对应模型页；不存在「一键显示全部」的兜底。
 */

const TYPES: RelationType[] = ['part_of', 'functional', 'circulates_through', 'disease_context', 'extends_to'];

function routeFor(entityId: string): string {
  const entity = ENTITY_MAP[entityId];
  if (!entity) return ROUTES.body;
  if (entity.proceduralId) return ROUTES.cell(entity.proceduralId);
  if (entity.id === 'brain' || entity.id === 'heart' || entity.id === 'spleen') return ROUTES.organ(entity.id);
  if (entity.kind === 'system') return ROUTES.system(entity.id);
  return ROUTES.body;
}

export function RelationsPage() {
  const [active, setActive] = useState<RelationType | 'all'>('all');

  const list = useMemo(
    () => (active === 'all' ? RELATIONS : RELATIONS.filter((r) => r.relationType === active)),
    [active],
  );

  return (
    <div className="bd-container bd-container--wide bd-page">
      <div className="bd-stack bd-stack--wide">
        <PageHeader
          eyebrow="13 · 科学关系图"
          title="器官、细胞与它们之间到底是什么关系"
          lead="BodyDay 不把「器官里有这种细胞」当作默认结论。每一种关系都带有明确的语义类型，并给出依据。"
          crumbs={[{ label: '封面', to: ROUTES.cover }, { label: '科学关系图' }]}
        />

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">关系类型</span>
            <div className="bd-row" role="group" aria-label="关系类型筛选">
              <button
                type="button"
                className="bd-chip"
                aria-pressed={active === 'all'}
                onClick={() => setActive('all')}
              >
                全部（{RELATIONS.length}）
              </button>
              {TYPES.map((type) => {
                const count = RELATIONS.filter((r) => r.relationType === type).length;
                return (
                  <button
                    key={type}
                    type="button"
                    className="bd-chip"
                    aria-pressed={active === type}
                    onClick={() => setActive(type)}
                  >
                    {RELATION_TYPE_LABEL[type]}（{count}）
                  </button>
                );
              })}
            </div>
            <p className="bd-body-secondary">
              {active === 'all'
                ? '下面是作品登记的全部关系。不同类型含义完全不同：结构隶属 ≠ 功能相关 ≠ 循环输送。'
                : RELATION_TYPE_NOTE[active]}
            </p>
          </div>

          <div className="bd-graph">
            {list.map((relation) => {
              const from = ENTITY_MAP[relation.fromId];
              const to = ENTITY_MAP[relation.toId];
              if (!from || !to) return null;
              return (
                <div className="bd-rel" key={relation.id}>
                  <span className="bd-rel__type" data-type={relation.relationType}>
                    {RELATION_TYPE_LABEL[relation.relationType]}
                  </span>
                  <div className="bd-rel__pair">
                    <Link to={routeFor(from.id)}>{from.nameZh}</Link>
                    <span className="bd-rel__arrow" aria-hidden="true">→</span>
                    <Link to={routeFor(to.id)}>{to.nameZh}</Link>
                  </div>
                  <p className="bd-body-secondary">{relation.description}</p>
                  <div className="bd-row" style={{ gap: 'var(--bd-space-3)' }}>
                    <span className="bd-caption">可信度：{relation.confidence === 'high' ? '高' : '中'}</span>
                    <span className="bd-caption">复核日期：{relation.reviewedAt}</span>
                  </div>
                  <SourceList ids={relation.sourceIds} title="依据" />
                </div>
              );
            })}
          </div>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">判读规则</span>
            <h2 className="bd-section-title">为什么 BodyDay 坚持区分关系类型</h2>
          </div>
          <div className="bd-grid bd-grid--2">
            {TYPES.map((type) => (
              <div className="bd-panel bd-panel--flat" key={type}>
                <span className="bd-rel__type" data-type={type}>{RELATION_TYPE_LABEL[type]}</span>
                <p className="bd-body-secondary" style={{ marginTop: 8 }}>{RELATION_TYPE_NOTE[type]}</p>
                <p className="bd-caption">
                  示例：
                  {RELATIONS.filter((r) => r.relationType === type)
                    .slice(0, 2)
                    .map((r) => `${ENTITY_MAP[r.fromId]?.nameZh}→${ENTITY_MAP[r.toId]?.nameZh}`)
                    .join('；')}
                </p>
              </div>
            ))}
          </div>

          <Notice tone="warn" title="本作品明确拒绝的三件事">
            <ul className="bd-body-secondary" style={{ display: 'grid', gap: 8 }}>
              <li>· 不使用「所有器官 → 任意细胞」的自动兜底关系。</li>
              <li>· 不宣称心脏生成白细胞：白细胞主要在骨髓生成，心脏承担循环输送。</li>
              <li>· 不在缺少明确疾病语境时把「功能相关」写成「导致疾病」。</li>
            </ul>
          </Notice>
        </section>
      </div>
    </div>
  );
}
