/**
 * 返回上下文（最小可用版本）。
 *
 * 进入器官详解之前，保存「选中结构、展开程度、来源视图、相机取景」这四项可序列化状态，
 * 让「返回探索」能恢复选中结构、展开程度与相机取景，而不是碰运气地 navigate(-1)。
 *
 * - 三维对象**绝不写入** storage：这里只存结构 ID、数字与普通数组；
 * - 进程内用模块级 ref 保证同一次会话内即时可用；
 * - `sessionStorage` 只作刷新/深链情景的可序列化备份；
 * - 详情**直链**打开（无返回上下文）时，读取结果为 null，安全落到主探索。
 */

export interface ReturnSnapshot {
  /** 进入详情前选中的结构 ID（高亮/聚焦作用目标） */
  selectedStructureId: string | null;
  /** 进入详情前若已在某个器官页，记录其器官 ID */
  selectedOrganId: string | null;
  /** 展开程度 0..1 */
  explode: number;
  /** 来源视图（本工程路径） */
  view: string;
  /** 相机取景（可序列化：位置与观察目标） */
  camera: { position: [number, number, number]; target: [number, number, number] } | null;
}

const KEY = 'bd.return.v1';

let memory: ReturnSnapshot | null = null;

export function saveReturnContext(snapshot: ReturnSnapshot): void {
  memory = snapshot;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* 隐私模式等禁用 storage 时忽略：进程内 ref 仍可用 */
  }
}

export function readReturnContext(): ReturnSnapshot | null {
  if (memory) return memory;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    memory = JSON.parse(raw) as ReturnSnapshot;
    return memory;
  } catch {
    return null;
  }
}

export function clearReturnContext(): void {
  memory = null;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* 同上 */
  }
}
