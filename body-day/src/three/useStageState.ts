import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * 器官 / 细胞 / 人体舞台共用的交互状态。
 *
 * 把「选中 / 悬停 / 聚焦 / 复位 / 用户是否转动过」收敛到一处，
 * 页面与引导课程复用同一套语义，保证两种模式行为一致。
 */
export interface StageState {
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  selectEntity: (id: string | null) => void;
  hoverEntity: (id: string | null) => void;
  requestFocus: (id: string) => void;
  focusTargetId: string | null;
  focusNonce: number;
  requestReset: () => void;
  resetNonce: number;
  userRotated: boolean;
  markUserRotate: () => void;
}

export function useStageState(initialSelected: string | null = null): StageState {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(initialSelected);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [focusTargetId, setFocusTargetId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [resetNonce, setResetNonce] = useState(0);
  const rotatedRef = useRef(false);
  const [userRotated, setUserRotated] = useState(false);

  const selectEntity = useCallback((id: string | null) => {
    setSelectedEntityId(id);
  }, []);

  const hoverEntity = useCallback((id: string | null) => {
    setHoveredEntityId(id);
  }, []);

  const requestFocus = useCallback((id: string) => {
    setFocusTargetId(id);
    setSelectedEntityId(id);
    setFocusNonce((n) => n + 1);
  }, []);

  const requestReset = useCallback(() => {
    setResetNonce((n) => n + 1);
  }, []);

  const markUserRotate = useCallback(() => {
    if (rotatedRef.current) return;
    rotatedRef.current = true;
    setUserRotated(true);
  }, []);

  return useMemo(
    () => ({
      selectedEntityId,
      hoveredEntityId,
      selectEntity,
      hoverEntity,
      requestFocus,
      focusTargetId,
      focusNonce,
      requestReset,
      resetNonce,
      userRotated,
      markUserRotate,
    }),
    [
      selectedEntityId,
      hoveredEntityId,
      selectEntity,
      hoverEntity,
      requestFocus,
      focusTargetId,
      focusNonce,
      requestReset,
      resetNonce,
      userRotated,
      markUserRotate,
    ],
  );
}
