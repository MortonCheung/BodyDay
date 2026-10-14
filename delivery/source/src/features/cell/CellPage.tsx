import { useEffect, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CellStage } from '../../three/lazyStages';
import type { CellId } from '../../three/CellStage';
import { useStageState } from '../../three/useStageState';
import { PageHeader, KnowledgeCard, SourceList, Notice, Unavailable } from '../../components/ui';
import { StageBoundary } from '../../components/StageBoundary';
import { AscendButton } from '../../components/Drilldown';
import { ROUTES } from '../../app/routes';
import { markDiscovered } from '../../services/progress';
import { ENTITY_MAP, getChildren, getEntity, relationsTo, type BodyEntity } from '../../domain';

/**
 * 06 / 09 细胞探索（神经元 · 白细胞）。
 *
 * 细胞模型为本作品**程序化原创几何**，不依赖任何许可不明的第三方细胞模型；
 * 界面显式标注「科学示意、不按真实比例」。
 */

const ROUTE_TO_CELL: Record<string, { cellId: CellId; entityId: string }> = {
  neuron: { cellId: 'neuron', entityId: 'neuron' },
  leukocyte: { cellId: 'leukocyte', entityId: 'leukocyte' },
};

export function CellPage() {
  const { cellId: routeId } = useParams<{ cellId: string }>();
  const resolved = routeId ? ROUTE_TO_CELL[routeId] : undefined;
  const entity = getEntity(resolved?.entityId);
  const stage = useStageState(entity?.id ?? null);

  useEffect(() => {
    if (entity) markDiscovered(entity.id);
  }, [entity]);

  const parts = useMemo(() => (entity ? getChildren(entity.id) : []), [entity]);

  const parentOrgan = useMemo<BodyEntity | undefined>(() => {
    if (!entity?.parentId) return undefined;
    return getEntity(entity.parentId);
  }, [entity]);

  // 该细胞与其它结构的真实关系（用于「循环输送 / 功能相关」等跨尺度说明）
  const relations = useMemo(() => (entity ? relationsTo(entity.id) : []), [entity]);

  const selected = stage.selectedEntityId ? ENTITY_MAP[stage.selectedEntityId] : undefined;

  if (!entity || !resolved) return <Navigate to={ROUTES.body} replace />;

  const isNeuron = resolved.cellId === 'neuron';

  return (
    <div className="bd-container bd-container--wide bd-page">
      <PageHeader
        eyebrow={isNeuron ? '06 · 细胞探索' : '09 · 细胞探索'}
        title={`${entity.nameZh}探索`}
        lead={entity.summary}
        scale="cell"
        crumbs={[
          { label: '封面', to: ROUTES.cover },
          { label: '人体总览', to: ROUTES.body },
          ...(parentOrgan ? [{ label: parentOrgan.nameZh, to: ROUTES.organ(parentOrgan.id === 'spleen' ? 'spleen' : parentOrgan.id === 'heart' ? 'heart' : 'brain') }] : []),
          { label: entity.nameZh },
        ]}
        actions={
          <>
            <button type="button" className="bd-button bd-button--sm" onClick={() => stage.requestReset()}>
              复位视角
            </button>
            <button type="button" className="bd-button bd-button--sm" onClick={() => stage.selectEntity(null)}>
              取消选中
            </button>
          </>
        }
      />

      <div className="bd-stage-page">
        <aside className="bd-stage-page__rail">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">细胞结构</span>
            <nav className="bd-list" aria-label="细胞结构列表">
              {parts.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  className="bd-list__item"
                  data-active={stage.selectedEntityId === part.id}
                  onClick={() => stage.requestFocus(part.id)}
                >
                  <span className="bd-list__mark" aria-hidden="true" />
                  <span className="bd-list__name">{part.nameZh}</span>
                  <span className="bd-list__hint">{part.nameEn}</span>
                </button>
              ))}
            </nav>
          </div>

          <Notice tone="info" title="关于这个模型">
            细胞几何为程序化生成的科学示意形态，用于说明结构与功能的对应关系，不代表真实细胞的形态学细节，也不按真实比例。
          </Notice>

          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">回到更大尺度</span>
            <div className="bd-row">
              {parentOrgan ? (
                <AscendButton
                  toPath={ROUTES.organ(parentOrgan.id === 'spleen' ? 'spleen' : parentOrgan.id === 'heart' ? 'heart' : 'brain')}
                  from="cell"
                  to="organ"
                  caption={`从细胞层返回器官层：${parentOrgan.nameZh}。尺度变大，模型随之更换。`}
                  label={`返回${parentOrgan.nameZh}`}
                />
              ) : null}
              <Link className="bd-button bd-button--quiet" to={ROUTES.body}>
                返回人体
              </Link>
            </div>
          </div>
        </aside>

        <section aria-label="三维舞台">
          <div className="bd-stage bd-stage--tall">
            <StageBoundary label={`${entity.nameZh}三维舞台`}>
              <CellStage
                cellId={resolved.cellId}
                state={stage}
                ariaLabel={`${entity.nameZh}三维模型`}
              />
            </StageBoundary>
            <div className="bd-stage__hud">
              <span className="bd-label">尺度 · 细胞</span>
              <span className="bd-caption">点击热标或模型部件进行选择，右侧会显示对应结构的知识。</span>
            </div>
            <div className="bd-stage__hud-bottom">
              <span className="bd-caption">拖动旋转 · 滚轮缩放 · 点击部件选中</span>
              <span className="bd-caption">程序化几何 · 科学示意</span>
            </div>
          </div>
        </section>

        <aside className="bd-stage-page__info">
          <div className="bd-stack bd-stack--tight">
            {selected && selected.id !== entity.id ? (
              <KnowledgeCard entity={selected} />
            ) : (
              <div className="bd-panel">
                <span className="bd-label">从哪一部分开始</span>
                <p className="bd-body-secondary">
                  在左栏或模型热标中点选一个部件，这里会显示该部件的结构与功能说明。
                </p>
              </div>
            )}

            <KnowledgeCard entity={entity} />

            {relations.length > 0 ? (
              <div className="bd-stack bd-stack--tight">
                <span className="bd-label">与其它结构的关系</span>
                {relations.map((r) => (
                  <div key={r.id} className="bd-panel bd-panel--flat">
                    <div className="bd-rel__pair">
                      <span>{ENTITY_MAP[r.fromId]?.nameZh ?? r.fromId}</span>
                      <span className="bd-rel__arrow">→</span>
                      <span>{ENTITY_MAP[r.toId]?.nameZh ?? r.toId}</span>
                    </div>
                    <span className="bd-rel__type" data-type={r.relationType}>
                      {r.relationType}
                    </span>
                    <p className="bd-body-secondary">{r.description}</p>
                    <SourceList ids={r.sourceIds} title="关系依据" />
                  </div>
                ))}
              </div>
            ) : (
              <Unavailable title="暂无反向关系" detail="该细胞目前没有登记跨尺度关系。" />
            )}

            <div className="bd-stack bd-stack--tight">
              <span className="bd-label">继续学习</span>
              <p className="bd-body-secondary">
                想按步骤完成一条完整路线？进入
                {' '}
                <Link
                  to={ROUTES.lesson(isNeuron ? 'neural' : 'immune')}
                  style={{ borderBottom: '1px solid var(--bd-rule-strong)' }}
                >
                  {isNeuron ? '神经科普课' : '免疫科普课'}
                </Link>
                ，课程会把「器官 → 细胞 → 部件」串成一条有测验的路径。
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
