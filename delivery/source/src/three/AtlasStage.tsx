import { useEffect, useMemo, useRef, useState } from 'react';
import { VanatomeViewer } from '@vixotic/vanatome-react';
import type { VanatomeDisplayMode, VanatomeIsolationMode } from '@vixotic/vanatome-react';
import {
  ATLAS_STRUCTURE_IDS,
  buildStructureEntityIndex,
  organCameraFrame,
  structureSubtreeBounds,
  useAtlasComposition,
  type AtlasBundleId,
} from '../services/atlas';
import type { StructureSelection } from './atlasSelection';

/**
 * 人体 / 器官层舞台：VanatomeViewer 是唯一的人体三维渲染入口。
 *
 * 与 AgriScope 的「单活跃 Canvas」原则一致，但按 VanatomeViewer 的真实渲染器契约落地：
 * 该组件自带 Canvas，因此**不做侵入式改造**，而是由路由保证同一时刻只挂载一个舞台。
 *
 * 选中的结构 ID 由外层**受控**（因为用户可能选中一个 BodyDay 尚未建卡的解剖结构），
 * 舞台负责把它翻译成真实 atlas 元数据后再回调给外层。
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
  focusNonce: number;
  resetNonce: number;
  onInteractionStart?: () => void;
  /** 模型就绪时把已加载的真实结构清单交给外层渲染 */
  onStructuresReady?: (structures: { id: string; name: string; kind?: string; system: string; layer: string }[]) => void;
  isolationMode?: VanatomeIsolationMode | null;
  displayMode?: VanatomeDisplayMode;
  visibleLayers?: string[];
  alwaysVisibleIds?: string[];
  ariaLabel?: string;
  /**
   * 器官取景：给出一个结构 ID，舞台会在**模型就绪后**用该结构子树中
   * 真正带几何的结构位置推算取景，并据此设置初始机位。
   *
   * 为什么不用 `focusRequestKey`：`cerebrum` / `heart` 在 atlas 中是分组节点
   * （自身无网格），对它们发起聚焦会被查看器拒绝。
   */
  frameStructureId?: string | null;
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
  frameStructureId = null,
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
      })),
    );
    onStructuresReady?.(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyKey, composition.status]);

  const isolation = useMemo(() => {
    if (!isolationMode || !selectedStructureId) return null;
    return { id: selectedStructureId, mode: isolationMode };
  }, [isolationMode, selectedStructureId]);

  // 就绪后由子树真实几何范围推导入场机位（只算一次，用户旋转/缩放后不再干预）
  const initialFrame = useMemo(() => {
    if (!frameStructureId || composition.status !== 'ready') return null;
    const bounds = structureSubtreeBounds(composition.atlases, frameStructureId);
    return bounds ? organCameraFrame(bounds) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameStructureId, composition.status]);

  /**
   * 查看器在模型装配完成后会执行一次「整体拟合」动画，把镜头拉到整具人体，
   * 从而覆盖我们传入的入场机位。因此入场机位算出来后，需要主动请求一次复位
   * （查看器的 reset 会回到 initialCameraPosition / initialCameraTarget）。
   */
  const [readyReset, setReadyReset] = useState(0);
  const resetOnceRef = useRef(false);
  useEffect(() => {
    if (!initialFrame || resetOnceRef.current) return;
    resetOnceRef.current = true;
    const timer = window.setTimeout(() => setReadyReset((n) => n + 1), 1400);
    return () => window.clearTimeout(timer);
  }, [initialFrame]);

  if (composition.status === 'loading' || composition.status === 'idle') {
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

  if (composition.status === 'error' && composition.error) {
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
    <div className="bd-stage__canvas">
      <VanatomeViewer
        atlases={composition.atlases}
        selectedId={selectedStructureId}
        isolation={isolation}
        visibleLayers={visibleLayers}
        alwaysVisibleIds={alwaysVisibleIds}
        displayMode={displayMode}
        focusRequestKey={focusNonce}
        resetViewKey={resetNonce + readyReset}
        initialCameraPosition={initialFrame ? initialFrame.position : [0, 0, 8]}
        initialCameraTarget={initialFrame ? initialFrame.target : [0, 0, 0]}
        focusDistance={initialFrame ? initialFrame.distance * 0.9 : 4}
        focusPadding={1.3}
        minDistance={0.5}
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
  );
}
