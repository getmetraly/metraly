import type {
  Dashboard,
  DashboardIndexEntry,
  UpdateDashboardRequest,
  CreateDashboardRequest,
  UpdateLayoutRequest,
} from '../../api/types/api';

/**
 * BoardRepository abstracts CRUD operations for boards/dashboards.
 * Implementations may delegate to a REST API or an in‑memory fake API.
 */
export interface BoardRepository {
  /**
   * List all boards the user has access to.
   */
  getBoardList(): Promise<DashboardIndexEntry[]>;

  /**
   * Fetch a single board by ID.  Throws if not found.
   */
  getBoard(id: string): Promise<Dashboard>;

  /**
   * Create a new board and return the full representation.
   */
  createBoard(req: CreateDashboardRequest & { wizardWidgetIds?: string[] }): Promise<Dashboard>;

  /**
   * Update an existing board.  Returns the updated board.  Implementations
   * should perform optimistic concurrency control using the version field.
   */
  updateBoard(id: string, req: UpdateDashboardRequest): Promise<Dashboard>;

  /**
   * Update only the layout of a board (positions, sizes).  This is a lightweight
   * alternative to `updateBoard` when only the layout changes.
   */
  updateLayout(id: string, req: UpdateLayoutRequest): Promise<void>;
}