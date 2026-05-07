import { FakeBoardRepository } from './api/FakeBoardRepository';
import assert from 'assert';

async function run() {
  const repo = new FakeBoardRepository();

  // Scenario 1: create and fetch board
  const board = await repo.createBoard({
    name: 'Runner Board',
    widgets: [],
    layout: [],
    sourceType: 'custom',
  } as any);
  assert.ok(board.id, 'Board id should be defined');
  assert.equal(board.version, 1, 'Version should start at 1');
  const fetched = await repo.getBoard(board.id);
  assert.equal(fetched.name, 'Runner Board');

  // Scenario 2: update board and check version increment
  const updated = await repo.updateBoard(board.id, { name: 'Renamed', version: board.version } as any);
  assert.equal(updated.name, 'Renamed');
  assert.equal(updated.version, board.version + 1);

  // Scenario 3: update layout and verify persistence
  const newLayout = [
    { widgetId: 'widget-1', x: 1, y: 1, w: 4, h: 3 },
  ];
  // Add a widget for the layout
  const boardWithWidget = await repo.updateBoard(board.id, {
    widgets: [{ instanceId: 'widget-1', widgetType: 'stat-card', config: {} }],
    version: updated.version,
  } as any);
  await repo.updateLayout(board.id, { layout: newLayout, version: boardWithWidget.version } as any);
  const fetched2 = await repo.getBoard(board.id);
  assert.equal(fetched2.layout[0].x, 1);
  assert.equal(fetched2.layout[0].h, 3);

  // Scenario 4: concurrency conflict
  const originalVersion = fetched2.version;
  const success = await repo.updateBoard(board.id, { name: 'Concurrent OK', version: originalVersion } as any);
  try {
    await repo.updateBoard(board.id, { name: 'Concurrent Fail', version: originalVersion } as any);
    throw new Error('Expected version conflict');
  } catch (err: any) {
    assert.ok(err.message.includes('Version conflict'), 'Should throw version conflict');
  }

  console.log('All integration scenarios passed');
}

run().catch((err) => {
  console.error('Integration scenarios failed');
  console.error(err);
});