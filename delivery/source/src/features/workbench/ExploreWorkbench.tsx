import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtlasStage, CellStage } from '../../three/lazyStages';
import { useAtlasSelection } from '../../three/atlasSelection';
import { useStageState } from '../../three/useStageState';
import { StageBoundary } from '../../components/StageBoundary';
import { useAppMode } from '../../app/AppProviders';
import { routeForEntity, ROUTES } from '../../app/routes';
import type { ResolvedView } from '../../app/resolveView';
import { ATLAS_ATTRIBUTION_TEXT } from '../../services/organAssets';
import {
  BODY_CONTEXT_BUNDLES,
  ATLAS_STRUCTURE_IDS,
  ENTITY_BUNDLE,
  ENTITY_STRUCTURE,
  type AtlasBundleId,
} from '../../services/atlas';
import { markDiscovered } from '../../services/progress';
import {
  ENTITY_MAP,
  LESSONS,
  SCALE_MAP,
  SYSTEMS,
  getChildren,
  getEntity,
  getSystem,
  relationsFrom,
  relationsOf,
  type BodyEntity,
  type Scale,
  type SystemBrief,
} from '../../domain';
import { StructureRail, type RailStructure } from './StructureRail';
import { KnowledgePaper, type AscendLink } from './KnowledgePaper';
import { GuidePanel } from './GuidePanel';
import { WelcomeOverlay } from './WelcomeOverlay';
import './workbench.css';

/**
 * BodyDay 空间工作台。
 *
 * 全站只有这一个「探索界面」：中央唯一的三维人体，左栏是结构与图层，
 * 右栏是随选中联动的知识纸条。人体 → 系统 → 器官 → 细胞之间的差别，
 * 只体现为**镜头位置与两侧面板内容的变化**，而不是换一套页面外壳。
 *
 * 这一点由两个设计决定保证：
 * 1. 路由不拆分组件树 —— 所有探索页面共用这一个组件实例，三维场景在整段探索中
 *    始终挂载，不会重新加载、也不会「先归位、再重新聚焦」；
 * 2. 选中状态是唯一的状态源 —— 模型点选、左栏点选、跨尺度跳转都写回同一份选中。
 */

interface WorkbenchModel {
  scale: Scale;
  /** 页面主体实体（人体 / 系统 / 器官 / 细胞） */
  entity?: BodyEntity;
  /** 页面所属解剖系统 */
  system?: SystemBrief;
  isCell: boolean;
  cellId: 'neuron' | 'leukocyte' | null;
  bundles: AtlasBundleId[];
  layers: string[] | null;
  /**
   * 本页的「入场取景结构」：进入页面时选中并聚焦它。
   *
   * 为什么不自己算机位：atlas 元数据的 `position` 不在渲染坐标系里，
   * 用它推机位会把相机放进网格内部。这里的做法是交给查看器——
   * 查看器会遍历真实网格算出包围盒，因此取景总是对的。
   */
  entryStructureId: string | null;
  isolationMode: 'selected' | null;
  /** 页面标题（用于屏幕阅读器与页面识别；界面上不重复显示） */
  pageTitle: string;
  subjectLabel: string;
  hudNote: string;
}

/** 未登记为实体的系统（如骨骼系统）用真实系统简介生成一张可读卡片，不编造内容 */
function systemAsEntity(system: SystemBrief): BodyEntity {
  return {
    id: system.id,
    nameZh: system.nameZh,
    nameEn: system.nameEn,
    kind: 'system',
    parentId: 'human',
    summary: system.brief,
    labels: [],
    sources: system.sourceIds,
    reviewStatus: 'reviewed',
  };
}

function buildModel(view: ResolvedView): WorkbenchModel {
  switch (view.kind) {
    case 'system': {
      const system = getSystem(view.systemId);
      const entity = getEntity(system?.id) ?? (system ? systemAsEntity(system) : undefined);
      const bundles = system?.bundle
        ? ([...BODY_CONTEXT_BUNDLES, system.bundle as AtlasBundleId] as AtlasBundleId[])
        : BODY_CONTEXT_BUNDLES;
      return {
        scale: 'system',
        entity,
        system,
        isCell: false,
        cellId: null,
        bundles,
        layers: system ? [system.atlasId] : null,
        // 系统页的入场取景结构在运行时从已加载清单里取（见 entryStructureId 派生）
        entryStructureId: null,
        isolationMode: null,
        pageTitle: system?.nameZh ?? '人体系统',
        subjectLabel: '当前系统',
        hudNote: system
          ? `${system.nameZh}已在人体中单独显示；左栏列出该系统的真实结构，点选即可聚焦。`
          : '该系统的结构已在人体中单独显示。',
      };
    }
    case 'organ': {
      const entity = getEntity(view.organId);
      const system = getSystem(entity?.parentId);
      const bundle = view.organId ? ENTITY_BUNDLE[view.organId] : undefined;
      return {
        scale: 'organ',
        entity,
        system,
        isCell: false,
        cellId: null,
        bundles: bundle
          ? ([...BODY_CONTEXT_BUNDLES, bundle] as AtlasBundleId[])
          : BODY_CONTEXT_BUNDLES,
        layers: system ? [system.atlasId] : null,
        entryStructureId: view.organId ? ENTITY_STRUCTURE[view.organId] ?? null : null,
        isolationMode: 'selected',
        pageTitle: entity?.nameZh ?? '器官',
        subjectLabel: '当前器官',
        hudNote: `镜头已聚焦${entity?.nameZh ?? '该器官'}；其余结构暂时隐藏，便于观察它本身。`,
      };
    }
    case 'cell': {
      const entity = getEntity(view.cellId);
      return {
        scale: 'cell',
        entity,
        system: undefined,
        isCell: true,
        cellId: view.cellId ?? null,
        bundles: [],
        layers: null,
        entryStructureId: null,
        isolationMode: null,
        pageTitle: entity?.nameZh ?? '细胞',
        subjectLabel: '当前细胞',
        hudNote: '细胞模型为程序化科学示意；点击模型热标或部件，右栏随之更新。',
      };
    }
    default: {
      const entity = getEntity('human');
      return {
        scale: 'body',
        entity,
        system: undefined,
        isCell: false,
        cellId: null,
        bundles: BODY_CONTEXT_BUNDLES,
        layers: null,
        // 全身取景：body-shell 是唯一覆盖整具人体的真实结构（236 个网格）
        entryStructureId: ATLAS_STRUCTURE_IDS.bodyShell,
        isolationMode: null,
        pageTitle: view.kind === 'cover' ? '身体的一天 · 首页' : '人体总览',
        subjectLabel: '人体总览',
        hudNote: '转动这具人体，或直接点选其中任一结构开始探索。',
      };
    }
  }
}

/** 当前页面上下文所对应的引导教学脚本 */
function lessonForModel(model: WorkbenchModel) {
  if (model.entity?.id === 'brain') return LESSONS.find((lesson) => lesson.id === 'neural');
  if (model.entity?.id === 'spleen') return LESSONS.find((lesson) => lesson.id === 'immune');
  if (model.entity?.id === 'heart') return LESSONS.find((lesson) => lesson.id === 'circulation');
  return LESSONS[0];
}

/**
 * 给一个真实结构取「可以给用户看」的名字。
 *
 * - 能映射到 BodyDay 实体 → 用实体的中文名；
 * - atlas 里名字本身就是内部 ID（全小写、与 ID 相同，如 `body-shell`）→ 不展示；
 * - 其余是真实的解剖英文名（如 `Cerebellum`），属于科学术语，可以展示。
 *
 * 这条规则是为了满足「界面不出现工程术语与字段名」的约束，
 * 同时又**不编造中文译名** —— 没有登记过中文名的结构宁可显示它的真实英文名。
 */
function readableStructureName(item: RailStructure): string | null {
  if (item.entityId) return ENTITY_MAP[item.entityId]?.nameZh ?? null;
  const name = item.name.trim();
  if (!name || name === item.id) return null;
  if (!/[A-Z ]/.test(name)) return null;
  return name;
}

export function ExploreWorkbench({ view }: { view: ResolvedView }) {
  const navigate = useNavigate();
  const { mode, setMode } = useAppMode();

  // 视图只依赖路径：同一路径重渲染时保持引用稳定，避免下游 memo 失效
  const model = useMemo(() => buildModel(view), [view.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const stage = useStageState(null);
  const { requestFocus, requestReset, selectEntity, markUserRotate } = stage;

  const [loaded, setLoaded] = useState<RailStructure[]>([]);
  const [structuresReady, setStructuresReady] = useState(false);

  const handleStructuresReady = useCallback((list: RailStructure[]) => {
    setLoaded(list);
    setStructuresReady(true);
  }, []);

  /* ---------- 左栏结构清单 ---------- */
  const activeLayer = model.layers && model.layers.length === 1 ? model.layers[0] : null;

  const structures = useMemo<RailStructure[]>(() => {
    if (model.isCell || model.scale === 'body') return [];
    const scoped = loaded
      .filter((item) => item.kind !== 'system')
      .filter((item) => !activeLayer || item.layer === activeLayer);

    /**
     * 同一器官下的细分结构会折叠成该器官的一项（例如脑区之下的两百多个细分结构 → 「大脑」）。
     * 这是有意的克制：左栏是一份可读的中文索引，而不是一份几百条英文解剖术语的清单；
     * 想要更细的结构，直接在模型上点选即可，右栏会给出现真实结构名。
     */
    const seen = new Set<string>();
    const labelled: RailStructure[] = [];
    for (const item of scoped) {
      const label = readableStructureName(item);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      labelled.push({ ...item, name: label });
    }

    const byName = (a: RailStructure, b: RailStructure) =>
      a.name.localeCompare(b.name, 'zh-Hans-CN');
    const preferred = labelled.filter((item) => item.kind === 'organ').sort(byName);
    const rest = labelled.filter((item) => item.kind !== 'organ').sort(byName);
    return [...preferred, ...rest].slice(0, 60);
  }, [loaded, model.isCell, model.scale, activeLayer]);

  /** 当前图层里真实存在多少条结构（未按展示口径折叠） */
  const layerScannedCount = useMemo(
    () =>
      activeLayer
        ? loaded.filter((item) => item.kind !== 'system' && item.layer === activeLayer).length
        : 0,
    [loaded, activeLayer],
  );

  /** 图层刚切换、结构尚未加载完成时，必须让用户看到「还在加载」而不是「没有结构」 */
  const loadingStructures =
    !structuresReady || (Boolean(activeLayer) && layerScannedCount === 0);

  /**
   * 入场取景结构：进入本页时选中并聚焦它，镜头便落在正确的结构上。
   * 系统页的根结构（`kind === 'system'`）只存在于模型清单里，因此从已加载数据中取。
   */
  const entryStructureId = useMemo(() => {
    if (model.isCell) return null;
    if (model.entryStructureId) return model.entryStructureId;
    if (model.scale === 'system' && activeLayer) {
      return loaded.find((item) => item.kind === 'system' && item.layer === activeLayer)?.id ?? null;
    }
    return null;
  }, [model.isCell, model.entryStructureId, model.scale, activeLayer, loaded]);

  const { structureId, setStructureId, info, setInfo } = useAtlasSelection(entryStructureId);

  /* ---------- 路由变化：更新选中与镜头，但不重挂场景 ---------- */
  const lastPath = useRef('');
  const appliedEntryRef = useRef('');
  useEffect(() => {
    if (model.isCell) {
      if (lastPath.current === view.path) return;
      lastPath.current = view.path;
      appliedEntryRef.current = `${view.path}|`;
      setStructureId(null);
      selectEntity(null);
      requestReset();
      if (model.entity) markDiscovered(model.entity.id);
      return;
    }
    if (!entryStructureId) return;
    const key = `${view.path}|${entryStructureId}`;
    if (appliedEntryRef.current === key) return;
    appliedEntryRef.current = key;
    lastPath.current = view.path;
    setStructureId(entryStructureId);
    selectEntity(null);
    // 取景交给查看器按真实网格包围盒完成，因此整段探索中镜头都是对的
    requestFocus(entryStructureId);
    if (model.entity) markDiscovered(model.entity.id);
  }, [view.path, entryStructureId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- 选中派生 ---------- */
  /** 选中的正是本页入场结构 → 对用户而言等于「没有选中任何子结构」 */
  const isEntrySelection =
    !model.isCell && Boolean(structureId) && structureId === entryStructureId;

  const selectedEntity = useMemo<BodyEntity | undefined>(() => {
    if (isEntrySelection) return undefined;
    if (model.isCell) {
      return stage.selectedEntityId ? ENTITY_MAP[stage.selectedEntityId] : undefined;
    }
    return info?.entityId ? ENTITY_MAP[info.entityId] : undefined;
  }, [isEntrySelection, model.isCell, stage.selectedEntityId, info]);

  useEffect(() => {
    if (selectedEntity) markDiscovered(selectedEntity.id);
  }, [selectedEntity]);

  const rawSelection =
    !model.isCell && !isEntrySelection && info && !info.entityId ? info : null;

  /** 面向上游展示时再清洗一次：绝不把内部 ID 当作结构名显示给用户 */
  const displayRawSelection = useMemo(() => {
    if (!rawSelection) return null;
    const name = rawSelection.name.trim();
    const readable = Boolean(name) && name !== rawSelection.structureId && /[A-Z ]/.test(name);
    return { ...rawSelection, name: readable ? name : '未命名结构' };
  }, [rawSelection]);

  const hasSelection = model.isCell
    ? Boolean(stage.selectedEntityId)
    : Boolean(structureId) && !isEntrySelection;
  const selectionIsDistinct = Boolean(selectedEntity && selectedEntity.id !== model.entity?.id);

  /** 真实结构名：让「点到了同一个器官的另一个区域」也立刻有反馈 */
  const currentStructureCaption = useMemo(() => {
    if (!info || model.isCell || isEntrySelection) return null;
    const owner = info.entityId ? ENTITY_MAP[info.entityId] : undefined;
    if (owner && owner.id === model.entity?.id) {
      return info.name === model.entity?.nameZh ? null : `${info.name}（归属${owner.nameZh}）`;
    }
    return null;
  }, [info, model.isCell, isEntrySelection, model.entity]);

  /* ---------- 交互 ---------- */
  const focusStructure = useCallback(
    (id: string) => {
      setStructureId(id);
      requestFocus(id);
    },
    [setStructureId, requestFocus],
  );

  const focusPart = useCallback(
    (id: string) => {
      requestFocus(id);
    },
    [requestFocus],
  );

  /** 回到本页默认取景：清空选中，并重新聚焦本页的入场结构 */
  const resetView = useCallback(() => {
    if (model.isCell) {
      selectEntity(null);
      requestReset();
      return;
    }
    if (entryStructureId) {
      setStructureId(entryStructureId);
      selectEntity(null);
      requestFocus(entryStructureId);
      return;
    }
    selectEntity(null);
    requestReset();
  }, [model.isCell, entryStructureId, setStructureId, selectEntity, requestFocus, requestReset]);

  const handleAtlasSelect = useCallback(
    (id: string | null) => {
      // 点模型空白处 = 取消选中并回到本页取景
      if (id === null) {
        if (hasSelection) resetView();
        return;
      }
      setStructureId(id);
    },
    [hasSelection, resetView, setStructureId],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (!hasSelection) return;
      event.preventDefault();
      resetView();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetView, hasSelection]);

  const cellParts = useMemo(
    () => (model.isCell && model.entity ? getChildren(model.entity.id) : null),
    [model.isCell, model.entity],
  );

  /* ---------- 右栏内容 ---------- */
  const relationSubjectId = selectionIsDistinct ? selectedEntity?.id : model.entity?.id;

  const relations = useMemo(() => {
    if (!relationSubjectId) return [];
    return relationsOf(relationSubjectId).slice(0, 8);
  }, [relationSubjectId]);

  const downTargets = useMemo<BodyEntity[]>(() => {
    const sourceId = model.entity?.id;
    if (!sourceId) return [];
    const seen = new Set<string>();
    const result: BodyEntity[] = [];
    for (const relation of relationsFrom(sourceId)) {
      const target = ENTITY_MAP[relation.toId];
      if (!target || !target.proceduralId) continue;
      if (relation.relationType !== 'extends_to' && target.kind !== 'cell') continue;
      if (seen.has(target.id)) continue;
      seen.add(target.id);
      result.push(target);
    }
    return result;
  }, [model.entity]);

  const ascend = useMemo<AscendLink | null>(() => {
    if (!model.entity?.parentId) return null;
    const parent = ENTITY_MAP[model.entity.parentId];
    if (!parent) return null;
    const to = routeForEntity(parent.id);
    if (!to || to === view.path) return null;
    return {
      to,
      label: `返回${parent.nameZh}`,
      note: `尺度回到${parent.nameZh}层：镜头拉远，模型随之整体呈现。`,
    };
  }, [model.entity, view.path]);

  const navigateScale = useCallback(
    (scale: Scale) => {
      if (scale === model.scale) return;
      const parent = model.entity?.parentId ? ENTITY_MAP[model.entity.parentId] : undefined;
      if (scale === 'body') {
        navigate(ROUTES.body);
        return;
      }
      if (scale === 'system') {
        const systemId =
          model.system?.id ?? (parent?.kind === 'system' ? parent.id : 'nervous-system');
        navigate(ROUTES.system(systemId));
        return;
      }
      if (scale === 'organ') {
        const organId = parent?.kind === 'organ' ? parent.id : 'brain';
        navigate(ROUTES.organ(organId));
        return;
      }
      navigate(ROUTES.cell('neuron'));
    },
    [model.scale, model.system, model.entity, navigate],
  );

  /* ---------- 引导教学模式：同一条纸条上的步骤引导 ---------- */
  const lesson = useMemo(() => lessonForModel(model), [model]);
  const learn = mode === 'learn' && Boolean(lesson);

  /**
   * 步骤号是**派生值**：脚本或模式一变，就自动回到第一步，
   * 而不是靠 effect 里再 setState 去同步——那样会多触发一轮渲染。
   */
  const guideKey = `${lesson?.id ?? ''}:${mode}`;
  const [guideNav, setGuideNav] = useState<{ key: string; step: number }>({ key: '', step: 0 });
  const guideStep = guideNav.key === guideKey ? guideNav.step : 0;
  const goToGuideStep = useCallback(
    (next: number) => {
      const total = lesson?.steps.length ?? 1;
      setGuideNav({ key: guideKey, step: Math.max(0, Math.min(total - 1, next)) });
    },
    [guideKey, lesson],
  );

  const navigatedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!learn || !lesson) return;
    const step = lesson.steps[guideStep];
    const targetId = step?.targetEntityId;
    if (!targetId) return;
    const target = ENTITY_MAP[targetId];
    if (!target) return;

    const targetPath = routeForEntity(targetId);
    if (targetPath && targetPath !== view.path) {
      navigatedForRef.current = targetPath;
      navigate(targetPath);
      return;
    }
    // 刚因引导跳转到本页：取景交给「路由变化」那支 effect，避免两条指令打架
    if (navigatedForRef.current === targetPath) {
      navigatedForRef.current = null;
      return;
    }

    if (target.kind === 'organelle') {
      requestFocus(targetId);
    } else if (target.kind === 'organ') {
      setStructureId(target.atlasStructureId ?? null);
      requestReset();
    } else {
      selectEntity(null);
      requestReset();
    }
  }, [learn, lesson, guideStep, view.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const guide =
    learn && lesson ? (
      <GuidePanel
        lesson={lesson}
        stepIndex={guideStep}
        onPrev={() => goToGuideStep(guideStep - 1)}
        onNext={() => goToGuideStep(guideStep + 1)}
        onExit={() => setMode('explore')}
      />
    ) : null;

  const railSystems = useMemo(
    () => SYSTEMS.filter((system) => system.id !== 'regional-anatomy'),
    [],
  );

  return (
    <div className="bd-workbench">
      <h1 className="bd-sr-only">{model.pageTitle}</h1>
      <StructureRail
        systems={railSystems}
        activeSystemId={model.system?.id ?? null}
        structures={structures}
        selectedStructureId={structureId}
        onFocusStructure={focusStructure}
        cellParts={cellParts}
        selectedPartId={stage.selectedEntityId}
        onFocusPart={focusPart}
        loadingStructures={loadingStructures}
      />

      <div className="bd-wb-column">
        <div className="bd-wb-stage" data-stage={model.isCell ? 'cell' : 'atlas'}>
          <StageBoundary label={`${model.entity?.nameZh ?? '人体'}三维舞台`}>
            {model.isCell && model.cellId ? (
              <CellStage
                cellId={model.cellId}
                state={stage}
                ariaLabel={`${model.entity?.nameZh ?? '细胞'}三维模型`}
              />
            ) : (
              <AtlasStage
                bundles={model.bundles}
                selectedStructureId={structureId}
                onSelectStructure={handleAtlasSelect}
                onStructureInfo={setInfo}
                onStructuresReady={handleStructuresReady}
                focusNonce={stage.focusNonce}
                resetNonce={stage.resetNonce}
                onInteractionStart={markUserRotate}
                isolationMode={model.isolationMode}
                visibleLayers={model.layers ?? undefined}
                ariaLabel={`${model.entity?.nameZh ?? '人体'}三维模型`}
              />
            )}
          </StageBoundary>

          <div className="bd-wb-hud">
            <span className="bd-label">
              尺度 ·
              {' '}
              {SCALE_MAP[model.scale]?.labelZh ?? model.scale}
            </span>
            <span className="bd-caption">{model.hudNote}</span>
          </div>

          <div className="bd-wb-hud-bottom">
            <span className="bd-caption">拖动旋转 · 滚轮缩放 · 点击结构选中 · Esc 取消</span>
          </div>

          <div className="bd-wb-stage__actions">
            <button type="button" className="bd-button bd-button--sm" onClick={resetView}>
              {hasSelection ? '取消选中 · 复位视角' : '复位视角'}
            </button>
          </div>

          {view.kind === 'cover' ? <WelcomeOverlay ready={structuresReady} /> : null}
        </div>
      </div>

      <KnowledgePaper
        scale={model.scale}
        onNavigateScale={navigateScale}
        entity={model.entity}
        selectedEntity={selectionIsDistinct ? selectedEntity : undefined}
        rawSelection={displayRawSelection}
        currentStructureCaption={currentStructureCaption}
        relations={relations}
        downTargets={downTargets}
        ascend={ascend}
        attribution={ATLAS_ATTRIBUTION_TEXT}
        subjectLabel={model.subjectLabel}
        guide={guide}
      />
    </div>
  );
}
