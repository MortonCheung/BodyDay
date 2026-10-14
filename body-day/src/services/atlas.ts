import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAtlasLoader, type AtlasLoaderWithProfiles, type LoadedAtlasCollection } from '@vixotic/vanatome-atlas';
import type { VanatomeAtlas } from '@vixotic/vanatome-react';

/**
 * Vanatome 官方 atlas 1.4.0 的加载与「按系统懒加载」封装。
 *
 * 说明：
 * - 官方 CDN 实测 `access-control-allow-origin: *`，可浏览器直载。
 * - 允许通过 `VITE_BODYDAY_ATLAS_URL` 指向自建镜像（同一 release 版本），
 *   以满足部署环境无法访问外网时的自托管需求。
 * - 组件不直接拼路径：一律通过本模块的具名常量与 Hook。
 */

/** 官方 release（实测 2026-10-14 可达，HTTP 200） */
export const OFFICIAL_CATALOG_URL =
  'https://atlas.vanatome.vixotic.in/releases/1.4.0/catalog.json';

export function resolveCatalogUrl(): string {
  const override = import.meta.env?.VITE_BODYDAY_ATLAS_URL as string | undefined;
  return override && override.trim().length > 0 ? override.trim() : OFFICIAL_CATALOG_URL;
}

/**
 * 实测存在于 atlas 1.4.0 metadata 中的结构 ID。
 * 任何聚焦/选中操作前都必须先在本表命中，禁止写死猜测 ID。
 */
export const ATLAS_STRUCTURE_IDS = {
  bodyShell: 'body-shell',
  skeleton: 'skeleton',
  cerebrum: 'cerebrum',
  cerebellum: 'cerebellum',
  brainstem: 'brainstem',
  heart: 'heart',
  cardiacInternalStructures: 'cardiac-internal-structures',
  spleen: 'spleen',
  lymphoidOrgans: 'lymphoid-organs',
} as const;

export type AtlasStructureId = (typeof ATLAS_STRUCTURE_IDS)[keyof typeof ATLAS_STRUCTURE_IDS];

/** bundle ↔ 系统映射（bundle id 与 catalog 实测一致） */
export const ATLAS_BUNDLES = {
  bodyShell: 'regional-anatomy',
  skeletal: 'skeletal',
  nervous: 'nervous',
  cardiovascular: 'cardiovascular',
  lymphatic: 'lymphatic',
  respiratory: 'respiratory',
  digestive: 'digestive',
  endocrine: 'endocrine',
  muscular: 'muscular',
  urinary: 'urinary',
  reproductive: 'reproductive',
} as const;

export type AtlasBundleId = (typeof ATLAS_BUNDLES)[keyof typeof ATLAS_BUNDLES];

/** 人体总览的稳定上下文：外壳 + 骨骼 */
export const BODY_CONTEXT_BUNDLES: AtlasBundleId[] = [ATLAS_BUNDLES.bodyShell, ATLAS_BUNDLES.skeletal];

/** BodyDay 实体 → 需要加载的 bundle */
export const ENTITY_BUNDLE: Record<string, AtlasBundleId> = {
  'nervous-system': ATLAS_BUNDLES.nervous,
  'cardiovascular-system': ATLAS_BUNDLES.cardiovascular,
  'lymphatic-system': ATLAS_BUNDLES.lymphatic,
  brain: ATLAS_BUNDLES.nervous,
  heart: ATLAS_BUNDLES.cardiovascular,
  spleen: ATLAS_BUNDLES.lymphatic,
};

export type AtlasLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AtlasLoadError {
  code: string;
  message: string;
  /** 面向用户的可执行建议 */
  hint: string;
}

function toLoadError(err: unknown): AtlasLoadError {
  const code = (err as { code?: string })?.code ?? 'unknown';
  const map: Record<string, string> = {
    'fetch-unavailable': '当前浏览器不支持网络请求（fetch）。',
    'catalog-fetch': '无法从官方 CDN 获取 atlas 目录，可能是网络不可达或被拦截。',
    'catalog-invalid': 'atlas 目录格式与预期不符。',
    'metadata-fetch': '无法获取该系统的结构清单。',
    'metadata-invalid': '该系统的结构清单格式异常。',
    'bundle-not-found': '该解剖系统在 atlas 中不存在。',
    'system-not-found': '未找到对应系统。',
    aborted: '请求已被取消。',
  };
  return {
    code,
    message: (err as Error)?.message ?? '解剖模型加载失败。',
    hint:
      map[code] ??
      '请检查网络后重试；若部署环境无法访问外网，可配置 VITE_BODYDAY_ATLAS_URL 指向自建镜像。',
  };
}

let sharedLoader: AtlasLoaderWithProfiles | null = null;

/** 同一个 loader 实例在会话内复用（catalog 只取一次） */
export function getAtlasLoader(): AtlasLoaderWithProfiles {
  if (!sharedLoader) {
    sharedLoader = createAtlasLoader({ catalogUrl: resolveCatalogUrl() });
  }
  return sharedLoader;
}

export interface AtlasCompositionState {
  status: AtlasLoadStatus;
  atlases: VanatomeAtlas[];
  systemIds: string[];
  error: AtlasLoadError | null;
  retry: () => void;
  /** 手动触发重新加载（例如外部条件变化） */
  reload: () => void;
}

/**
 * 按系统懒加载一组 bundle，并组合成可交给 VanatomeViewer 的 `atlases`。
 *
 * - 切换系统时只卸载/加载变化部分由 VanatomeViewer 处理；
 * - 组件卸载或依赖变化时中止过期请求；
 * - 失败时给出真实错误与重试入口，不白屏。
 */
export function useAtlasComposition(bundleIds: AtlasBundleId[]): AtlasCompositionState {
  const key = useMemo(() => [...bundleIds].sort().join('|'), [bundleIds]);
  const [status, setStatus] = useState<AtlasLoadStatus>('idle');
  const [collection, setCollection] = useState<LoadedAtlasCollection | null>(null);
  const [error, setError] = useState<AtlasLoadError | null>(null);
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!key) {
      setCollection(null);
      setStatus('idle');
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setError(null);

    getAtlasLoader()
      .loadSystems(key.split('|') as AtlasBundleId[], { signal: controller.signal, concurrency: 3 })
      .then((result) => {
        if (controller.signal.aborted) return;
        setCollection(result);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setCollection(null);
        setError(toLoadError(err));
        setStatus('error');
      });

    return () => controller.abort();
  }, [key, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const reload = retry;

  /**
   * 注意：必须在这里 memo 化返回的数组引用。
   * 若每次都返回 `[...collection.atlases]` 这样的新数组，
   * 上层所有以 `composition.atlases` 为依赖的 useMemo 都会每帧失效，
   * 进而触发「effect → setState → 重渲染 → effect」的无限更新循环。
   */
  const atlases = useMemo<VanatomeAtlas[]>(
    () => (collection ? [...collection.atlases] : []),
    [collection],
  );
  const systemIds = useMemo<string[]>(
    () => (collection ? [...collection.systemIds] : []),
    [collection],
  );

  return {
    status,
    atlases,
    systemIds,
    error,
    retry,
    reload,
  };
}

/** 判断某 atlas 结构 ID 是否真实存在于已加载的 atlases 中 */
export function hasStructure(atlases: readonly VanatomeAtlas[], structureId: string): boolean {
  return atlases.some((a) => a.structures.some((s) => s.id === structureId));
}

/** 取出某结构在 atlas 中登记的落点（用于渲染外部标注/兜底聚焦点） */
export function structurePosition(
  atlases: readonly VanatomeAtlas[],
  structureId: string,
): readonly [number, number, number] | null {
  for (const atlas of atlases) {
    const found = atlas.structures.find((s) => s.id === structureId);
    if (found) return found.position;
  }
  return null;
}

/** 在已加载 atlases 中查找真实结构（用于展示非 BodyDay 实体的结构信息） */
export function findStructure(
  atlases: readonly VanatomeAtlas[],
  structureId: string | null,
): { id: string; name: string; kind?: string; system: string } | null {
  if (!structureId) return null;
  for (const atlas of atlases) {
    const found = atlas.structures.find((s) => s.id === structureId);
    if (found) {
      return { id: found.id, name: found.name, kind: found.kind, system: found.system };
    }
  }
  return null;
}

export const SYSTEM_LABELS: Record<string, string> = {
  cardiovascular: '循环系统',
  digestive: '消化系统',
  endocrine: '内分泌系统',
  lymphatic: '淋巴系统',
  muscular: '肌肉系统',
  nervous: '神经系统',
  'regional-anatomy': '体表与区域解剖',
  reproductive: '生殖系统',
  respiratory: '呼吸系统',
  skeletal: '骨骼系统',
  urinary: '泌尿系统',
};

/** catalog 中实测存在的 11 个系统（按 BodyDay 的阅读顺序排列） */
export const ATLAS_SYSTEMS: { id: string; name: string; bundle: AtlasBundleId | null; open: boolean }[] = [
  { id: 'nervous', name: '神经系统', bundle: 'nervous', open: true },
  { id: 'cardiovascular', name: '循环系统', bundle: 'cardiovascular', open: true },
  { id: 'lymphatic', name: '淋巴系统', bundle: 'lymphatic', open: true },
  { id: 'skeletal', name: '骨骼系统', bundle: 'skeletal', open: false },
  { id: 'muscular', name: '肌肉系统', bundle: 'muscular', open: false },
  { id: 'respiratory', name: '呼吸系统', bundle: 'respiratory', open: false },
  { id: 'digestive', name: '消化系统', bundle: 'digestive', open: false },
  { id: 'endocrine', name: '内分泌系统', bundle: 'endocrine', open: false },
  { id: 'urinary', name: '泌尿系统', bundle: 'urinary', open: false },
  { id: 'reproductive', name: '生殖系统', bundle: 'reproductive', open: false },
  { id: 'regional-anatomy', name: '体表与区域解剖', bundle: 'regional-anatomy', open: false },
];

export function atlasAttribution(atlases: readonly VanatomeAtlas[]): string {
  const first = atlases[0];
  return first ? first.attribution : '';
}

/* ---------------- 结构 ID ↔ BodyDay 实体 ID 的双向映射 ---------------- */

/** BodyDay 关心的器官结构 → 其所属领域实体 */
const KEY_ORGAN_STRUCTURES: Record<string, string> = {
  cerebrum: 'brain',
  cerebellum: 'brain',
  brainstem: 'brain',
  heart: 'heart',
  'cardiac-internal-structures': 'heart',
  spleen: 'spleen',
  'lymphoid-organs': 'spleen',
};

/** 领域实体 → atlas 中用于聚焦的结构 ID（必须是真实存在的结构） */
export const ENTITY_STRUCTURE: Record<string, string> = {
  brain: ATLAS_STRUCTURE_IDS.cerebrum,
  heart: ATLAS_STRUCTURE_IDS.heart,
  spleen: ATLAS_STRUCTURE_IDS.spleen,
};

export function atlasStructureFor(entityId: string | null | undefined): string | null {
  if (!entityId) return null;
  return ENTITY_STRUCTURE[entityId] ?? null;
}

/**
 * 由已加载的 atlases 构建 `结构 ID → 领域实体 ID` 的映射。
 * 通过真实 `parentId` 链回溯，把子结构归属到 BodyDay 的器官实体，
 * 不使用任何猜测或兜底规则。
 */
export function buildStructureEntityIndex(
  atlases: readonly VanatomeAtlas[],
): Record<string, string> {
  const index: Record<string, string> = {};
  for (const atlas of atlases) {
    const byId = new Map(atlas.structures.map((s) => [s.id, s]));
    for (const structure of atlas.structures) {
      if (KEY_ORGAN_STRUCTURES[structure.id]) {
        index[structure.id] = KEY_ORGAN_STRUCTURES[structure.id];
        continue;
      }
      // 向上回溯到最近的已知器官结构
      let cursor = structure.parentId;
      let guard = 0;
      while (cursor && guard < 10) {
        if (KEY_ORGAN_STRUCTURES[cursor]) {
          index[structure.id] = KEY_ORGAN_STRUCTURES[cursor];
          break;
        }
        cursor = byId.get(cursor)?.parentId;
        guard += 1;
      }
    }
  }
  return index;
}

/** 从已加载 atlases 中取出某个器官实体的全部真实结构（用于结构清单） */
export function organStructures(
  atlases: readonly VanatomeAtlas[],
  organEntityId: string,
): VanatomeAtlas['structures'][number][] {
  const index = buildStructureEntityIndex(atlases);
  const result: VanatomeAtlas['structures'][number][] = [];
  for (const atlas of atlases) {
    for (const structure of atlas.structures) {
      if (structure.kind === 'system') continue;
      if (index[structure.id] === organEntityId) result.push(structure);
    }
  }
  return result;
}

export interface SubtreeBounds {
  center: [number, number, number];
  radius: number;
  geometryCount: number;
}

/**
 * 用**子树中真正带几何的结构位置**估算某个结构的空间范围。
 *
 * 为什么必须这样做：atlas 中 `cerebrum`、`heart`、`cerebellum`、`brainstem` 等
 * 是**分组节点**（`objectCount = 0`），它们自身没有网格，几何全部挂在子结构上。
 * 直接对这些 ID 发起「聚焦」会被查看器以 `structure-has-no-visible-geometry` 拒绝。
 * 因此器官层的取景改为：遍历子树中有几何的结构，用它们的真实位置算出中心与半径，
 * 再据此设置初始机位 —— 数据来自模型本身，不是猜测。
 */
export function structureSubtreeBounds(
  atlases: readonly VanatomeAtlas[],
  rootStructureId: string,
): SubtreeBounds | null {
  const points: [number, number, number][] = [];

  for (const atlas of atlases) {
    const byId = new Map(atlas.structures.map((s) => [s.id, s]));
    const isInSubtree = (startId: string): boolean => {
      let cursor: string | undefined = startId;
      let guard = 0;
      while (cursor && guard < 16) {
        if (cursor === rootStructureId) return true;
        cursor = byId.get(cursor)?.parentId;
        guard += 1;
      }
      return false;
    };
    for (const structure of atlas.structures) {
      if ((structure.objectCount ?? 0) > 0 && isInSubtree(structure.id)) {
        points.push(structure.position as [number, number, number]);
      }
    }
  }

  if (points.length === 0) return null;

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const zs = points.map((p) => p[2]);
  const center: [number, number, number] = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
    (Math.min(...zs) + Math.max(...zs)) / 2,
  ];
  const radius =
    Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
      Math.max(...zs) - Math.min(...zs),
    ) / 2;

  return { center, radius, geometryCount: points.length };
}

/**
 * 由子树范围推导「器官取景」的相机参数（中心 + 机位 + 建议距离）。
 *
 * 注意系数偏小的原因：atlas 的 `position` 是查看器的**兜底聚焦锚点**，
 * 并非真实几何包围盒 —— 实测其跨度明显大于模型的实际网格范围。
 * 因此按锚点跨度取景时需要收紧距离，否则器官在画面中会明显偏小。
 */
export function organCameraFrame(bounds: SubtreeBounds): {
  target: [number, number, number];
  position: [number, number, number];
  distance: number;
} {
  const [cx, cy, cz] = bounds.center;
  const distance = Math.max(bounds.radius * 0.62, 0.6);
  return {
    target: [cx, cy, cz],
    position: [cx + 0.06 * distance, cy + 0.22 * distance, cz + distance],
    distance,
  };
}
