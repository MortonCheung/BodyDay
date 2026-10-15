/**
 * 本地学习记录（localStorage 足够，不为轻量学习记录新建后端）。
 *
 * V2 之后这里只保留「已发现结构」。
 * 旧版把「自由探索 / 引导教学」模式写进本地存储，那个模式已经取消，
 * 相应字段一并删除 —— 否则旧数据会在新界面上留下无意义的残留状态。
 * 已有的课程与测验数据仍作为历史内容资产保留在 `domain/lessons.ts`。
 */

const KEY_DISCOVERED = 'bodyday.discovered.v1';
const KEY_LESSONS = 'bodyday.lessons.v1';

export interface LessonProgress {
  stepIndex: number;
  completedStepIds: string[];
  /** questionId → 是否答对 */
  answers: Record<string, boolean>;
  updatedAt: string;
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式或配额不足时静默失败，不影响主流程 */
  }
}

/* ---------------- 已发现结构 ---------------- */

export function readDiscovered(): string[] {
  const list = safeRead<string[]>(KEY_DISCOVERED, []);
  return Array.isArray(list) ? list : [];
}

export function markDiscovered(entityId: string): string[] {
  const current = readDiscovered();
  if (current.includes(entityId)) return current;
  const next = [...current, entityId];
  safeWrite(KEY_DISCOVERED, next);
  return next;
}

/* ---------------- 课程进度 ---------------- */

export function readLessonProgress(): Record<string, LessonProgress> {
  const data = safeRead<Record<string, LessonProgress>>(KEY_LESSONS, {});
  return data && typeof data === 'object' ? data : {};
}

export function readOneLesson(lessonId: string): LessonProgress | null {
  return readLessonProgress()[lessonId] ?? null;
}

export function saveOneLesson(lessonId: string, progress: LessonProgress): void {
  const all = readLessonProgress();
  all[lessonId] = progress;
  safeWrite(KEY_LESSONS, all);
}

export function resetLesson(lessonId: string): void {
  const all = readLessonProgress();
  delete all[lessonId];
  safeWrite(KEY_LESSONS, all);
}

/* ---------------- 清空 ---------------- */

export function clearAllProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY_DISCOVERED);
    window.localStorage.removeItem(KEY_LESSONS);
  } catch {
    /* ignore */
  }
}

export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const probe = '__bodyday_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
