import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AtlasStage } from '../../three/lazyStages';
import { useAtlasSelection } from '../../three/atlasSelection';
import { useStageState } from '../../three/useStageState';
import { PageHeader, KnowledgeCard, SourceList, Notice, Unavailable } from '../../components/ui';
import { StageBoundary } from '../../components/StageBoundary';
import { DrilldownButton } from '../../components/Drilldown';
import { ROUTES } from '../../app/routes';
import {
  BODY_CONTEXT_BUNDLES,
  ENTITY_BUNDLE,
  ENTITY_STRUCTURE,
  type AtlasBundleId,
} from '../../services/atlas';
import { getRegionNotes, ATLAS_ATTRIBUTION_TEXT } from '../../services/organAssets';
import { markDiscovered } from '../../services/progress';
import { ENTITY_MAP, getEntity, relationsFrom, SYSTEM_MAP } from '../../domain';

/**
 * 05 / 08 / 11 器官探索（大脑 · 脾脏 · 心脏）。
 *
 * 器官模型来自 atlas 中**真实完整**的器官结构（`cerebrum` / `spleen` / `heart`），
 * 通过「在体内聚焦 + 父级上下文隔离」实现器官独立查看：
 * 镜头、旋转、缩放、复位、结构标注全部可用，且保留它在身体中的位置关系。
 */

interface LoadedStructure {
  id: string;
  name: string;
  kind?: string;
  system: string;
  layer: string;
}

const ROUTE_TO_ID: Record<string, string> = {
  brain: 'brain',
  heart: 'heart',
  spleen: 'spleen',
};

export function OrganPage() {
  const { organId } = useParams<{ organId: string }>();
  const entityId = organId ? ROUTE_TO_ID[organId] : undefined;
  const entity = getEntity(entityId);
  const sysInfo = entity?.parentId ? SYSTEM_MAP[entity.parentId] : undefined;

  const stage = useStageState();
  const initialStructure = entityId ? ENTITY_STRUCTURE[entityId] ?? null : null;
  const { structureId, setStructureId, info, setInfo } = useAtlasSelection(initialStructure);
  const [loaded, setLoaded] = useState<LoadedStructure[]>([]);

  useEffect(() => {
    if (entityId) markDiscovered(entityId);
  }, [entityId]);

  // 进入器官页时，舞台已按子树真实几何范围自动取景；
  // 这里只负责在首次进入时选中该器官，让右侧知识卡与高亮同步。
  useEffect(() => {
    if (initialStructure) setStructureId(initialStructure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStructure]);

  const bundles = useMemo<AtlasBundleId[]>(() => {
    const set = new Set<AtlasBundleId>(BODY_CONTEXT_BUNDLES);
    const bundle = entityId ? ENTITY_BUNDLE[entityId] : undefined;
    if (bundle) set.add(bundle);
    return Array.from(set);
  }, [entityId]);

  // 该器官在真实 atlas 元数据中的子结构
  const organStructures = useMemo(() => {
    if (!initialStructure) return [] as LoadedStructure[];
    const byId = new Map(loaded.map((s) => [s.id, s]));
    const result: LoadedStructure[] = [];
    for (const s of loaded) {
      if (s.id === initialStructure) continue;
      // 同系统且属于该器官的子结构
      const sameSystem = s.system === byId.get(initialStructure)?.system;
      if (sameSystem && s.kind === 'organ') result.push(s);
    }
    return result;
  }, [loaded, initialStructure]);

  const drilldowns = useMemo(() => {
    if (!entityId) return [];
    return relationsFrom(entityId)
      .filter((r) => r.relationType === 'extends_to' || r.relationType === 'functional' || r.relationType === 'circulates_through')
      .map((r) => ({ relation: r, target: ENTITY_MAP[r.toId] }))
      .filter((x) => Boolean(x.target?.proceduralId));
  }, [entityId]);

  const focus = useCallback(
    (id: string) => {
      setStructureId(id);
      stage.requestFocus(id);
    },
    [setStructureId, stage],
  );

  if (!entity || !entityId || !initialStructure) return <Navigate to={ROUTES.body} replace />;

  const regionNotes = getRegionNotes(entityId);

  return (
    <div className="bd-container bd-container--wide bd-page">
      <PageHeader
        eyebrow={`${entityId === 'brain' ? '05' : entityId === 'spleen' ? '08' : '11'} · 器官探索`}
        title={entity.nameZh}
        lead={entity.summary}
        scale="organ"
        crumbs={[
          { label: '封面', to: ROUTES.cover },
          { label: '人体总览', to: ROUTES.body },
          ...(sysInfo ? [{ label: sysInfo.nameZh, to: ROUTES.system(sysInfo.id) }] : []),
          { label: entity.nameZh },
        ]}
        actions={
          <>
            <button
              type="button"
              className="bd-button bd-button--sm"
              onClick={() => stage.requestReset()}
            >
              复位到器官取景
            </button>
            <button type="button" className="bd-button bd-button--sm" onClick={() => setStructureId(null)}>
              取消选中
            </button>
          </>
        }
      />

      <div className="bd-stage-page">
        <aside className="bd-stage-page__rail">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">区域说明</span>
            {regionNotes.map((note) => (
              <div key={note.title} className="bd-panel bd-panel--flat">
                <p className="bd-title" style={{ fontSize: 'var(--bd-fs-small)' }}>{note.title}</p>
                <p className="bd-body-secondary">{note.text}</p>
              </div>
            ))}
            <p className="bd-caption">区域说明为文字注解，未与模型做逐点解剖配准。</p>
          </div>

          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">模型中的相邻结构</span>
            {organStructures.length === 0 ? (
              <p className="bd-caption">加载完成后，这里会列出该器官所在系统中真实存在的相邻结构。</p>
            ) : (
              <nav className="bd-list" aria-label="相邻结构" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {organStructures.slice(0, 40).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="bd-list__item"
                    data-active={structureId === s.id}
                    onClick={() => focus(s.id)}
                  >
                    <span className="bd-list__mark" aria-hidden="true" />
                    <span className="bd-list__name">{s.name}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>
        </aside>

        <section aria-label="三维舞台">
          <div className="bd-stage bd-stage--tall">
            <StageBoundary label={`${entity.nameZh}三维舞台`}>
              <AtlasStage
                bundles={bundles}
                selectedStructureId={structureId}
                onSelectStructure={(id) => setStructureId(id)}
                onStructureInfo={setInfo}
                onStructuresReady={(list) => setLoaded(list)}
                focusNonce={stage.focusNonce}
                resetNonce={stage.resetNonce}
                onInteractionStart={stage.markUserRotate}
                visibleLayers={sysInfo ? [sysInfo.atlasId] : undefined}
                isolationMode="selected"
                frameStructureId={initialStructure}
                ariaLabel={`${entity.nameZh}三维模型`}
              />
            </StageBoundary>
            <div className="bd-stage__hud">
              <span className="bd-label">尺度 · 器官</span>
              <span className="bd-caption">
                当前为{entity.nameZh}的独立视图：其余结构已隐藏，便于观察该器官本身；可旋转、缩放，或点选左侧相邻结构。
              </span>
            </div>
            <div className="bd-stage__hud-bottom">
              <span className="bd-caption">拖动旋转 · 滚轮缩放 · 单击结构选中</span>
              <span className="bd-caption">模型不按真实比例</span>
            </div>
          </div>
        </section>

        <aside className="bd-stage-page__info">
          <div className="bd-stack bd-stack--tight">
            {info && info.structureId !== initialStructure && !info.entityId ? (
              <div className="bd-panel">
                <span className="bd-label">当前结构</span>
                <h3 className="bd-title" style={{ marginTop: 6 }}>{info.name}</h3>
                <p className="bd-caption">该结构的独立知识卡尚未建立，可继续在模型中浏览。</p>
              </div>
            ) : null}

            <KnowledgeCard entity={entity} />

            {drilldowns.length > 0 ? (
              <div className="bd-stack bd-stack--tight">
                <span className="bd-label">继续向下 · 进入细胞层</span>
                {drilldowns.map(({ relation, target }) => (
                  <div key={relation.id} className="bd-panel bd-panel--flat">
                    <p className="bd-body-secondary">{relation.description}</p>
                    <div className="bd-row" style={{ marginTop: 8 }}>
                      <DrilldownButton
                        toPath={ROUTES.cell(target!.proceduralId!)}
                        from="organ"
                        to="cell"
                        caption={relation.description}
                        label={`进入 ${target!.nameZh}`}
                      />
                    </div>
                    <SourceList ids={relation.sourceIds} title="关系依据" />
                  </div>
                ))}
              </div>
            ) : (
              <Unavailable
                title="暂无向下深潜的细胞模型"
                detail="BodyDay 不会用不相关的细胞模型顶替。此处仅提供该器官的知识与结构浏览。"
              />
            )}

            <div className="bd-stack bd-stack--tight">
              <span className="bd-label">回到更大尺度</span>
              <div className="bd-row">
                {sysInfo ? (
                  <Link className="bd-button" to={ROUTES.system(sysInfo.id)}>
                    返回{sysInfo.nameZh}
                  </Link>
                ) : null}
                <Link className="bd-button bd-button--quiet" to={ROUTES.body}>
                  返回人体
                </Link>
              </div>
            </div>

            <Notice tone="info" title="科学边界">
              {entity.scaleNote ?? '模型为科普示意，不按真实比例。'}
              <br />
              {ATLAS_ATTRIBUTION_TEXT}
            </Notice>

            <SourceList ids={entity.sources} />
          </div>
        </aside>
      </div>

      <div style={{ marginTop: 'var(--bd-space-8)' }}>
        <div className="bd-grid bd-grid--3">
          <div className="bd-panel bd-panel--flat">
            <span className="bd-label">也可以看</span>
            <p className="bd-body-secondary">
              同一系统中还有其它器官专题。可在左栏切换或在人体总览中直接点选。
            </p>
          </div>
          <div className="bd-panel bd-panel--flat">
            <span className="bd-label">关系图</span>
            <p className="bd-body-secondary">
              在
              {' '}
              <Link to={ROUTES.relations} style={{ borderBottom: '1px solid var(--bd-rule-strong)' }}>
                科学关系图
              </Link>
              {' '}
              中查看该器官的全部关系类型：结构隶属、功能相关、循环输送、疾病语境。
            </p>
          </div>
          <div className="bd-panel bd-panel--flat">
            <span className="bd-label">引导教学</span>
            <p className="bd-body-secondary">
              想按步骤学？进入{' '}
              <Link to={ROUTES.lesson(entityId === 'brain' ? 'neural' : entityId === 'spleen' ? 'immune' : 'circulation')} style={{ borderBottom: '1px solid var(--bd-rule-strong)' }}>
                {entityId === 'brain' ? '神经科普课' : entityId === 'spleen' ? '免疫科普课' : '循环关联课'}
              </Link>
              ，课程会用同一套模型逐步引导并检验理解。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
