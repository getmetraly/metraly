// Integration tests for the board lifecycle using the FakeBoardRepository.
// Note: these tests are illustrative and assume a testing environment with
// Jest installed and TS support.  They demonstrate how to test create,
// update, save layout and reload scenarios.

import { FakeBoardRepository } from './api/FakeBoardRepository';

describe('Board integration scenarios', () => {
  let repo: FakeBoardRepository;
  beforeEach(() => {
    repo = new FakeBoardRepository();
  });

  test('create and fetch board', async () => {
    const board = await repo.createBoard({
      name: 'Integration Test Board',
      widgets: [],
      layout: [],
      sourceType: 'custom',
    } as any);
    expect(board.id).toBeDefined();
    expect(board.version).toBe(1);

    const fetched = await repo.getBoard(board.id);
    expect(fetched.name).toBe('Integration Test Board');
    expect(fetched.version).toBe(1);
  });

  test('update board increments version', async () => {
    const board = await repo.createBoard({
      name: 'Board to Update',
      widgets: [],
      layout: [],
      sourceType: 'custom',
    } as any);
    const updated = await repo.updateBoard(board.id, {
      name: 'Updated Name',
      version: board.version,
    } as any);
    expect(updated.name).toBe('Updated Name');
    expect(updated.version).toBe(board.version + 1);
  });

  test('layout is saved and restored', async () => {
    const board = await repo.createBoard({
      name: 'Layout Board',
      widgets: [
        { instanceId: 'widget-1', widgetType: 'stat-card', config: {} },
      ],
      layout: [
        { widgetId: 'widget-1', x: 0, y: 0, w: 4, h: 2 },
      ],
      sourceType: 'custom',
    } as any);
    const newLayout = [
      { widgetId: 'widget-1', x: 1, y: 1, w: 4, h: 3 },
    ];
    await repo.updateLayout(board.id, { layout: newLayout, version: board.version } as any);
    const fetched = await repo.getBoard(board.id);
    expect(fetched.layout[0].x).toBe(1);
    expect(fetched.layout[0].h).toBe(3);
  });

  test('concurrent update throws version conflict', async () => {
    const board = await repo.createBoard({
      name: 'Concurrent Board',
      widgets: [],
      layout: [],
      sourceType: 'custom',
    } as any);
    // Simulate two edits: oldVersion and currentVersion
    const oldVersion = board.version;
    const updated = await repo.updateBoard(board.id, { name: 'First Edit', version: oldVersion } as any);
    // Attempt to update with stale version should throw
    await expect(
      repo.updateBoard(board.id, { name: 'Stale Edit', version: oldVersion } as any),
    ).rejects.toThrow();
    // A fresh update with current version succeeds
    const updated2 = await repo.updateBoard(board.id, { name: 'Fresh Edit', version: updated.version } as any);
    expect(updated2.name).toBe('Fresh Edit');
  });
});