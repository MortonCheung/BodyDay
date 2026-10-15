import { SYSTEM_MAP } from '../domain';

/**
 * 把 URL 解析成工作台视图。
 *
 * 为什么不直接用 react-router 的 `<Routes>`：
 * 工作台必须在整段探索过程中**始终挂载同一份三维场景**。
 * 若每个页面各自声明一条 Route，路由切换时 React 会卸载并重新挂载舞台，
 * 造成「地图先归位、再重新聚焦」式的画面跳动，也会重复加载模型。
 * 因此统一解析路径 → 同一棵组件树只更新 props。
 */
export type ViewKind =
  | 'cover'
  | 'body'
  | 'system'
  | 'organ'
  | 'cell'
  | 'about'
  | 'notfound';

export interface ResolvedView {
  kind: ViewKind;
  /** 归一化后的路径，用于过渡动画与依赖比较 */
  path: string;
  /** BodyDay 系统 ID（kind === 'system'） */
  systemId?: string;
  /** 器官 ID：brain / heart / spleen（kind === 'organ'） */
  organId?: string;
  /** 细胞 ID：neuron / leukocyte（kind === 'cell'） */
  cellId?: 'neuron' | 'leukocyte';
}

const ORGAN_IDS = new Set(['brain', 'heart', 'spleen']);
const CELL_IDS = new Set(['neuron', 'leukocyte']);

function normalize(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed.length === 0 ? '/' : trimmed;
}

export function resolveView(pathname: string): ResolvedView {
  const path = normalize(pathname);
  if (path === '/' || path === '') return { kind: 'cover', path: '/' };
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 1) {
    if (segments[0] === 'body') return { kind: 'body', path: '/body' };
    if (segments[0] === 'about') return { kind: 'about', path: '/about' };
  }

  if (segments.length === 2) {
    const [head, id] = segments;
    if (head === 'systems' && SYSTEM_MAP[id]) {
      return { kind: 'system', path, systemId: id };
    }
    if (head === 'organ' && ORGAN_IDS.has(id)) {
      return { kind: 'organ', path, organId: id };
    }
    if (head === 'cell' && CELL_IDS.has(id)) {
      return { kind: 'cell', path, cellId: id as 'neuron' | 'leukocyte' };
    }
  }

  return { kind: 'notfound', path };
}
