import { mockApi } from '../../api/mockApi';
import type {
  Dashboard,
  DashboardIndexEntry,
  UpdateDashboardRequest,
  CreateDashboardRequest,
  UpdateLayoutRequest,
} from '../../api/types/api';
import type { BoardRepository } from './BoardRepository';

/**
 * FakeBoardRepository delegates all operations to the existing mockApi.
 * This allows the UI to work against the same contract as the real API
 * while storing data in memory.
 */
export class FakeBoardRepository implements BoardRepository {
  async getBoardList(): Promise<DashboardIndexEntry[]> {
    return mockApi.getDashboardList();
  }

  async getBoard(id: string): Promise<Dashboard> {
    return mockApi.getDashboard(id);
  }

  async createBoard(
    req: CreateDashboardRequest & { wizardWidgetIds?: string[] },
  ): Promise<Dashboard> {
    const { dashboard } = await mockApi.createDashboard(req as any);
    return dashboard;
  }

  async updateBoard(id: string, req: UpdateDashboardRequest): Promise<Dashboard> {
    const { dashboard } = await mockApi.updateDashboard(id, req);
    return dashboard;
  }

  async updateLayout(id: string, req: UpdateLayoutRequest): Promise<void> {
    await mockApi.updateLayout(id, req);
  }
}