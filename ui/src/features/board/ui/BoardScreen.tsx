import React from 'react';
import { useParams } from 'react-router-dom';
import { useBoard } from '../useBoard';
import { BoardRenderer } from './BoardRenderer';

/**
 * BoardScreen is a page component responsible for fetching and rendering a
 * board.  It shows loading and error states and passes data down to
 * BoardRenderer.
 */
export const BoardScreen: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  // In a real app, boardId would come from the router.  For demonstration
  // purposes we assume it always exists.
  const { board, isLoading, error, refresh } = useBoard(boardId!);

  if (isLoading) return <div>Loading board…</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;
  if (!board) return <div>Board not found</div>;

  return (
    <div className="board-screen">
      <h1>{board.name}</h1>
      <button onClick={() => refresh()}>Refresh</button>
      <BoardRenderer board={board} />
    </div>
  );
};