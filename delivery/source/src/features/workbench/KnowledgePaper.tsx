import { Link } from 'react-router-dom';
import { KnowledgeCard } from '../../components/ui';
import { ENTITY_MAP, RELATION_TYPE_LABEL, type BodyEntity, type KnowledgeRelation } from '../../domain';
import type { StructureInfo } from '../../services/atlas';
import { ROUTES } from '../../app/routes';

/**
 * 右纸条：只负责科普。
 *
 * V2 的克制原则：这里回答三个问题——**它是什么、它如何工作、与健康有什么关系**，
 * 再加一个「继续深入」的入口。尺度轴、系统目录、时钟与来源编号都不在这里出现：
 * 它们要么属于内部数据，要么已经在「关于」页集中呈现。
 * 页面的进入方式也完全交给模型本身（点选 / 滚轮 / 返回），纸条不是导航后台。
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
  /** 页面主体：人体 / 系统 / 器官 / 细胞 */
  entity?: BodyEntity;
  /** 当前选中的真实结构（来自三维点选） */
  selection?: StructureInfo | null;
  /** 选中结构映射到的领域实体（若已登记且不是本页主体） */
  selectedEntity?: BodyEntity;
  /** 选中的结构属于本页主体时（如在大脑页点到某个脑区）的如实说明 */
  localSelection?: { name: string; partName: string | null; system: string | null } | null;
  /** 主体所属系统（用于「所属系统」一行） */
  subjectSystem: string | null;
  /** 选中项（或本页主体）的跨尺度与功能关系（最多 3 条，避免纸条变成数据表） */
  relations: KnowledgeRelation[];
  /** 可以继续深入的页面（通常只有一条主入口） */
  drill: DrillLink[];
  /** 返回更大尺度 */
  ascend: AscendLink | null;
  /** 未选中任何结构时的提示语（人体层与细胞层措辞不同） */
  emptyHint: string;
  canGoBack: boolean;
  onBack: () => void;
  sheetOpen: boolean;
  onToggleSheet: () => void;
}

export function KnowledgePaper({
  entity,
  selection,
  selectedEntity,
  localSelection,
  subjectSystem,
  relations,
  drill,
  ascend,
  emptyHint,
  canGoBack,
  onBack,
  sheetOpen,
  onToggleSheet,
}: KnowledgePaperProps) {
  /** 纸条当前在讲谁：优先跟随选中 */
  const subject = selectedEntity ?? entity;

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
            <span className="bd-title">{subject?.nameZh ?? '人体总览'}</span>
            {canGoBack ? (
              <button type="button" className="bd-chip" onClick={onBack}>
                返回上一级
              </button>
            ) : null}
          </div>
          {subjectSystem ? <p className="bd-label">所属系统 · {subjectSystem}</p> : null}
        </div>
        <button type="button" className="bd-wb-sheetclose bd-mobile-only" onClick={onToggleSheet}>
          收起
        </button>
      </div>

      {/* 选中的是一块没有独立科普卡片的结构时，如实说明，不编造内容 */}
      {selection && !selectedEntity ? (
        <section className="bd-wb-section" aria-label="当前选中">
          <span className="bd-label">当前选中</span>
          <p className="bd-body-secondary">
            {localSelection
              ? `这是${entity?.nameZh ?? '本页主体'}内部的一块真实结构「${
                  localSelection.partName ?? localSelection.name
                }」。BodyDay 只为结构整体编写科普内容，不为局部细分编写。`
              : `${selection.name ?? '未命名结构'}${
                  selection.system ? ` · ${selection.system}` : ''
                }。这是模型里真实存在的解剖结构，尚未建立独立科普卡片，这里不编造内容。`}
          </p>
        </section>
      ) : null}

      {subject ? (
        <section className="bd-wb-section" aria-label="科普">
          <KnowledgeCard entity={subject} showSources={false} />
        </section>
      ) : null}

      {relations.length > 0 ? (
        <section className="bd-wb-section" aria-label="与其它结构的关系">
          <span className="bd-label">与其它结构的关系</span>
          {relations.map((relation) => (
            <div key={relation.id} className="bd-rel">
              <div className="bd-rel__pair">
                <span>{ENTITY_MAP[relation.fromId]?.nameZh ?? relation.fromId}</span>
                <span className="bd-rel__arrow" aria-hidden="true">
                  →
                </span>
                <span>{ENTITY_MAP[relation.toId]?.nameZh ?? relation.toId}</span>
              </div>
              <span className="bd-rel__type" data-type={relation.relationType}>
                {RELATION_TYPE_LABEL[relation.relationType]}
              </span>
              <p className="bd-body-secondary">{relation.description}</p>
            </div>
          ))}
        </section>
      ) : null}

      {drill.length > 0 || ascend ? (
        <section className="bd-wb-section" aria-label="继续深入">
          <span className="bd-label">继续深入</span>
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
          ) : null}
          {ascend ? (
            <div className="bd-wb-actions">
              <Link className="bd-button bd-button--sm" to={ascend.to}>
                {ascend.label}
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {!selection && !subject ? <p className="bd-wb-empty">{emptyHint}</p> : null}

      <section className="bd-wb-section">
        <p className="bd-wb-note">
          三维模型为科普示意，不按真实比例。来源表、模型署名与许可见
          <Link to={ROUTES.about}>「关于 · 数据与方法」</Link>。
        </p>
      </section>
    </aside>
  );
}
