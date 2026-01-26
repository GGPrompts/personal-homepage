import { useState, useCallback, useRef } from 'react';

export interface HistoryState {
  steps: unknown[];
  notes: unknown[];
  edges: unknown[];
  positions: { [key: string]: { x: number; y: number } };
}

interface UseHistoryResult {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  pushState: (state: HistoryState) => void;
  clear: () => void;
}

const MAX_HISTORY_SIZE = 50;

export function useHistory(initialState: HistoryState): UseHistoryResult {
  // Store history as a ref to avoid re-renders on every push
  const historyRef = useRef<HistoryState[]>([structuredClone(initialState)]);
  const indexRef = useRef(0);

  // Force re-render when undo/redo availability changes
  const [, forceUpdate] = useState({});

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  const pushState = useCallback((state: HistoryState) => {
    const history = historyRef.current;
    const currentIndex = indexRef.current;

    // If we're not at the end of history, truncate future states
    if (currentIndex < history.length - 1) {
      historyRef.current = history.slice(0, currentIndex + 1);
    }

    // Deep clone the state to prevent mutations
    const clonedState = structuredClone(state);

    // Add new state
    historyRef.current.push(clonedState);

    // Trim history if it exceeds max size
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY_SIZE);
      indexRef.current = historyRef.current.length - 1;
    } else {
      indexRef.current = historyRef.current.length - 1;
    }

    forceUpdate({});
  }, []);

  const undo = useCallback((): HistoryState | null => {
    if (indexRef.current <= 0) return null;

    indexRef.current -= 1;
    forceUpdate({});

    // Return a deep clone to prevent mutations
    return structuredClone(historyRef.current[indexRef.current]);
  }, []);

  const redo = useCallback((): HistoryState | null => {
    if (indexRef.current >= historyRef.current.length - 1) return null;

    indexRef.current += 1;
    forceUpdate({});

    // Return a deep clone to prevent mutations
    return structuredClone(historyRef.current[indexRef.current]);
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    indexRef.current = -1;
    forceUpdate({});
  }, []);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    pushState,
    clear,
  };
}
