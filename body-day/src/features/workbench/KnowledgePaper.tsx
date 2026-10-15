import { Link } from 'react-router-dom';
import { KnowledgeCard, ScaleBadge } from '../../components/ui';
import {
  ENTITY_MAP,
  RELATION_TYPE_LABEL,
  type BodyEntity,
  type KnowledgeRelation,
  type Scale,
} from '../../domain';
import type { StructureInfo } from '../../services/atlas';
import { ROUTES } from '../../app/routes';
import { Clock, ScaleLine } from './paperChrome';

/**
 * 右纸条：知识内容。
 *
 * V2 的克制原则：纸条只回答「这一层是什么、跟什么有关系、还能往哪走」。
 * 文献编号、来源清单、署名与许可长文不在这里展开，统一收进「关于 · 数据与方法」，
 * 避免把解剖知识读成一张数据表。
 */

export interface AscendLink {
  to: string;
  label: string;
  note: string;
}

export interface DrillLink {
  to: string;
  label: string;
  note: string;
}

interface KnowledgePaperProps {
  scale: Scale;
  onNavigateScale: (scale: Scale) => void;
  /** 页面主体：人体 / 系统 / 器官 / 细胞 */
  entity?: BodyEntity;
  /** 当前选中的真实结构（来自三维点选） */
  selection?: StructureInfo | null;
  /** 选中结构映射到的领域实体（若已登记且不是本页主体） */
  selectedEntity?: BodyEntity;
  /** 选中的结构属于本页主体时（如在大脑页点到某个脑区）的如实说明 */
  localSelection?: { name: string; partName: string | null; system: string | null } | null;
  /** 选中项（或本页主体）的跨尺度与功能关系 */
  relations: KnowledgeRelation[];
  /** 可以继续深入的页面 */
  drill: DrillLink[];
  /** 返回更大尺度 */
  ascend: AscendLink | null;
  /** 极简层级索引：保证有专题内容的页面之间不会互相成为孤页 */
  quickLinks: { label: string; to: string; active: boolean }[];
  subjectLabel: string;
  /** 未选中任何结构时的提示语（人体层与细胞层措辞不同） */
  emptyHint: string;
  onClearSelection: () => void;
  canGoBack: boolean;
  onBack: () => void;
  sheetOpen: boolean;
  onToggleSheet: () => void;
}

export function KnowledgePaper({
  scale,
  onNavigateScale,
  entity,
  selection,
  selectedEntity,
  localSelection,
  relations,
  drill,
  ascend,
  quickLinks,
  subjectLabel,
  emptyHint,
  onClearSelection,
  canGoBack,
  onBack,
  sheetOpen,
  onToggleSheet,
}: KnowledgePaperProps) {
  return (
    <aside
      className="bd-wb-paper"
      aria-label="知识纸条"
      data-paper-surface
      data-sheet={sheetOpen ? 'open' : 'closed'}
    >
      <div className="bd-wb-sheethead">
        <div className="bd-wb-head">
          <div className="bd-wb-head__row">
            <ScaleBadge scale={scale} />
            <Clock />
          </div>
          <ScaleLine scale={scale} onNavigate={onNavigateScale} />
          {quickLinks.length > 0 ? (
            <p className="bd-wb-index">
              <span className="bd-label">层级</span>
              {quickLinks.map((item) => (
                <Link
                  key={item.to}
                  className="bd-wb-index__item"
                  data-active={item.active}
                  to={item.to}
                >
                  {item.label}
                </Link>
              ))}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="bd-wb-sheetclose bd-mobile-only"
          onClick={onToggleSheet}
        >
          收起
        </button>
      </div>

      <section className="bd-wb-section" aria-label="当前选中">
        <div className="bd-wb-section__head">
          <span className="bd-label">当前选中</span>
          {canGoBack ? (
            <button type="button" className="bd-chip" onClick={onBack}>
              返回上一级
            </button>
          ) : null}
        </div>

        {selectedEntity ? (
          <>
            <KnowledgeCard entity={selectedEntity} showSources={false} />
            <p className="bd-wb-note">
              {selection?.partName
                ? `你点到的是「${selection.partName}」，它归属${selectedEntity.nameZh}。`
                : `当前结构：${selectedEntity.nameZh}。`}
            </p>
            <div className="bd-wb-actions">
              <button type="button" className="bd-button bd-button--sm" onClick={onClearSelection}>
                取消选中
              </button>
            </div>
          </>
        ) : localSelection ? (
          <>
            <div className="bd-panel bd-panel--flat">
              <p className="bd-title" style={{ fontSize: 'var(--bd-fs-small)' }}>
                {localSelection.partName ?? localSelection.name}
              </p>
              <p className="bd-caption" style={{ marginTop: 4 }}>
                {localSelection.system ?? '（系统未标注）'} · 归属于{entity?.nameZh ?? '本页主体'}
              </p>
              <p className="bd-body-secondary" style={{ marginTop: 8 }}>
                BodyDay 只为这个结构整体建立了科普卡片。这是一块真实存在的局部结构，
                不为它单独编写内容，也不拿别的结构代替。
              </p>
            </div>
            <div className="bd-wb-actions">
              <button type="button" className="bd-button bd-button--sm" onClick={onClearSelection}>
                取消选中
              </button>
            </div>
          </>
        ) : selection ? (
          <>
            <div className="bd-panel bd-panel--flat">
              <p className="bd-title" style={{ fontSize: 'var(--bd-fs-small)' }}>
                {selection.name ?? '未命名结构'}
              </p>
              <p className="bd-caption" style={{ marginTop: 4 }}>
                {selection.system ?? '（系统未标注）'}
                {selection.partName ? ` · 其中局部结构：${selection.partName}` : ''}
              </p>
              <p className="bd-body-secondary" style={{ marginTop: 8 }}>
                这是模型里真实存在的解剖结构，BodyDay 还没有为它建立独立的科普卡片。
                这里不编造内容，也不拿别的结构代替。
              </p>
            </div>
            <div className="bd-wb-actions">
              <button type="button" className="bd-button bd-button--sm" onClick={onClearSelection}>
                取消选中
              </button>
            </div>
          </>
        ) : (
          <p className="bd-wb-empty">{emptyHint}</p>
        )}
      </section>

      {entity ? (
        <section className="bd-wb-section" aria-label={subjectLabel}>
          <span className="bd-label">{subjectLabel}</span>
          <KnowledgeCard entity={entity} showSources={false} />
        </section>
      ) : null}

      {relations.length > 0 ? (
        <section className="bd-wb-section" aria-label="与其它结构的关系">
          <span className="bd-label">与其它结构的关系</span>
          {relations.map((relation) => {
            const from = ENTITY_MAP[relation.fromId];
            const to = ENTITY_MAP[relation.toId];
            return (
              <div key={relation.id} className="bd-rel">
                <div className="bd-rel__pair">
                  <span>{from?.nameZh ?? relation.fromId}</span>
                  <span className="bd-rel__arrow" aria-hidden="true">
                    →
                  </span>
                  <span>{to?.nameZh ?? relation.toId}</span>
                </div>
                <span className="bd-rel__type" data-type={relation.relationType}>
                  {RELATION_TYPE_LABEL[relation.relationType]}
                </span>
                <p className="bd-body-secondary">{relation.description}</p>
              </div>
            );
          })}
        </section>
      ) : null}

      {drill.length > 0 || ascend ? (
        <section className="bd-wb-section" aria-label="跨尺度导航">
          <span className="bd-label">跨尺度导航</span>
          {drill.length > 0 ? (
            <div className="bd-stack bd-stack--tight">
              {drill.map((item) => (
                <div key={`${item.to}-${item.label}`} className="bd-drill">
                  <Link className="bd-button bd-button--sm bd-button--primary" to={item.to}>
                    {item.label}
                  </Link>
                  <span className="bd-wb-note">{item.note}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="bd-wb-note">
              当前结构没有更小尺度的独立模型；BodyDay 不会用不相关的模型顶替。
            </p>
          )}
          {ascend ? (
            <div className="bd-wb-actions">
              <Link className="bd-button bd-button--sm" to={ascend.to}>
                {ascend.label}
              </Link>
            </div>
          ) : null}
          {ascend ? <p className="bd-wb-note">{ascend.note}</p> : null}
        </section>
      ) : null}

      <section className="bd-wb-section">
        <span className="bd-label">科学边界</span>
        <p className="bd-wb-note">
          {entity?.scaleNote ?? '三维模型用于说明结构与位置关系，不代表真实比例与病理变化。'}
          {' '}
          完整的来源表、模型署名与许可写在
          <Link to={ROUTES.about}>「关于 · 数据与方法」</Link>。
        </p>
      </section>
    </aside>
  );
}
