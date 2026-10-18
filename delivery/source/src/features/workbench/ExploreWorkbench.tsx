import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CellStage, FullBodyStage } from '../../three/lazyStages';
import { useStageState } from '../../three/useStageState';
import { StageBoundary } from '../../components/StageBoundary';
import { useStartupActions } from '../../app/AppProviders';
import { ROUTES } from '../../app/routes';
import type { ResolvedView } from '../../app/resolveView';
import {
  ENTITY_STRUCTURE,
  STRUCTURE_LABELS,
  describeStructure,
  entityForStructure,
  type StructureHit,
  type StructureInfo,
} from '../../services/atlas';
import { markDiscovered } from '../../services/progress';
import {
  ENTITY_MAP,
  SYSTEMS,
  getChildren,
  getEntity,
  getSystem,
  type BodyEntity,
  type Scale,
  type SystemBrief,
} from '../../domain';
import {
  isVerifiedOrgan,
  organDisplayName,
  organTargetForStructure,
  resolveOrganDetail,
} from '../../integrations/organBridge';
import { clearReturnContext, readReturnContext, saveReturnContext } from './returnContext';
import type { FullBodyProbe, FullBodyStats } from '../../three/FullBodyStage';
import { KnowledgePaper, type DrillLink } from './KnowledgePaper';
import { buildStructureCard, type StructureCardData } from '../../domain/structureCard';
import './workbench.css';

/** 结构类别的中文名：只由已登记实体的真实 kind 推导，不猜、不编 */
const ENTITY_KIND_LABEL: Record<string, string> = {
  body: '整体',
  system: '系统',
  organ: '器官',
  cell: '细胞',
};

/**
 * BodyDay 空间工作台（V2）。
 *
 * 全站只有这一个探索界面：中央是一具**真实的人体模型**，
 * 人体 → 系统 → 器官 → 细胞之间的差别只体现为**镜头与右纸条内容的变化**，
 * 而不是换一套页面外壳。三件事因此被固定下来：
 *
 * 1. 结构选择完全由三维模型承担 —— 点选、聚焦、隔离、逐层拆解都在模型上发生；
 * 2. 路由不拆分组件树 —— 所有探索页面共用同一个组件实例，场景不会被重新挂载；
 * 3. 选中是一段可回退的层级栈 —— 「返回上一级」回到上一次点选，而不是清空一切。
 */

/** 一次点选在层级栈里的记录 */
interface BodySelection {
  /** 高亮 / 隔离 / 聚焦的作用目标 */
  targetId: string;
  info: StructureInfo;
}

interface WorkbenchModel {
  scale: Scale;
  /** 页面主体实体（人体 / 系统 / 器官 / 细胞） */
  entity?: BodyEntity;
  /** 页面所属解剖系统 */
  system?: SystemBrief;
  isCell: boolean;
  cellId: 'neuron' | 'leukocyte' | null;
  /** 系统页只显示该解剖系统；其余页面为 null（显示整具人体） */
  onlySystemId: string | null;
  /** 进入本页时聚焦并高亮的结构（器官页为整具器官；其余为 null，取景整具人体） */
  entryStructureId: string | null;
  /** 进入本页时是否隔离显示（器官页为 true） */
  entryIsolate: boolean;
  pageTitle: string;
  subjectLabel: string;
  hudNote: string;
  emptyHint: string;
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

/**
 * 「返回探索」时用结构 ID 还原一次选中。
 *
 * 只用已登记结构的中文名与实体映射重建一个最小 `StructureInfo`；真实解剖名与
 * 具体脑区名无法从 ID 复原时留空——相机取景与高亮只依赖 `targetId`，不受影响。
 */
function structureInfoForTarget(targetId: string): StructureInfo {
  return {
    structureId: targetId,
    entityId: entityForStructure(targetId),
    name: STRUCTURE_LABELS[targetId] ?? null,
    system: null,
    partName: null,
    depthToKnown: 0,
  };
}

function buildModel(view: ResolvedView): WorkbenchModel {
  switch (view.kind) {
    case 'system': {
      const system = getSystem(view.systemId);
      const entity = getEntity(system?.id) ?? (system ? systemAsEntity(system) : undefined);
      return {
        scale: 'system',
        entity,
        system,
        isCell: false,
        cellId: null,
        onlySystemId: system?.atlasId ?? null,
        entryStructureId: null,
        entryIsolate: false,
        pageTitle: system?.nameZh ?? '人体系统',
        subjectLabel: '当前系统',
        hudNote: system ? `${system.nameZh} · 点选任一结构查看` : '点选任一结构查看',
        emptyHint: '点选任一结构，这里显示它的知识与健康关联。',
      };
    }
    case 'organ': {
      const entity = getEntity(view.organId);
      const system = getSystem(entity?.parentId);
      return {
        scale: 'organ',
        entity,
        system,
        isCell: false,
        cellId: null,
        onlySystemId: null,
        entryStructureId: view.organId ? ENTITY_STRUCTURE[view.organId] ?? null : null,
        entryIsolate: true,
        pageTitle: entity?.nameZh ?? '器官',
        subjectLabel: '当前器官',
        hudNote: `${entity?.nameZh ?? '该器官'}已聚焦 · 点选局部结构查看`,
        emptyHint: `点这个器官上的任意位置，查看它内部的结构。`,
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
        onlySystemId: null,
        entryStructureId: null,
        entryIsolate: false,
        pageTitle: entity?.nameZh ?? '细胞',
        subjectLabel: '当前细胞',
        hudNote: '点选模型部件查看它在细胞里的作用',
        emptyHint: '点选任一部件，查看它在细胞里的作用。',
      };
    }
    case 'detail': {
      /* 器官详解：只接受已核实几何存在的器官；未核实则安全回退到人体探索 */
      const spec = resolveOrganDetail(view.organId);
      const entity = spec?.entity;
      const system = getSystem(entity?.parentId);
      return {
        scale: 'organ',
        entity,
        system,
        isCell: false,
        cellId: null,
        onlySystemId: null,
        entryStructureId: spec?.structureId ?? null,
        entryIsolate: true,
        pageTitle: entity?.nameZh ?? '器官详解',
        subjectLabel: '当前器官',
        hudNote: `${entity?.nameZh ?? '该器官'}已聚焦 · 点选局部结构查看`,
        emptyHint: '点这个器官上的任意位置，查看它内部的结构。',
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
        onlySystemId: null,
        // 全身取景交回舞台：基于真实包围盒自适应，不写死机位
        entryStructureId: null,
        entryIsolate: false,
        pageTitle: view.kind === 'cover' ? '身体的一天 · 首页' : '人体总览',
        subjectLabel: '人体总览',
        hudNote: '',
        emptyHint: '点选任一结构，这里显示它的知识与健康关联。',
      };
    }
  }
}

/** 滚轮每格推进的拆解量：约 14 格走满 0 → 1，手感既连续又不至于太慢 */
const EXPLODE_WHEEL_STEP = 0.07;

/**
 * 「点一下就进入器官详解」的入口深度。
 *
 * 0 = 只有点到该器官结构本身才跳转（脑：端脑 / 小脑 / 脑干）；
 * 1 = 允许直接子结构（心脏的四个腔、肺的五个叶——它们是该器官唯一可点的几何）；
 * 更深层的局部（脑回、脑沟等）**不跳转**，留在人体探索里看它自己的知识。
 * 全部来自 `organBridge` 已核实的器官，不做字符串猜测。
 */
const ORGAN_ENTRY_DEPTH: Record<string, number> = {
  heart: 1,
  lungs: 1,
  brain: 0,
  spleen: 0,
};

export function ExploreWorkbench({ view }: { view: ResolvedView }) {
  const { reportProgress, reportReady } = useStartupActions();
  const navigate = useNavigate();

  const model = useMemo(() => buildModel(view), [view.path]); // eslint-disable-line react-hooks/exhaustive-deps
  const stage = useStageState(null);
  const { requestReset, selectEntity } = stage;

  /* ---------- 人体层状态 ---------- */
  const [history, setHistory] = useState<BodySelection[]>([]);
  const [explode, setExplode] = useState(0);
  const [focusNonce, setFocusNonce] = useState(0);
  const [resetNonce, setResetNonce] = useState(0);
  const [hovered, setHovered] = useState<StructureInfo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** 左操作栏的系统筛选（atlas 系统 ID）；null = 显示全部系统 */
  const [systemFilter, setSystemFilter] = useState<string | null>(null);
  /** 舞台就绪后上报的真实统计：系统可见网格数、器官局部结构 */
  const [stageStats, setStageStats] = useState<FullBodyStats | null>(null);

  const current = history.length > 0 ? history[history.length - 1] : null;
  const canGoBack = history.length > 1;

  /* ---------- 真实加载：进度与就绪都来自舞台自己 ---------- */
  const devState = useRef<Record<string, unknown>>({});
  const exposeDevState = useCallback(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__BODYDAY_STAGE__ = devState.current;
  }, []);

  const handleReady = useCallback(
    (stats: FullBodyStats) => {
      devState.current.stats = stats;
      setStageStats(stats);
      exposeDevState();
      reportReady();
    },
    [exposeDevState, reportReady],
  );

  const handleProbe = useCallback(
    (probe: FullBodyProbe) => {
      devState.current.probe = probe;
      exposeDevState();
    },
    [exposeDevState],
  );

  /* ---------- 路由变化：清空层级栈、回到装配态，并重新取景 ---------- */
  const lastPath = useRef('');
  useEffect(() => {
    if (lastPath.current === view.path) return;
    lastPath.current = view.path;
    /**
     * 「返回探索」：若存在返回上下文且目标就是人体探索，用它恢复选中结构、展开程度
     * 与相机取景（相机由 focusNonce + selectedStructureId 的聚焦逻辑复原）。
     * 详情**直链**打开时读不到上下文，走下面的默认重置。
     */
    const snapshot = view.kind === 'body' ? readReturnContext() : null;
    if (snapshot) {
      setHistory(
        snapshot.selectedStructureId
          ? [
              {
                targetId: snapshot.selectedStructureId,
                info: structureInfoForTarget(snapshot.selectedStructureId),
              },
            ]
          : [],
      );
      setExplode(Math.min(1, Math.max(0, snapshot.explode)));
      setSystemFilter(snapshot.systemFilter ?? null);
      clearReturnContext();
    } else {
      setHistory([]);
      setExplode(0);
      setSystemFilter(null);
    }
    setHovered(null);
    setFocusNonce((n) => n + 1);
    setResetNonce((n) => n + 1);
    if (!model.isCell && model.entity) markDiscovered(model.entity.id);
  }, [view.path]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 取景目标：当前选中优先，其次本页入场结构 */
  const focusTargetId = current?.targetId ?? model.entryStructureId;
  /**
   * 页面级隔离只在器官页生效：那一页的语义就是「只观察这一个器官」。
   * 其余页面（含人体总览）选中结构时**只淡化**其它结构，保留完整人体的空间上下文。
   */
  const isolateStructureId = model.entryIsolate ? model.entryStructureId : null;

  /** 系统筛选：左操作栏的显式选择优先，否则用页面自带的系统视图 */
  const effectiveOnlySystemId = systemFilter ?? model.onlySystemId;
  /**
   * 左操作栏只在「整具人体可被系统筛选」的页面出现（人体探索 / 系统页）。
   * 器官页与器官详解页已经隔离单个器官，细胞页没有系统概念——这些页面不出现左栏，
   * 不为填空间堆重复内容（手册 §3.2）。
   */
  const showControls = !model.isCell && !model.entryIsolate;

  useEffect(() => {
    devState.current.view = {
      kind: view.kind,
      path: view.path,
      focusTargetId,
      isolateStructureId,
      explode,
      pageEntityId: model.entity?.id ?? null,
    };
    exposeDevState();
  }, [
    exposeDevState,
    view.kind,
    view.path,
    focusTargetId,
    isolateStructureId,
    explode,
    model.entity,
    current?.info.name,
  ]);

  /* ---------- 交互 ---------- */

  /**
   * 左操作栏只列出**当前真实可见**的系统。
   * `systemMeshCount` 来自舞台实测（已扣除公开展示过滤），
   * 因此不会出现「点了之后画面全空」的筛选项（例如生殖系统）。
   */
  const availableSystems = useMemo(() => {
    const counts = stageStats?.systemMeshCount ?? null;
    if (!counts) return SYSTEMS;
    return SYSTEMS.filter((system) => (counts[system.atlasId] ?? 0) > 0);
  }, [stageStats]);

  /**
   * 切换系统筛选。
   *
   * 可见范围变了，旧选中 / 历史 / 熄灭中的聚焦目标都必须一起清掉：
   * 否则焦点会指向已经被隐藏的网格，表现为「点了没反应、镜头不动、右栏还是上一个器官」。
   * 同时递增 resetNonce，让相机按新系统的真实包围盒重新取景。
   */
  const handleSystemFilter = useCallback((next: string | null) => {
    setSystemFilter(next);
    setHistory([]);
    setHovered(null);
    setFocusNonce((n) => n + 1);
    setResetNonce((n) => n + 1);
  }, []);

  const handleSelect = useCallback(
    (hit: StructureHit | null) => {
      /* 空白处：分层返回。详情页先取消热点，没有热点时回到人体探索 */
      if (!hit) {
        if (view.kind === 'detail') {
          if (current) {
            setHistory([]);
            return;
          }
          navigate(ROUTES.explore);
          return;
        }
        setHistory([]); // 点模型空白处 = 回到本页默认取景
        return;
      }

      const info = describeStructure(hit);

      /**
       * 点中**完整器官本体**时直接进入器官详解。
       * 只在 organBridge 已核实的器官、且点击深度属于「本体 / 直接子结构」时触发；
       * 脑回、脑沟这类更深的局部留在当前页显示它自己的知识。
       */
      const organId = organTargetForStructure(hit.targetId);
      if (organId && isVerifiedOrgan(organId) && view.kind !== 'detail') {
        const allowedDepth = ORGAN_ENTRY_DEPTH[organId] ?? 0;
        const isOrganBody = info.depthToKnown >= 0 && info.depthToKnown <= allowedDepth;
        if (isOrganBody) {
          const probe = devState.current.probe as FullBodyProbe | undefined;
          saveReturnContext({
            selectedStructureId: null,
            selectedOrganId: organId,
            explode,
            systemFilter,
            view: view.path,
            camera: probe
              ? { position: probe.camera.position, target: probe.camera.target }
              : null,
          });
          navigate(ROUTES.detail(organId));
          return;
        }
      }

      setHistory((prev) => {
        const top = prev[prev.length - 1];
        // 同一目标不重复入栈，只更新它内部更细的那一层
        if (top && top.targetId === hit.targetId) {
          return [...prev.slice(0, -1), { targetId: hit.targetId, info }];
        }
        return [...prev, { targetId: hit.targetId, info }];
      });
      if (info.entityId) markDiscovered(info.entityId);
    },
    [current, explode, navigate, systemFilter, view.kind, view.path],
  );

  const handleHover = useCallback((hit: StructureHit | null) => {
    setHovered(hit ? describeStructure(hit) : null);
  }, []);

  const goBackOne = useCallback(() => setHistory((prev) => prev.slice(0, -1)), []);

  /**
   * 滚轮拆解：每格推进/回退一个固定步长，钳制在 [0,1]。
   * 只在未选中结构时由舞台调用（选中后滚轮用于观察当前结构）。
   */
  const handleExplodeWheel = useCallback((direction: 1 | -1) => {
    setExplode((value) => Math.min(1, Math.max(0, value + direction * EXPLODE_WHEEL_STEP)));
  }, []);

  /** 取消选中：回到选中前的视角，而不是页面的默认取景；详情页无热点时返回探索 */
  const resetView = useCallback(() => {
    if (model.isCell) {
      selectEntity(null);
      requestReset();
      return;
    }
    if (view.kind === 'detail' && !current) {
      navigate(ROUTES.explore);
      return;
    }
    setHistory([]);
    setHovered(null);
  }, [model.isCell, selectEntity, requestReset, view.kind, current, navigate]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      /* 详情页即使没有热点，Esc 也要能返回探索（分层语义与点空白一致） */
      if (model.isCell) {
        if (!stage.selectedEntityId) return;
      } else if (!current && view.kind !== 'detail') {
        return;
      }
      event.preventDefault();
      resetView();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetView, model.isCell, stage.selectedEntityId, current, view.kind]);

  /* ---------- 选中派生 ---------- */
  const selectionEntityId = model.isCell ? null : current?.info.entityId ?? null;

  const selectedEntity = useMemo<BodyEntity | undefined>(() => {
    if (model.isCell) {
      return stage.selectedEntityId ? ENTITY_MAP[stage.selectedEntityId] : undefined;
    }
    if (!selectionEntityId) return undefined;
    // 选中的就是本页主体时，不重复展示一遍同样的卡片
    return selectionEntityId === model.entity?.id ? undefined : ENTITY_MAP[selectionEntityId];
  }, [model.isCell, model.entity, selectionEntityId, stage.selectedEntityId]);

  /**
   * 未编入科普卡的可选中结构 → 一张只讲真实事实的结构卡。
   *
   * 事实来自本作品实际渲染的解剖图谱元数据（结构名、所属系统、解剖父链）；
   * 元数据里没有经人工核对的内容时就不写，绝不编造，也不再出现「尚未编入」这类防御句。
   */
  const structureCard = useMemo<StructureCardData | null>(() => {
    if (!current || selectedEntity) return null;
    const info = current.info;
    const mapped = info.entityId ? ENTITY_MAP[info.entityId] : undefined;
    return buildStructureCard({
      name: info.name,
      partName: info.partName,
      system: info.system,
      entityKind: mapped?.kind ?? null,
      kindLabels: ENTITY_KIND_LABEL,
      isPageSubject: Boolean(info.entityId && info.entityId === model.entity?.id),
    });
  }, [current, selectedEntity, model.entity]);

  const isDetail = view.kind === 'detail';

  /** 详情页的局部结构热点：只来自舞台实测的真实直接子结构 */
  const detailParts = useMemo(() => {
    if (!isDetail) return [];
    const organId = model.entryStructureId;
    if (!organId) return [];
    return stageStats?.organParts?.[organId] ?? [];
  }, [isDetail, model.entryStructureId, stageStats]);

  /**
   * 纸条主体：选中映射到实体时讲它；否则讲本页主体。
   * 人体层未选中结构时**不重复展示**「人体总览」这张固定默认卡，只给一句引导。
   */
  const paperSubject = useMemo<BodyEntity | undefined>(() => {
    if (structureCard) return undefined;
    if (selectedEntity) return selectedEntity;
    if (model.scale === 'body') return undefined;
    return model.entity;
  }, [structureCard, selectedEntity, model]);

  /**
   * 右上唯一的跨页入口：`查看器官详解 →`。
   * 只在当前对象（选中结构，或本页入场结构）能沿**已核实映射**落到一个合法器官、
   * 且目标页不是当前页时出现；映射未核实时不传任何按钮，绝不造假入口（手册 §3.4 / §7.4）。
   */
  const drill = useMemo<DrillLink | null>(() => {
    if (isDetail) return null;
    const structureId = current?.targetId ?? model.entryStructureId ?? null;
    const organId = organTargetForStructure(structureId);
    if (!organId || !isVerifiedOrgan(organId)) return null;
    const to = ROUTES.detail(organId);
    if (to === view.path) return null;
    const name = organDisplayName(organId) ?? '该器官';
    return { to, label: '查看器官详解', note: `进入「${name}」的独立页面，只观察这一个器官。` };
  }, [isDetail, current, model.entryStructureId, view.path]);

  /** 进入详情前保存返回上下文：结构 ID / 展开程度 / 系统筛选 / 来源视图 / 相机取景 */
  const handleDrillNavigate = useCallback(() => {
    const probe = devState.current.probe as FullBodyProbe | undefined;
    saveReturnContext({
      selectedStructureId: current?.targetId ?? model.entryStructureId ?? null,
      selectedOrganId: view.organId ?? null,
      explode,
      systemFilter,
      view: view.path,
      camera: probe ? { position: probe.camera.position, target: probe.camera.target } : null,
    });
  }, [current, model.entryStructureId, explode, systemFilter, view.organId, view.path]);

  const cellParts = useMemo(
    () => (model.isCell && model.entity ? getChildren(model.entity.id) : null),
    [model.isCell, model.entity],
  );

  return (
    <div className="bd-workbench" data-paper={sheetOpen ? 'open' : 'closed'} data-control={showControls ? 'on' : 'off'}>
      <h1 className="bd-sr-only">{model.pageTitle}</h1>

      {showControls ? (
        <aside className="bd-wb-control" aria-label="系统筛选">
          <div className="bd-wb-control__block">
            <div className="bd-wb-control__chips">
              <button
                type="button"
                className="bd-chip"
                data-active={systemFilter === null}
                onClick={() => handleSystemFilter(null)}
              >
                全部
              </button>
              {availableSystems.map((system) => (
                <button
                  key={system.atlasId}
                  type="button"
                  className="bd-chip"
                  data-active={systemFilter === system.atlasId}
                  onClick={() =>
                    handleSystemFilter(systemFilter === system.atlasId ? null : system.atlasId)
                  }
                >
                  {system.nameZh}
                </button>
              ))}
            </div>
          </div>

          {current?.info.name ? (
            <p className="bd-wb-control__status">{current.info.name}</p>
          ) : null}
        </aside>
      ) : null}

      <div className="bd-wb-column">
        <div className="bd-wb-stage" data-stage={model.isCell ? 'cell' : 'body'}>
          <StageBoundary label={`${model.entity?.nameZh ?? '人体'}三维舞台`}>
            {model.isCell && model.cellId ? (
              <CellStage
                cellId={model.cellId}
                state={stage}
                ariaLabel={`${model.entity?.nameZh ?? '细胞'}三维模型`}
              />
            ) : (
              <FullBodyStage
                progress={explode}
                selectedStructureId={focusTargetId}
                onSelectStructure={handleSelect}
                onHoverStructure={handleHover}
                focusNonce={focusNonce}
                resetNonce={resetNonce}
                onExplodeWheel={handleExplodeWheel}
                isolateStructureId={isolateStructureId}
                onlySystemId={effectiveOnlySystemId}
                onReady={handleReady}
                onProbe={handleProbe}
                onProgress={reportProgress}
                ariaLabel={`${model.entity?.nameZh ?? '人体'}三维模型`}
              />
            )}
          </StageBoundary>

          <div className="bd-wb-hud">
            {hovered && !model.isCell ? (
              <span className="bd-meta">
                {hovered.name ?? ''}
                {hovered.name && hovered.system ? ' · ' : ''}
                {hovered.system ?? ''}
              </span>
            ) : null}
          </div>

          {/* 详情页专用：这个器官的真实局部结构，点一下就聚焦到它 */}
          {isDetail && detailParts.length > 0 ? (
            <div className="bd-wb-parts" aria-label="局部结构">
              {detailParts.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  className="bd-chip"
                  data-active={
                    current?.info.structureId === part.id || current?.targetId === part.id
                  }
                  onClick={() =>
                    setHistory([
                      {
                        targetId: part.id,
                        info: {
                          structureId: part.id,
                          entityId: null,
                          name: part.name,
                          system: null,
                          partName: null,
                          depthToKnown: 1,
                        },
                      },
                    ])
                  }
                >
                  {part.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="bd-wb-stage__bottom">
            {!model.isCell && !isDetail ? (
              <div className="bd-wb-explode">
                <span className="bd-label">展开</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(explode * 100)}
                  aria-label="展开进度"
                  data-testid="explode-slider"
                  onChange={(event) => setExplode(Number(event.target.value) / 100)}
                />
                <span className="bd-caption">{Math.round(explode * 100)}%</span>
              </div>
            ) : model.isCell ? (
              <span className="bd-caption">{cellParts?.length ?? 0} 个可点选部件</span>
            ) : null}

            <span className="bd-caption bd-wb-stage__hint bd-desktop-only">
              {model.isCell || isDetail ? '' : current ? '点空白返回' : '滚动展开'}
            </span>

            <button
              type="button"
              className="bd-button bd-button--sm bd-mobile-only"
              onClick={() => setSheetOpen((open) => !open)}
            >
              {sheetOpen ? '收起知识' : '查看知识'}
            </button>
          </div>
        </div>
      </div>

      <KnowledgePaper
        subject={paperSubject}
        selection={model.isCell ? null : current?.info ?? null}
        structureCard={structureCard}
        drill={drill}
        isDetail={isDetail}
        returnTo={ROUTES.explore}
        onDrillNavigate={handleDrillNavigate}
        emptyHint={model.emptyHint}
        canGoBack={canGoBack}
        onBack={goBackOne}
        sheetOpen={sheetOpen}
        onToggleSheet={() => setSheetOpen((open) => !open)}
      />
    </div>
  );
}