import { Link } from 'react-router-dom';
import { KnowledgeCard } from '../../components/ui';
import type { BodyEntity } from '../../domain';
import {
  structureCardPath,
  structureCardPlacement,
  type StructureCardData,
} from '../../domain/structureCard';
import type { StructureInfo } from '../../services/atlas';

/**
 * 右纸条：只讲**当前对象**本身。
 *
 * 手册（§3.2 / §4）要求右栏回答三件事：这是哪里、作用是什么、与日常健康的关系。
 * 本组件据此守两条硬规则：
 * 1. 「当前选中」这类大字号重复标题、`结构类别/所属系统/上级结构` 式 `<dl>` 字段堆叠、
 *    固定默认卡、防御性文案、多个「查看/深入/返回」入口——一律不出现；
 * 2. 选中结构后**彻底替换**旧主体，旧新卡不同时渲染；信息不足的字段整行不渲染，不编造。
 * 右上唯一的跨页入口是 `[查看器官详解 →]`，由调用方只在映射到已核实器官时传入。
 */

export interface DrillLink {
  to: string;
  label: string;
  note: string;
}

interface KnowledgePaperProps {
  /** 当前要讲的已登记实体（未选中结构时的页面主体，或选中映射到的实体） */
  subject?: BodyEntity;
  /** 当前选中的真实结构（来自三维点选） */
  selection?: StructureInfo | null;
  /** 选中结构未编入科普卡时，用真实图谱元数据生成的简洁结构卡 */
  structureCard?: StructureCardData | null;
  /** 右上唯一的跨页入口；为 null 时不渲染任何按钮 */
  drill: DrillLink | null;
  /** 是否是器官详解页（此时提供「返回探索」） */
  isDetail: boolean;
  /** 「返回探索」的目标路径 */
  returnTo: string;
  /** 跨页入口导航前的回调（用于保存返回上下文） */
  onDrillNavigate: () => void;
  /** 未选中任何结构时的提示语（人体层与细胞层措辞不同） */
  emptyHint: string;
  canGoBack: boolean;
  onBack: () => void;
  sheetOpen: boolean;
  onToggleSheet: () => void;
}

export function KnowledgePaper({
  subject,
  selection,
  structureCard,
  drill,
  isDetail,
  returnTo,
  onDrillNavigate,
  emptyHint,
  canGoBack,
  onBack,
  sheetOpen,
  onToggleSheet,
}: KnowledgePaperProps) {
  const path = structureCardPath(structureCard);
  const placement = structureCardPlacement(structureCard);
  /* 内容身份：变化时让同一容器重挂载一次，触发统一的轻淡入（旧新卡不同时保留） */
  const swapKey = structureCard
    ? `s:${structureCard.title}:${structureCard.system ?? ''}`
    : subject
      ? `e:${subject.id}`
      : 'empty';

  return (
    <aside
      className="bd-wb-paper"
      aria-label="知识纸条"
      data-sheet={sheetOpen ? 'open' : 'closed'}
    >
      <div className="bd-wb-head">
        <div className="bd-wb-head__row">
          <div className="bd-wb-head__actions">
            <button type="button" className="bd-wb-sheetclose bd-mobile-only" onClick={onToggleSheet}>
              收起
            </button>
            {canGoBack ? (
              <button type="button" className="bd-chip" onClick={onBack}>
                返回上一级
              </button>
            ) : null}
            {isDetail ? (
              <Link className="bd-button bd-button--sm" to={returnTo} onClick={onDrillNavigate}>
                返回探索
              </Link>
            ) : null}
            {drill ? (
              <span className="bd-drill">
                <Link
                  className="bd-button bd-button--sm bd-button--primary"
                  to={drill.to}
                  onClick={onDrillNavigate}
                >
                  {drill.label} →
                </Link>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bd-wb-swap" key={swapKey}>
        {/*
          未编入科普卡的可选中结构（脑区、体表分区、任一真实解剖节点）：
          只用图谱里真实存在的空间/结构字段，字段缺失就整行不渲染——不写防御句、不编造作用。
        */}
        {structureCard ? (
          <section className="bd-wb-section" aria-label="当前结构">
            <h3 className="bd-title">{structureCard.title}</h3>
            {path ? <p className="bd-wb-path">{path}</p> : null}
            {placement ? <p className="bd-body-secondary">{placement}</p> : null}
          </section>
        ) : null}

        {subject ? (
          <section className="bd-wb-section" aria-label="科普">
            <KnowledgeCard entity={subject} showSources={false} />
          </section>
        ) : null}

        {drill ? <p className="bd-wb-note">{drill.note}</p> : null}

        {!selection && !subject && !structureCard ? <p className="bd-wb-empty">{emptyHint}</p> : null}
      </div>
    </aside>
  );
}
