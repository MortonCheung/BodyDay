/**
 * 本地学习记录（localStorage 足够，不为轻量学习记录新建后端）。
 *
 * 记录三类：
 *  - 已发现结构（自由探索）
 *  - 课程进度（引导教学：步骤位置、已完成步骤、测验作答）
 *  - 界面偏好（模式、减弱动态）
 * 全部可一键清空。
 */

const KEY_DISCOVERED = 'bodyday.discovered.v1';
const KEY_LESSONS = 'bodyday.lessons.v1';
const KEY_PREFS = 'bodyday.prefs.v1';

export interface LessonProgress {
  stepIndex: number;
  completedStepIds: string[];
  /** questionId → 是否答对 */
  answers: Record<string, boolean>;
  updatedAt: string;
}

export interface Prefs {
  mode: 'explore' | 'learn';
  reducedMotion?: boolean;
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

/* ---------------- 偏好 ---------------- */

export function readPrefs(): Prefs {
  const p = safeRead<Prefs>(KEY_PREFS, { mode: 'explore' });
  return p && (p.mode === 'explore' || p.mode === 'learn') ? p : { mode: 'explore' };
}

export function writePrefs(prefs: Prefs): void {
  safeWrite(KEY_PREFS, prefs);
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
