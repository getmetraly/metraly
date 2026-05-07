import React, { createContext, useContext } from 'react';
import type { BoardRepository } from './api/BoardRepository';

/**
 * Context for providing the active BoardRepository implementation.  Wrap your
 * application with this provider to switch between real and fake APIs.
 */
export const BoardRepositoryContext = createContext<BoardRepository | null>(
  null,
);

interface BoardRepositoryProviderProps {
  repository: BoardRepository;
  children: React.ReactNode;
}

export function BoardRepositoryProvider({
  repository,
  children,
}: BoardRepositoryProviderProps) {
  return (
    <BoardRepositoryContext.Provider value={repository}>
      {children}
    </BoardRepositoryContext.Provider>
  );
}

/**
 * Hook to obtain the current BoardRepository.  Throws if no repository is
 * provided.
 */
export function useBoardRepository(): BoardRepository {
  const repo = useContext(BoardRepositoryContext);
  if (!repo) {
    throw new Error('No BoardRepository provided');
  }
  return repo;
}