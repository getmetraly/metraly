// Synthetic preview API client shim.
// Keeps legacy imports working in ui_new demo bundle.

export const USE_MOCK = true;

const SESSION_KEY = 'metraly.preview-session';

const demoSession = {
  accessToken: 'demo-preview-token',
  refreshToken: 'demo-preview-refresh-token',
  expiresIn: 3600,
  user: {
    id: 'demo-admin',
    email: 'admin@metraly.local',
    role: 'admin',
  },
};

function notifySessionChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('metraly-auth-changed'));
}

export function loadSession() {
  if (typeof window === 'undefined') return demoSession;

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : demoSession;
  } catch {
    return demoSession;
  }
}

export function saveSession(session) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session || demoSession),
  );

  notifySessionChanged();
}

export function clearSession() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(SESSION_KEY);

  notifySessionChanged();
}

export async function login(email = 'admin@metraly.local') {
  const session = {
    ...demoSession,
    user: {
      ...demoSession.user,
      email,
    },
  };

  saveSession(session);

  return session;
}

export async function logout() {
  clearSession();
}

export async function getMe() {
  return {
    id: demoSession.user.id,
    email: demoSession.user.email,
    role: demoSession.user.role,
    name: 'Demo Admin',
  };
}

function syntheticResponse(data) {
  return Promise.resolve({ data });
}

const client = {
  get(path) {
    return syntheticResponse({
      path,
      synthetic: true,
      values: [],
    });
  },

  post(path, body) {
    return syntheticResponse({
      path,
      body,
      synthetic: true,
    });
  },

  put(path, body) {
    return syntheticResponse({
      path,
      body,
      synthetic: true,
    });
  },

  patch(path, body) {
    return syntheticResponse({
      path,
      body,
      synthetic: true,
    });
  },

  delete(path) {
    return syntheticResponse({
      path,
      synthetic: true,
    });
  },
};

export { client };

export default client;