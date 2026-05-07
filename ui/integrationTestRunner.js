// Pure JavaScript integration test for the board lifecycle using a
// simplified FakeBoardRepository and in-memory mock API.  This script
// runs without TypeScript or React dependencies.

class FakeBoardRepository {
  constructor() {
    this.dashboards = new Map();
    this.nextId = 1;
  }

  generateId() {
    return `dash-${this.nextId++}`;
  }

  async getBoardList() {
    return Array.from(this.dashboards.values()).map((d) => ({ id: d.id, name: d.name }));
  }

  async getBoard(id) {
    const dash = this.dashboards.get(id);
    if (!dash) throw new Error('Dashboard not found');
    return JSON.parse(JSON.stringify(dash));
  }

  async createBoard(req) {
    const id = this.generateId();
    const dash = {
      id,
      name: req.name,
      widgets: req.widgets || [],
      layout: req.layout || [],
      version: 1,
    };
    this.dashboards.set(id, dash);
    return dash;
  }

  async updateBoard(id, req) {
    const dash = this.dashboards.get(id);
    if (!dash) throw new Error('Dashboard not found');
    if (req.version !== dash.version) throw new Error('Version conflict');
    if (req.name !== undefined) dash.name = req.name;
    if (req.widgets !== undefined) dash.widgets = req.widgets;
    if (req.layout !== undefined) dash.layout = req.layout;
    dash.version += 1;
    return JSON.parse(JSON.stringify(dash));
  }

  async updateLayout(id, req) {
    const dash = this.dashboards.get(id);
    if (!dash) throw new Error('Dashboard not found');
    if (req.version !== dash.version) throw new Error('Version conflict');
    dash.layout = req.layout;
    dash.version += 1;
  }
}

async function run() {
  const repo = new FakeBoardRepository();

  // Scenario 1: create and fetch board
  const board = await repo.createBoard({ name: 'Integration JS Board' });
  console.log('Created board:', board);
  const fetched = await repo.getBoard(board.id);
  console.log('Fetched board:', fetched);

  // Scenario 2: update board name and check version
  const updated = await repo.updateBoard(board.id, { name: 'Updated Name', version: board.version });
  console.log('Updated board (name):', updated);

  // Scenario 3: add widget and update layout
  const updatedWithWidget = await repo.updateBoard(board.id, {
    widgets: [{ instanceId: 'w-1', widgetType: 'stat-card', config: {} }],
    version: updated.version,
  });
  await repo.updateLayout(board.id, {
    layout: [{ widgetId: 'w-1', x: 1, y: 1, w: 4, h: 3 }],
    version: updatedWithWidget.version,
  });
  const afterLayout = await repo.getBoard(board.id);
  console.log('Board after layout update:', afterLayout);

  // Scenario 4: concurrency conflict
  const currentVersion = afterLayout.version;
  await repo.updateBoard(board.id, { name: 'Concurrent OK', version: currentVersion });
  try {
    await repo.updateBoard(board.id, { name: 'Concurrent Conflict', version: currentVersion });
    console.log('ERROR: conflict expected but update succeeded');
  } catch (err) {
    console.log('Caught expected conflict:', err.message);
  }

  console.log('All scenarios executed');
}

run().catch((err) => {
  console.error('Error running integration tests', err);
});