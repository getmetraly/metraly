import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { BoardRepositoryProvider } from './features/board/boardContext';
import { FakeBoardRepository } from './features/board/api/FakeBoardRepository';
import { BoardScreen } from './features/board/ui/BoardScreen';

// Instantiate the repository.  Swap to RealBoardRepository when the real
// backend is available.
const repository = new FakeBoardRepository();

export const App: React.FC = () => {
  return (
    <BoardRepositoryProvider repository={repository}>
      <Router>
        <Routes>
          <Route path="/board/:boardId" element={<BoardScreen />} />
          {/* Redirect to a demo board for convenience */}
          <Route path="*" element={<Navigate to="/board/dash-1" replace />} />
        </Routes>
      </Router>
    </BoardRepositoryProvider>
  );
};