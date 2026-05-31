import type { CurrentUser, MeResponse, ActivityEvent } from '../user';

export const createMockCurrentUser = (): CurrentUser => ({
  id: 'user-1',
  displayName: 'Jamie Dev',
  initials: 'JD',
  role: 'Admin',
});

export const createMockMeResponse = (): MeResponse => ({
  user: createMockCurrentUser(),
  system: { status: 'nominal', label: 'All systems nominal' },
  pinnedDashboardIds: ['cto-1'],
  dashboards: [],
});

export const createMockActivityEvents = (): ActivityEvent[] => [
  { id: 'act-1', actor: 'Jamie', description: 'Created CTO Dashboard', relativeTime: '2h ago', color: 'var(--m-cyan-500)' },
];
