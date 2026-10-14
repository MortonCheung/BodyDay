import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AtlasStage } from '../../three/lazyStages';
import { useAtlasSelection } from '../../three/atlasSelection';
import { useStageState } from '../../three/useStageState';
import { KnowledgeCard, SourceList, Notice, Unavailable, PageHeader } from '../../components/ui';
import { StageBoundary } from '../../components/StageBoundary';
import { DrilldownButton } from '../../components/Drilldown';
import { ROUTES } from '../../app/routes';
import {
  BODY_CONTEXT_BUNDLES,
  ATLAS_STRUCTURE_IDS,
  SYSTEM_LABELS,
  type AtlasBundleId,
} from '../../services/atlas';
import { ENTITY_MAP, SYSTEMS, getEntity, getSystem, relationsFrom } from '../../domain';

/**
 * 人体 / 系统探索器：人体总览页与人体系统页共用同一套舞台与版面。
 *
 * 器官层的「进入细胞」入口严格依据真实关系表（`extends_to`）生成，
 * 没有真实模型的节点不会出现深潜按钮。
 */

interface LoadedStructure {
  id: string;
  name: string;
  kind?: string;
  system: string;
  layer: string;
}

export function AnatomyExplorer({ systemId }: { systemId?: string }) {
  const system = getSystem(systemId);
  const stage = useStageState();
  const { structureId, setStructureId, info, setInfo } = useAtlasSelection(null);
  const [loaded, setLoaded] = useState<LoadedStructure[]>([]);

  const bundles = useMemo(() => {
    const set = new Set<AtlasBundleId>(BODY_CONTEXT_BUNDLES);
    if (system?.bundle) set.add(system.bundle as AtlasBundleId);
    return Array.from(set);
  }, [system]);

  const visibleLayers = useMemo(() => (system ? [system.atlasId] : undefined), [system]);

  const focusStructure = useCallback(
    (id: string) => {
      setStructureId(id);
      stage.requestFocus(id);
    },
    [setStructureId, stage],
  );

  // 可聚焦结构：只展示当前激活图层中的真实结构，按名称排序
  const focusable = useMemo(() => {
    const active = system?.atlasId;
    const list = loaded.filter((s) => s.kind !== 'system' && (!active || s.layer === active));
    const preferred = list.filter((s) => s.kind === 'organ' || KEY_LABELS[s.id]);
    const source = preferred.length > 0 ? preferred : list;
    return source
      .map((s) => ({ ...s, label: KEY_LABELS[s.id] ?? s.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'));
  }, [loaded, system]);

  const entity = info?.entityId ? getEntity(info.entityId) : undefined;

  return (
    <StageLayoutish
      header={
        <PageHeader
          eyebrow={system ? '04 · 人体系统' : '03 · 人体总览'}
          title={system ? system.nameZh : '人体总览'}
          lead={
            system
              ? system.brief
              : '这是一具完整人体。转动它，或从左栏选择解剖系统，再把镜头推进到具体器官。'
          }
          scale="body"
          crumbs={[
            { label: '封面', to: ROUTES.cover },
            { label: '人体总览', to: ROUTES.body },
            ...(system ? [{ label: system.nameZh }] : []),
          ]}
          actions={
            <>
              <button type="button" className="bd-button bd-button--sm" onClick={() => stage.requestReset()}>
                复位视角
              </button>
              <button type="button" className="bd-button bd-button--sm" onClick={() => setStructureId(null)}>
                取消选中
              </button>
            </>
          }
        />
      }
      rail={
        <>
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">解剖系统</span>
            <nav className="bd-list" aria-label="解剖系统列表">
              <Link className="bd-list__item" data-active={!system} to={ROUTES.body}>
                <span className="bd-list__mark" aria-hidden="true" />
                <span className="bd-list__name">全部系统（人体总览）</span>
              </Link>
              {SYSTEMS.map((s) => (
                <Link
                  key={s.id}
                  className="bd-list__item"
                  data-active={system?.id === s.id}
                  to={ROUTES.system(s.id)}
                >
                  <span className="bd-list__mark" aria-hidden="true" />
                  <span className="bd-list__name">{s.nameZh}</span>
                  <span className="bd-list__hint">{s.open ? '专题' : '浏览'}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">可聚焦结构</span>
            {focusable.length === 0 ? (
              <p className="bd-caption">模型加载完成后，这里会列出该系统的真实结构。</p>
            ) : (
              <nav
                className="bd-list"
                aria-label="结构列表"
                style={{ maxHeight: 320, overflowY: 'auto' }}
              >
                {focusable.slice(0, 60).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="bd-list__item"
                    data-active={structureId === s.id}
                    onClick={() => focusStructure(s.id)}
                  >
                    <span className="bd-list__mark" aria-hidden="true" />
                    <span className="bd-list__name">{s.label}</span>
                    <span className="bd-list__hint">{s.kind === 'organ' ? '器官' : ''}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>
        </>
      }
      stage={
        <div className="bd-stage bd-stage--tall">
          <StageBoundary label="人体三维舞台">
            <AtlasStage
              bundles={bundles}
              selectedStructureId={structureId}
              onSelectStructure={(id) => setStructureId(id)}
              onStructureInfo={setInfo}
              onStructuresReady={setLoaded}
              focusNonce={stage.focusNonce}
              resetNonce={stage.resetNonce}
              onInteractionStart={stage.markUserRotate}
              visibleLayers={visibleLayers}
              alwaysVisibleIds={[ATLAS_STRUCTURE_IDS.bodyShell, ATLAS_STRUCTURE_IDS.skeleton]}
              isolationMode="parent-context"
              ariaLabel={system ? `${system.nameZh}三维模型` : '完整人体三维模型'}
            />
          </StageBoundary>
          <div className="bd-stage__hud">
            <span className="bd-label">尺度 · 人体</span>
            <span className="bd-caption">
              外壳与骨骼作为空间参照常显；选中的系统按图层叠加。
            </span>
          </div>
          <div className="bd-stage__hud-bottom">
            <span className="bd-caption">拖动旋转 · 滚轮缩放 · 单击结构选中</span>
            <span className="bd-caption">
              {loaded.length > 0 ? `已加载 ${loaded.length} 个真实结构` : ''}
            </span>
          </div>
        </div>
      }
      info={
        <>
          {info && entity ? (
            <div className="bd-stack bd-stack--tight">
              <KnowledgeCard entity={entity} />
              <DrilldownActions entityId={entity.id} />
            </div>
          ) : info ? (
            <div className="bd-stack bd-stack--tight">
              <div className="bd-panel">
                <span className="bd-label">当前结构</span>
                <h3 className="bd-title" style={{ marginTop: 6 }}>{info.name}</h3>
                <p className="bd-body-secondary">
                  所属系统：{SYSTEM_LABELS[info.system] ?? info.system}
                  {info.kind ? ` · 类型：${info.kind}` : ''}
                </p>
                <p className="bd-caption">
                  该结构暂无 BodyDay 独立科普卡片。你可以在左侧结构列表或模型上继续浏览；下方器官专题包含完整的知识卡与来源。
                </p>
              </div>
              <Unavailable
                title="暂无独立知识卡"
                detail="BodyDay 只为经过来源核对的器官与细胞建立科普卡片；未建立卡片的结构仍可真实浏览，不会用不相关内容填充。"
              />
            </div>
          ) : system ? (
            <div className="bd-stack bd-stack--tight">
              <div className="bd-panel">
                <span className="bd-label">系统说明</span>
                <h3 className="bd-title" style={{ marginTop: 6 }}>{system.nameZh}</h3>
                <p className="bd-body-secondary">{system.brief}</p>
                <SourceList ids={system.sourceIds} />
              </div>
              <OrganEntrances systemId={system.id} />
              {!system.open ? (
                <Notice tone="warn" title="该系统暂未开放专题">
                  你可以在 3D 舞台中自由旋转、缩放并点击结构；BodyDay 只为神经、循环、淋巴三个系统提供经过来源核对的器官与细胞深潜路线。
                </Notice>
              ) : null}
            </div>
          ) : (
            <div className="bd-stack bd-stack--tight">
              <div className="bd-panel">
                <span className="bd-label">怎么读这一页</span>
                <h3 className="bd-title" style={{ marginTop: 6 }}>三个入口</h3>
                <p className="bd-body-secondary">
                  ① 在模型上单击任意结构；② 在左栏选择解剖系统；③ 直接进入三个器官专题，那里有完整的知识卡、来源与「进入细胞」的入口。
                </p>
              </div>
              <OrganEntrances />
              <Notice tone="info" title="关于标注与比例">
                三维模型是科普示意：器官不按真实比例渲染；选中结构的高亮来自模型自身的解剖结构，不是叠加的示意图层。
              </Notice>
            </div>
          )}
        </>
      }
    />
  );
}

/** 从当前实体出发、依据真实关系表生成「向下进入」的入口 */
function DrilldownActions({ entityId }: { entityId: string }) {
  const targets = relationsFrom(entityId).filter((r) => r.relationType === 'extends_to');
  const withModel = targets.filter((r) => {
    const target = ENTITY_MAP[r.toId];
    return Boolean(target?.proceduralId);
  });
  if (withModel.length === 0) return null;
  return (
    <div className="bd-stack bd-stack--tight">
      <span className="bd-label">继续向下 · 进入细胞层</span>
      {withModel.map((r) => (
        <div key={r.id} className="bd-panel bd-panel--flat">
          <p className="bd-body-secondary">{r.description}</p>
          <div className="bd-row" style={{ marginTop: 8 }}>
            <DrilldownButton
              toPath={ROUTES.cell(ENTITY_MAP[r.toId].proceduralId!)}
              from="organ"
              to="cell"
              caption={r.description}
              label={`进入 ${ENTITY_MAP[r.toId].nameZh}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 器官专题入口（神经 → 脑；循环 → 心；淋巴 → 脾） */
function OrganEntrances({ systemId }: { systemId?: string }) {
  const organs = ['brain', 'heart', 'spleen']
    .map((id) => getEntity(id))
    .filter((e) => (systemId ? e?.parentId === systemId : true))
    .filter(Boolean);
  if (organs.length === 0) return null;
  return (
    <div className="bd-stack bd-stack--tight">
      <span className="bd-label">器官专题</span>
      {organs.map((organ) => (
        <Link key={organ!.id} className="bd-rel" to={ROUTES.organ(organ!.id)}>
          <span className="bd-rel__type" data-type="part_of">器官</span>
          <span className="bd-title" style={{ fontFamily: 'var(--bd-font-display)', fontSize: '1.3rem' }}>
            {organ!.nameZh}
          </span>
          <span className="bd-caption">{organ!.summary}</span>
        </Link>
      ))}
    </div>
  );
}

/** 已知器官结构的中文名（用于结构列表优先展示） */
const KEY_LABELS: Record<string, string> = {
  [ATLAS_STRUCTURE_IDS.cerebrum]: '大脑（端脑）',
  [ATLAS_STRUCTURE_IDS.cerebellum]: '小脑',
  [ATLAS_STRUCTURE_IDS.brainstem]: '脑干',
  [ATLAS_STRUCTURE_IDS.heart]: '心脏',
  [ATLAS_STRUCTURE_IDS.cardiacInternalStructures]: '心脏内部结构',
  [ATLAS_STRUCTURE_IDS.spleen]: '脾脏',
  [ATLAS_STRUCTURE_IDS.lymphoidOrgans]: '淋巴器官',
  [ATLAS_STRUCTURE_IDS.skeleton]: '骨骼',
};

/** 版面：与 StageLayout 同构，但保持本组件自包含 */
function StageLayoutish({
  header,
  rail,
  stage,
  info,
}: {
  header: React.ReactNode;
  rail: React.ReactNode;
  stage: React.ReactNode;
  info: React.ReactNode;
}) {
  return (
    <div className="bd-container bd-container--wide bd-page">
      {header}
      <div className="bd-stage-page">
        <aside className="bd-stage-page__rail">{rail}</aside>
        <section aria-label="三维舞台">{stage}</section>
        <aside className="bd-stage-page__info">{info}</aside>
      </div>
    </div>
  );
}
