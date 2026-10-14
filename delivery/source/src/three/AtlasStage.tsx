import { useEffect, useMemo, useRef } from 'react';
import { VanatomeViewer } from '@vixotic/vanatome-react';
import type { VanatomeDisplayMode, VanatomeIsolationMode } from '@vixotic/vanatome-react';
import {
  ATLAS_STRUCTURE_IDS,
  buildStructureEntityIndex,
  useAtlasComposition,
  type AtlasBundleId,
} from '../services/atlas';
import type { StructureSelection } from './atlasSelection';

/**
 * 人体 / 器官层舞台：VanatomeViewer 是唯一的人体三维渲染入口。
 *
 * 取景原则（这是一次修正）：**镜头只由查看器基于真实网格包围盒的聚焦来决定**。
 * atlas 元数据里的 `position` 只是兜底锚点，并不处在渲染坐标系中；
 * 之前用它在外部推算初始机位，会把相机放进网格内部，画面全黑。
 * 因此这里不再计算任何自定义机位——需要看哪个结构，就选中并请求聚焦它。
 *
 * 关于「不卸载场景」：切换系统时会重新加载对应 bundle，但那只是数据变化，
 * 只要之前已经装配过模型，就保持查看器挂载、在原画面上给出加载提示，
 * 避免出现「先归位、再重新聚焦」的画面跳动。
 */

export type { StructureSelection };

export interface AtlasStageProps {
  bundles: AtlasBundleId[];
  /** 受控的选中结构 ID（真实 atlas 结构 ID） */
  selectedStructureId: string | null;
  /** 用户在 3D 中直接点选/取消结构 */
  onSelectStructure: (structureId: string | null) => void;
  /** 选中结构变化时回调真实元数据（含 3D 点击与外部受控变更） */
  onStructureInfo?: (selection: StructureSelection | null) => void;
  /** 递增即请求把镜头聚焦到当前选中结构（基于真实几何包围盒） */
  focusNonce: number;
  /** 递增即把镜头复位到初始机位 */
  resetNonce: number;
  onInteractionStart?: () => void;
  /** 模型就绪时把已加载的真实结构清单交给外层渲染 */
  onStructuresReady?: (
    structures: {
      id: string;
      name: string;
      kind?: string;
      system: string;
      layer: string;
      /** 能映射到 BodyDay 实体时给出实体 ID，否则为 null */
      entityId: string | null;
    }[],
  ) => void;
  isolationMode?: VanatomeIsolationMode | null;
  displayMode?: VanatomeDisplayMode;
  visibleLayers?: string[];
  alwaysVisibleIds?: string[];
  ariaLabel?: string;
}

export function AtlasStage({
  bundles,
  selectedStructureId,
  onSelectStructure,
  onStructureInfo,
  focusNonce,
  resetNonce,
  onInteractionStart,
  onStructuresReady,
  isolationMode = null,
  displayMode,
  visibleLayers,
  alwaysVisibleIds,
  ariaLabel,
}: AtlasStageProps) {
  const composition = useAtlasComposition(bundles);

  const entityIndex = useMemo(
    () => buildStructureEntityIndex(composition.atlases),
    [composition.atlases],
  );

  const structureById = useMemo(() => {
    const map = new Map<string, { name: string; kind?: string; system: string }>();
    for (const atlas of composition.atlases) {
      for (const s of atlas.structures) map.set(s.id, { name: s.name, kind: s.kind, system: s.system });
    }
    return map;
  }, [composition.atlases]);

  // 选中结构变化 → 上报真实元数据（含 3D 点击与外部控制两条路径）
  // 回调存进 ref，避免调用方传入内联函数时导致 effect 每次渲染都重跑
  const lastReportedRef = useRef<string | null>(null);
  const onInfoRef = useRef(onStructureInfo);
  useEffect(() => {
    onInfoRef.current = onStructureInfo;
  });

  useEffect(() => {
    if (!selectedStructureId) {
      if (lastReportedRef.current !== null) {
        lastReportedRef.current = null;
        onInfoRef.current?.(null);
      }
      return;
    }
    const meta = structureById.get(selectedStructureId);
    if (!meta) return; // 目标结构尚未加载完成，等模型就绪后再报
    // 去重：同一次会话内同一结构不重复上报，避免无意义的重渲染
    const reportKey = `${selectedStructureId}|${meta.system}`;
    if (lastReportedRef.current === reportKey) return;
    lastReportedRef.current = reportKey;
    onInfoRef.current?.({
      structureId: selectedStructureId,
      entityId: entityIndex[selectedStructureId] ?? null,
      name: meta.name,
      kind: meta.kind,
      system: meta.system,
    });
  }, [selectedStructureId, structureById, entityIndex]);

  // 模型就绪 → 把真实结构清单交给外层（用于结构列表与聚焦入口）
  const readyKey = composition.status === 'ready' ? composition.systemIds.join('|') : '';
  useEffect(() => {
    if (composition.status !== 'ready') return;
    const list = composition.atlases.flatMap((a) =>
      a.structures.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        system: s.system,
        layer: s.layer,
        entityId: entityIndex[s.id] ?? null,
      })),
    );
    onStructuresReady?.(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyKey, composition.status]);

  const isolation = useMemo(() => {
    if (!isolationMode || !selectedStructureId) return null;
    return { id: selectedStructureId, mode: isolationMode };
  }, [isolationMode, selectedStructureId]);

  // 已有模型时重新加载图层：保持场景挂载，只在画面上给一条提示
  const hasModel = composition.atlases.length > 0;

  if (!hasModel && (composition.status === 'loading' || composition.status === 'idle')) {
    return (
      <div className="bd-stage__canvas">
        <div className="bd-state">
          <p className="bd-state__title">正在加载人体解剖模型</p>
          <div className="bd-progress">
            <div className="bd-progress__bar" data-indeterminate="true" style={{ width: '40%' }} />
          </div>
          <p className="bd-state__detail">
            首次进入需要从官方 atlas 获取该系统的结构数据。已加载过的系统会更快。
          </p>
        </div>
      </div>
    );
  }

  if (!hasModel && composition.status === 'error' && composition.error) {
    return (
      <div className="bd-stage__canvas">
        <div className="bd-state" role="alert">
          <p className="bd-state__title">解剖模型加载失败</p>
          <p className="bd-state__detail">
            {composition.error.message}
            <br />
            {composition.error.hint}
          </p>
          <button type="button" className="bd-button" onClick={composition.retry}>
            重新加载
          </button>
          <p className="bd-caption">错误代码：{composition.error.code}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bd-stage__canvas">
        <VanatomeViewer
          atlases={composition.atlases}
          selectedId={selectedStructureId}
          isolation={isolation}
          visibleLayers={visibleLayers}
          alwaysVisibleIds={alwaysVisibleIds}
          displayMode={displayMode}
          focusRequestKey={focusNonce}
          resetViewKey={resetNonce}
          /* 初始机位只作为 Canvas 的起点；真正的取景一律交给「聚焦真实几何」 */
          initialCameraPosition={[0, 0, 6]}
          initialCameraTarget={[0, 0, 0]}
          focusDistance={0.4}
          focusPadding={1.35}
          minDistance={0.25}
          maxDistance={40}
          cameraAnimationDuration={820}
          enablePan
          ariaLabel={ariaLabel}
          onSelect={(id) => onSelectStructure(id)}
          onInteractionStart={() => onInteractionStart?.()}
          onFocusRejected={(id, reason) => {
            // 聚焦失败必须可见：否则用户会以为「没反应」，而实际是 ID 不存在或结构不可见
            console.warn('[BodyDay] 聚焦被拒绝：', id, reason);
          }}
          onError={(error) => {
            console.warn('[BodyDay] atlas model error:', error.code, error.message);
          }}
          appearance={{
            bodyShellId: ATLAS_STRUCTURE_IDS.bodyShell,
            skeletonId: ATLAS_STRUCTURE_IDS.skeleton,
            xrayOpacity: 0.22,
            ghostOpacity: 0.12,
            pulseSelection: false,
          }}
          loadingFallback={
            <div className="bd-state">
              <p className="bd-state__title">正在装配解剖模型</p>
              <div className="bd-progress">
                <div className="bd-progress__bar" data-indeterminate="true" style={{ width: '40%' }} />
              </div>
            </div>
          }
        />
      </div>

      {hasModel && composition.status === 'loading' ? (
        <div className="bd-stage__reloading" role="status">
          <span className="bd-stage__spinner" aria-hidden="true" />
          正在切换解剖图层，画面会保持在上一次的位置
        </div>
      ) : null}

      {hasModel && composition.status === 'error' ? (
        <div className="bd-stage__reloading" role="alert">
          <span>该图层加载失败</span>
          <button type="button" className="bd-chip" onClick={composition.retry}>
            重试
          </button>
        </div>
      ) : null}
    </>
  );
}
