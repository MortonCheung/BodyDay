import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeCard, Notice, SourceList, ScaleBadge } from '../../components/ui';
import { ENTITY_MAP, RELATION_TYPE_LABEL, type BodyEntity, type KnowledgeRelation, type Scale } from '../../domain';
import type { StructureSelection } from '../../three/atlasSelection';
import { routeForEntity, ROUTES } from '../../app/routes';
import { Clock, ScaleLine } from './paperChrome';

/**
 * 右纸条：知识内容。
 *
 * 它随「当前选中」连续变化——这是本作品的核心交互：
 * 用户点中间模型上的任一结构，纸条上的知识、健康关联与来源就换成那一个结构的内容。
 * 点空白取消选中后，纸条回到「本页主体」的知识。
 */

export interface AscendLink {
  to: string;
  label: string;
  note: string;
}

interface KnowledgePaperProps {
  scale: Scale;
  onNavigateScale: (scale: Scale) => void;
  /** 页面主体：人体 / 系统 / 器官 / 细胞 */
  entity?: BodyEntity;
  /** 当前选中且能映射到领域实体的结构 */
  selectedEntity?: BodyEntity;
  /** 当前选中的真实 atlas 结构（没有对应科普卡片时） */
  rawSelection?: StructureSelection | null;
  /** 真实结构名（点到了本页主体内部的另一处时给出的即时反馈） */
  currentStructureCaption?: string | null;
  /** 选中项（或本页主体）的跨尺度与功能关系 */
  relations: KnowledgeRelation[];
  /** 可向下深潜的目标 */
  downTargets: BodyEntity[];
  /** 返回更大尺度 */
  ascend: AscendLink | null;
  attribution: string;
  /** 引导教学模式的面板，插在纸条最前 */
  guide?: ReactNode;
  /** 主体区块的标题 */
  subjectLabel: string;
}

export function KnowledgePaper({
  scale,
  onNavigateScale,
  entity,
  selectedEntity,
  rawSelection,
  currentStructureCaption,
  relations,
  downTargets,
  ascend,
  attribution,
  guide,
  subjectLabel,
}: KnowledgePaperProps) {
  const selectionIsDistinct = Boolean(selectedEntity && selectedEntity.id !== entity?.id);

  return (
    <aside className="bd-wb-paper" aria-label="知识纸条" data-paper-surface>
      <div className="bd-wb-head">
        <div className="bd-wb-head__row">
          <ScaleBadge scale={scale} />
          <Clock />
        </div>
        <ScaleLine scale={scale} onNavigate={onNavigateScale} />
      </div>

      {guide}

      {selectionIsDistinct && selectedEntity ? (
        <section className="bd-wb-section" aria-label="当前选中">
          <span className="bd-label">当前选中</span>
          <KnowledgeCard entity={selectedEntity} />
          <p className="bd-wb-note">
            点模型空白处、或按 Esc，可取消选中，纸条会回到本页主体内容。
          </p>
        </section>
      ) : rawSelection ? (
        <section className="bd-wb-section" aria-label="当前选中">
          <span className="bd-label">当前选中</span>
          <div className="bd-panel">
            <p className="bd-title" style={{ fontSize: 'var(--bd-fs-small)' }}>{rawSelection.name}</p>
            <p className="bd-caption" style={{ marginTop: 4 }}>
              {rawSelection.system}
              {rawSelection.kind ? ` · ${rawSelection.kind}` : ''}
            </p>
            <p className="bd-body-secondary" style={{ marginTop: 8 }}>
              这是模型里真实存在的解剖结构，BodyDay 尚未为它建立独立的科普卡片。
              此处不编造内容，也不拿别的结构代替。
            </p>
          </div>
        </section>
      ) : (
        <section className="bd-wb-section" aria-label="当前选中">
          <span className="bd-label">当前选中</span>
          <p className="bd-wb-empty">
            在中间的人体模型上点选任一结构，或从左侧结构栏选择，
            这里会同步显示它的结构知识、与健康的关系以及可核查的来源。
          </p>
        </section>
      )}

      {entity ? (
        <section className="bd-wb-section" aria-label={subjectLabel}>
          <div className="bd-wb-section__head">
            <span className="bd-label">{subjectLabel}</span>
            {currentStructureCaption ? (
              <span className="bd-meta">当前结构：{currentStructureCaption}</span>
            ) : null}
          </div>
          <KnowledgeCard entity={entity} />
        </section>
      ) : null}

      {relations.length > 0 ? (
        <section className="bd-wb-section" aria-label="与其它结构的关系">
          <span className="bd-label">与其它结构的关系</span>
          {relations.map((relation) => {
            const from = ENTITY_MAP[relation.fromId];
            const to = ENTITY_MAP[relation.toId];
            const targetPath = routeForEntity(relation.toId);
            return (
              <div key={relation.id} className="bd-rel">
                <div className="bd-rel__pair">
                  <span>{from?.nameZh ?? relation.fromId}</span>
                  <span className="bd-rel__arrow" aria-hidden="true">→</span>
                  <span>{to?.nameZh ?? relation.toId}</span>
                </div>
                <span className="bd-rel__type" data-type={relation.relationType}>
                  {RELATION_TYPE_LABEL[relation.relationType]}
                </span>
                <p className="bd-body-secondary">{relation.description}</p>
                <div className="bd-wb-actions">
                  {targetPath && targetPath !== ROUTES.body ? (
                    <Link className="bd-button bd-button--sm bd-button--quiet" to={targetPath}>
                      查看{to?.nameZh ?? '关联结构'}
                    </Link>
                  ) : null}
                </div>
                <SourceList ids={relation.sourceIds} title="关系依据" />
              </div>
            );
          })}
        </section>
      ) : null}

      {downTargets.length > 0 || ascend ? (
        <section className="bd-wb-section" aria-label="跨尺度导航">
          <span className="bd-label">跨尺度导航</span>
          {downTargets.length > 0 ? (
            <div className="bd-wb-actions">
              {downTargets.map((target) => {
                const path = routeForEntity(target.id);
                if (!path) return null;
                return (
                  <Link key={target.id} className="bd-button bd-button--sm bd-button--primary" to={path}>
                    进入 {target.nameZh}
                  </Link>
                );
              })}
            </div>
          ) : null}
          {ascend ? (
            <div className="bd-wb-actions">
              <Link className="bd-button bd-button--sm" to={ascend.to}>
                {ascend.label}
              </Link>
            </div>
          ) : null}
          {ascend ? <p className="bd-wb-note">{ascend.note}</p> : null}
          {downTargets.length === 0 ? (
            <p className="bd-wb-note">
              本结构没有更小尺度的独立模型；BodyDay 不会用不相关的模型顶替。
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="bd-wb-section">
        <span className="bd-label">科学边界</span>
        <Notice tone="info" title="模型是示意，不是真实比例">
          {entity?.scaleNote ?? '三维模型用于说明结构与位置关系，不代表真实比例与病理变化。'}
          <br />
          {attribution}
        </Notice>
      </section>
    </aside>
  );
}
