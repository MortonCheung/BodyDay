import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { readPrefs, writePrefs } from '../services/progress';
import { prefersReducedMotion } from '../design/motion';
import { ScaleVeil, type VeilRequest } from './ScaleVeil';
import type { Scale } from '../domain';

/* ---------------- 双模式：自由探索 / 引导教学 ---------------- */

export type AppMode = 'explore' | 'learn';

interface ModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextValue>({ mode: 'explore', setMode: () => {} });

export function useAppMode(): ModeContextValue {
  return useContext(ModeContext);
}

/* ---------------- 跨尺度转场 ---------------- */

interface VeilContextValue {
  /** 以「尺度交代」的方式跳转到另一尺度的页面 */
  run: (to: string, opts: { from: Scale; to: Scale; caption: string }) => void;
}

const VeilContext = createContext<VeilContextValue>({ run: () => {} });

export function useScaleVeil(): VeilContextValue {
  return useContext(VeilContext);
}

const VEIL_NAVIGATE_DELAY = 470;
const VEIL_HOLD = 1150;

export function AppProviders({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [mode, setModeState] = useState<AppMode>(() => readPrefs().mode);
  const [veil, setVeil] = useState<VeilRequest | null>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const setMode = useCallback((next: AppMode) => {
    setModeState(next);
    writePrefs({ mode: next });
  }, []);

  const run = useCallback(
    (to: string, opts: { from: Scale; to: Scale; caption: string }) => {
      if (reduced) {
        navigate(to);
        return;
      }
      setVeil({ from: opts.from, to: opts.to, caption: opts.caption });
      window.setTimeout(() => navigate(to), VEIL_NAVIGATE_DELAY);
      window.setTimeout(() => setVeil(null), VEIL_HOLD);
    },
    [navigate, reduced],
  );

  // 路由变化时立即收起遮罩，避免遮罩残留（例如用户用浏览器返回）
  useEffect(() => {
    setVeil(null);
  }, []);

  const modeValue = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  const veilValue = useMemo(() => ({ run }), [run]);

  return (
    <ModeContext.Provider value={modeValue}>
      <VeilContext.Provider value={veilValue}>
        {children}
        <ScaleVeil request={veil} />
      </VeilContext.Provider>
    </ModeContext.Provider>
  );
}
