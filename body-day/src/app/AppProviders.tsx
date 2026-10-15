import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { resolveView } from './resolveView';

/**
 * 应用级启动闸门。
 *
 * V2 只有一种入口体验：**完整封面 → 模型真正就绪 → 用户手动点击「进入探索」→ 才看到内部**。
 * 因此这里不再保存「自由探索 / 引导教学」这类模式，也不再让封面自动淡出。
 *
 * 状态机（引擎无关，谁在做真实加载谁就上报）：
 *   loading ──真实就绪──▶ ready-to-enter ──用户点击──▶ entering ──过渡结束──▶ exploring
 *
 * 注意：进度与阶段被拆成两个 context。原因是现在的解剖模型有 30 MB，
 * 下载期间进度会高频更新；若工作台与封面订阅同一个 context，工作台会被进度
 * 事件反复重渲染。工作台只订阅**动作**（引用恒定），封面才订阅**状态**。
 */

export type StartupPhase = 'loading' | 'ready-to-enter' | 'entering' | 'exploring';

export interface StartupProgress {
  loaded: number;
  total: number;
  /** 0..1 */
  ratio: number;
}

export interface StartupActions {
  /** 三维舞台上报真实字节进度 */
  reportProgress: (progress: StartupProgress) => void;
  /** 三维舞台上报「装配完成 + 首个有效帧」 */
  reportReady: () => void;
  /** 用户点击「进入探索」 */
  enter: () => void;
}

export interface StartupState extends StartupProgress {
  phase: StartupPhase;
  /** 本次会话是否启用了封面闸门（直接从深层页面进入时为 false） */
  gateActive: boolean;
}

const noopActions: StartupActions = {
  reportProgress: () => {},
  reportReady: () => {},
  enter: () => {},
};

const StartupActionsContext = createContext<StartupActions>(noopActions);
const StartupStateContext = createContext<StartupState>({
  phase: 'loading',
  gateActive: false,
  loaded: 0,
  total: 0,
  ratio: 0,
});

export function useStartupActions(): StartupActions {
  return useContext(StartupActionsContext);
}

export function useStartupState(): StartupState {
  return useContext(StartupStateContext);
}

/** 「进入探索」的过渡时长：与封面淡出的 CSS 时长一致，避免中途露出内部 */
const ENTER_MS = 620;
/** 进度上报的最小间隔（毫秒）：30 MB 的下载会产生大量事件，节流后界面更稳 */
const PROGRESS_THROTTLE_MS = 140;

export function AppProviders({ children }: { children: ReactNode }) {
  const location = useLocation();

  /**
   * 只有从首页（封面）进入时才启用闸门。
   * 直接深链到某个器官 / 细胞 / 关于页的评审场景不会被封面挡住，
   * 但页面本身仍然可直接截图与核对。
   */
  const [gateActive] = useState(() => resolveView(location.pathname).kind === 'cover');

  const [phase, setPhase] = useState<StartupPhase>(gateActive ? 'loading' : 'exploring');
  const [progress, setProgress] = useState<StartupProgress>({ loaded: 0, total: 0, ratio: 0 });

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const lastReportAt = useRef(0);
  const reportProgress = useCallback((next: StartupProgress) => {
    // 就绪或已进入之后不再更新进度：封面已经不需要它
    if (phaseRef.current !== 'loading') return;
    const now = performance.now();
    if (next.ratio < 1 && now - lastReportAt.current < PROGRESS_THROTTLE_MS) return;
    lastReportAt.current = now;
    setProgress(next);
  }, []);

  const reportReady = useCallback(() => {
    setPhase((current) => (current === 'loading' ? 'ready-to-enter' : current));
  }, []);

  const enter = useCallback(() => {
    setPhase((current) => (current === 'ready-to-enter' ? 'entering' : current));
  }, []);

  useEffect(() => {
    if (phase !== 'entering') return undefined;
    const timer = window.setTimeout(() => setPhase('exploring'), ENTER_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const actions = useMemo<StartupActions>(
    () => ({ reportProgress, reportReady, enter }),
    [reportProgress, reportReady, enter],
  );
  const state = useMemo<StartupState>(
    () => ({ gateActive, phase, ...progress }),
    [gateActive, phase, progress],
  );

  return (
    <StartupActionsContext.Provider value={actions}>
      <StartupStateContext.Provider value={state}>{children}</StartupStateContext.Provider>
    </StartupActionsContext.Provider>
  );
}
