import { Link } from 'react-router-dom';
import { KnowledgeCard } from '../../components/ui';
import { ENTITY_MAP, RELATION_TYPE_LABEL, type BodyEntity, type KnowledgeRelation } from '../../domain';
import type { StructureCardData } from '../../domain/structureCard';
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
  /** 选中的结构未编入科普卡时，用真实图谱元数据生成的简洁结构卡 */
  structureCard?: StructureCardData | null;
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
  structureCard,
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
  /**
   * 纸条当前在讲谁：优先跟随选中。
   *
   * 选中一个未登记的真实结构时，只讲被点中的结构本身——
   * 不再在下面继续挂一份「人体」总览（那会让人以为肺叶就是人体）。
   * 只有「点在当前主体内部的局部结构上」（如大脑页点到某个脑区）才保留主体卡片作为上下文。
   */
  const subject = structureCard && !structureCard.parent ? undefined : selectedEntity ?? entity;

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

      {/*
        未编入科普卡的可选中结构（脑区、体表分区、任一真实解剖节点）：
        用图谱元数据给出可核查的事实，字段缺失就不显示该字段——不写「尚未编入」这类防御句。
      */}
      {structureCard ? (
        <section className="bd-wb-section" aria-label="当前结构">
          <h3 className="bd-title">{structureCard.title}</h3>
          <dl className="bd-knowledge__facts">
            <div className="bd-knowledge__fact">
              <dt>结构类别</dt>
              <dd>{structureCard.category}</dd>
            </div>
            {structureCard.system ? (
              <div className="bd-knowledge__fact">
                <dt>所属系统</dt>
                <dd>{structureCard.system}</dd>
              </div>
            ) : null}
            {structureCard.parent ? (
              <div className="bd-knowledge__fact">
                <dt>上级结构</dt>
                <dd>{structureCard.parent}</dd>
              </div>
            ) : null}
            <div className="bd-knowledge__fact">
              <dt>图谱来源</dt>
              <dd>
                Z-Anatomy 1.4.0（CC BY-SA 4.0）·<Link to={ROUTES.about}>来源与许可</Link>
              </dd>
            </div>
          </dl>
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
          模型为示意，不按真实比例 · 来源与许可见
          <Link to={ROUTES.about}>「关于」</Link>
        </p>
      </section>
    </aside>
  );
}
