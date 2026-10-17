import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CellStage, FullBodyStage } from '../../three/lazyStages';
import { useStageState } from '../../three/useStageState';
import { StageBoundary } from '../../components/StageBoundary';
import { useStartupActions } from '../../app/AppProviders';
import { routeForEntity, ROUTES } from '../../app/routes';
import type { ResolvedView } from '../../app/resolveView';
import {
  ENTITY_STRUCTURE,
  describeStructure,
  type StructureHit,
  type StructureInfo,
} from '../../services/atlas';
import { markDiscovered } from '../../services/progress';
import {
  ENTITY_MAP,
  RELATION_TYPE_LABEL,
  SCALE_MAP,
  getChildren,
  getEntity,
  getSystem,
  relationsFrom,
  relationsOf,
  type BodyEntity,
  type KnowledgeRelation,
  type Scale,
  type SystemBrief,
} from '../../domain';
import type { FullBodyProbe, FullBodyStats } from '../../three/FullBodyStage';
import { KnowledgePaper, type AscendLink, type DrillLink } from './KnowledgePaper';
import './workbench.css';

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
        hudNote: '真实解剖模型 · 从完整人体向内逐层探索',
        emptyHint: '点选任一结构，这里显示它的知识与健康关联。',
      };
    }
  }
}

/** 关系语义 → 是否可以当作「继续深入」的入口（不编造、不使用兜底关系） */
const DRILLABLE_TYPES = new Set(['extends_to', 'part_of', 'functional']);

/** 滚轮每格推进的拆解量：约 14 格走满 0 → 1，手感既连续又不至于太慢 */
const EXPLODE_WHEEL_STEP = 0.07;

export function ExploreWorkbench({ view }: { view: ResolvedView }) {
  const { reportProgress, reportReady } = useStartupActions();

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
    setHistory([]);
    setExplode(0);
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
  const handleSelect = useCallback((hit: StructureHit | null) => {
    if (!hit) {
      setHistory([]); // 点模型空白处 = 回到本页默认取景
      return;
    }
    const info = describeStructure(hit);
    setHistory((prev) => {
      const top = prev[prev.length - 1];
      // 同一目标不重复入栈，只更新它内部更细的那一层
      if (top && top.targetId === hit.targetId) {
        return [...prev.slice(0, -1), { targetId: hit.targetId, info }];
      }
      return [...prev, { targetId: hit.targetId, info }];
    });
    if (info.entityId) markDiscovered(info.entityId);
  }, []);

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

  /** 取消选中：回到选中前的视角，而不是页面的默认取景 */
  const resetView = useCallback(() => {
    if (model.isCell) {
      selectEntity(null);
      requestReset();
      return;
    }
    setHistory([]);
    setHovered(null);
  }, [model.isCell, selectEntity, requestReset]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const hasSelection = model.isCell ? Boolean(stage.selectedEntityId) : Boolean(current);
      if (!hasSelection) return;
      event.preventDefault();
      resetView();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetView, model.isCell, stage.selectedEntityId, current]);

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

  /** 在大脑页点到某个脑区这类情况：有归属，但内容仍然是本页主体的卡片 */
  const localSelection = useMemo(
    () =>
      selectionEntityId && selectionEntityId === model.entity?.id && current
        ? {
            name: current.info.name ?? model.entity?.nameZh ?? '本页主体',
            partName: current.info.partName,
            system: current.info.system,
          }
        : null,
    [selectionEntityId, model.entity, current],
  );

  const subjectEntityId = selectedEntity?.id ?? model.entity?.id;

  const relations = useMemo<KnowledgeRelation[]>(
    () => (subjectEntityId ? relationsOf(subjectEntityId).slice(0, 3) : []),
    [subjectEntityId],
  );

  /** 主体所属系统（用于「所属系统」一行，不引入任何新的医学内容） */
  const subjectSystem = useMemo(() => {
    const subject = selectedEntity ?? model.entity;
    const parent = subject?.parentId ? ENTITY_MAP[subject.parentId] : undefined;
    return parent?.nameZh ?? model.system?.nameZh ?? null;
  }, [selectedEntity, model.entity, model.system]);

  /** 继续深入：只走真实登记的关系，并且目标页面必须真实存在 */
  const drill = useMemo<DrillLink[]>(() => {
    const out: DrillLink[] = [];
    const seen = new Set<string>();

    /**
     * 选中了某个已登记器官时，先给出「进入它的器官页」。
     *
     * 这不是一条科学关系，而是一次**页面级入口**：在人体总览上点到心脏之后，
     * 用户需要一条明确的路径进入「心脏」这一页（聚焦、隔离、专题知识）。
     * 没有它，器官页就只能靠手输网址到达。
     */
    if (selectionEntityId && ENTITY_STRUCTURE[selectionEntityId]) {
      const to = ROUTES.organ(selectionEntityId);
      if (to !== view.path) {
        seen.add(to);
        out.push({
          to,
          label: `进入${ENTITY_MAP[selectionEntityId]?.nameZh ?? '该器官'}（单独观察）`,
          note: '镜头聚焦这个器官，并把其它结构暂时隐去。',
        });
      }
    }

    if (subjectEntityId && !model.isCell) {
      for (const relation of relationsFrom(subjectEntityId)) {
        if (!DRILLABLE_TYPES.has(relation.relationType)) continue;
        const target = ENTITY_MAP[relation.toId];
        if (!target) continue;
        if (target.kind === 'cell' && !target.proceduralId) continue;
        const to = routeForEntity(target.id);
        if (!to || to === view.path || seen.has(to)) continue;
        seen.add(to);
        out.push({
          to,
          label:
            relation.relationType === 'extends_to'
              ? `进入${target.nameZh}`
              : `查看${target.nameZh}`,
          note: `${RELATION_TYPE_LABEL[relation.relationType]}：${relation.description}`,
        });
      }
    }
    return out;
  }, [selectionEntityId, subjectEntityId, model.isCell, view.path]);

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

  const cellParts = useMemo(
    () => (model.isCell && model.entity ? getChildren(model.entity.id) : null),
    [model.isCell, model.entity],
  );

  return (
    <div className="bd-workbench" data-paper={sheetOpen ? 'open' : 'closed'}>
      <h1 className="bd-sr-only">{model.pageTitle}</h1>

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
                onlySystemId={model.onlySystemId}
                onReady={handleReady}
                onProbe={handleProbe}
                onProgress={reportProgress}
                ariaLabel={`${model.entity?.nameZh ?? '人体'}三维模型`}
              />
            )}
          </StageBoundary>

          <div className="bd-wb-hud">
            <span className="bd-label">
              尺度 · {SCALE_MAP[model.scale]?.labelZh ?? model.scale}
            </span>
            <span className="bd-caption">{model.hudNote}</span>
            {hovered && !model.isCell ? (
              <span className="bd-meta">
                指针指向：{hovered.name ?? '未命名结构'}
                {hovered.system ? ` · ${hovered.system}` : ''}
              </span>
            ) : null}
          </div>

          <div className="bd-wb-stage__bottom">
            {!model.isCell ? (
              <div className="bd-wb-explode">
                <span className="bd-label">拆解</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(explode * 100)}
                  aria-label="拆解进度"
                  data-testid="explode-slider"
                  onChange={(event) => setExplode(Number(event.target.value) / 100)}
                />
                <span className="bd-caption">{Math.round(explode * 100)}%</span>
              </div>
            ) : (
              <span className="bd-caption">{cellParts?.length ?? 0} 个可点选部件</span>
            )}

            <span className="bd-caption bd-wb-stage__hint bd-desktop-only">
              {model.isCell
                ? '拖动旋转 · 滚轮缩放 · 点击部件查看'
                : current
                  ? '滚轮深入观察 · 拖动旋转 · 点空白或 Esc 返回'
                  : '滚轮拆解/组装 · 拖动旋转 · 点击结构选中'}
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
        entity={model.entity}
        selection={model.isCell ? null : current?.info ?? null}
        selectedEntity={selectedEntity}
        localSelection={localSelection}
        subjectSystem={subjectSystem}
        relations={relations}
        drill={drill}
        ascend={ascend}
        emptyHint={model.emptyHint}
        canGoBack={canGoBack}
        onBack={goBackOne}
        sheetOpen={sheetOpen}
        onToggleSheet={() => setSheetOpen((open) => !open)}
      />
    </div>
  );
}