import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dashboard } from '../api/types/api';
import { useBoardRepository } from './boardContext';

interface UseBoardResult {
  board: Dashboard | null;
  isLoading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  save: (patch: Partial<Dashboard>) => Promise<void>;
  saveLayout: (layout: Dashboard['layout']) => Promise<void>;
}

/**
 * Hook to load and manage a board.  Handles loading state, error state,
 * refreshing the board, and saving changes.
 */
export function useBoard(id: string): UseBoardResult {
  const repo = useBoardRepository();
  const [board, setBoard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const currentVersionRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const dash = await repo.getBoard(id);
      currentVersionRef.current = dash.version;
      setBoard(dash);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [id, repo]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const save = useCallback(
    async (patch: Partial<Dashboard>) => {
      if (!board) return;
      try {
        setIsLoading(true);
        const updated = await repo.updateBoard(board.id, {
          ...patch,
          version: currentVersionRef.current || board.version,
        } as any);
        currentVersionRef.current = updated.version;
        setBoard(updated);
      } catch (e) {
        setError(e);
      } finally {
        setIsLoading(false);
      }
    },
    [board, repo],
  );

  const saveLayout = useCallback(
    async (layout: Dashboard['layout']) => {
      if (!board) return;
      try {
        setIsLoading(true);
        await repo.updateLayout(board.id, {
          layout,
          version: currentVersionRef.current || board.version,
        } as any);
        // Reload board after saving layout to obtain updated version
        await refresh();
      } catch (e) {
        setError(e);
      } finally {
        setIsLoading(false);
      }
    },
    [board, repo, refresh],
  );

  return { board, isLoading, error, refresh, save, saveLayout };
}