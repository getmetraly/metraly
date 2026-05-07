import { renderHook, act } from '@testing-library/react';
import { BoardRepositoryProvider } from './boardContext';
import { FakeBoardRepository } from './api/FakeBoardRepository';
import { useBoard } from './useBoard';

describe('useBoard', () => {
  it('loads a board and refreshes it', async () => {
    const repository = new FakeBoardRepository();
    // Prepopulate the fake API with a dashboard
    const { dashboard: created } = await repository.createBoard({
      name: 'Test',
      widgets: [],
      layout: [],
      sourceType: 'custom',
    } as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BoardRepositoryProvider repository={repository}>{children}</BoardRepositoryProvider>
    );
    const { result } = renderHook(() => useBoard(created.id), { wrapper });

    // Wait for hook to load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.board).not.toBeNull();
    expect(result.current.board!.name).toBe('Test');

    // Save update
    await act(async () => {
      await result.current.save({ name: 'Updated' } as any);
    });
    expect(result.current.board!.name).toBe('Updated');

    // Refresh board
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.board!.name).toBe('Updated');
  });
});