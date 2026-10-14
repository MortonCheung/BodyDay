import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { readPrefs, writePrefs } from '../services/progress';

/**
 * 全局状态：探索模式。
 *
 * 「自由探索」与「引导教学」不是两套页面，而是**同一个工作台上的两种引导程度**：
 * 前者完全由用户的点选驱动，后者在右纸条上加一条步骤引导。
 * 因此这里只保存模式本身，不再承担跨页遮罩等页面级副作用。
 */

export type AppMode = 'explore' | 'learn';

interface ModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextValue>({ mode: 'explore', setMode: () => {} });

export function useAppMode(): ModeContextValue {
  return useContext(ModeContext);
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => readPrefs().mode);

  const setMode = useCallback((next: AppMode) => {
    setModeState(next);
    writePrefs({ mode: next });
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}
