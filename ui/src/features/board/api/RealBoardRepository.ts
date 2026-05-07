import {
  getDashboardList,
  getDashboard,
  createDashboard,
  updateDashboard,
  updateLayout,
} from '../../api/client';
import type {
  Dashboard,
  DashboardIndexEntry,
  UpdateDashboardRequest,
  CreateDashboardRequest,
  UpdateLayoutRequest,
} from '../../api/types/api';
import type { BoardRepository } from './BoardRepository';

/**
 * RealBoardRepository wraps the axios client functions defined in
 * `api/client.ts`.  This implementation should match the interface of the
 * fake API so that UI code does not need to distinguish between them.
 */
export class RealBoardRepository implements BoardRepository {
  async getBoardList(): Promise<DashboardIndexEntry[]> {
    return getDashboardList();
  }

  async getBoard(id: string): Promise<Dashboard> {
    return getDashboard(id);
  }

  async createBoard(
    req: CreateDashboardRequest & { wizardWidgetIds?: string[] },
  ): Promise<Dashboard> {
    const { dashboard } = await createDashboard(req as any);
    return dashboard;
  }

  async updateBoard(id: string, req: UpdateDashboardRequest): Promise<Dashboard> {
    const { dashboard } = await updateDashboard(id, req);
    return dashboard;
  }

  async updateLayout(id: string, req: UpdateLayoutRequest): Promise<void> {
    await updateLayout(id, req);
  }
}