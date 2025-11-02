const STORAGE_KEY = 'chatbot.auth.session';

function serializeSession(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to persist auth session', error);
  }
}

function parseSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse auth session', error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveAuthSession(payload) {
  if (!payload) {
    return;
  }

  const now = Date.now();
  const accessTokenExpiresAt =
    now + (Number(payload.accessTokenExpiresIn ?? 0) || 0) * 1000;
  const refreshTokenExpiresAt =
    now + (Number(payload.refreshTokenExpiresIn ?? 0) || 0) * 1000;

  const storedSession = {
    tokenType: payload.tokenType ?? 'Bearer',
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    user: payload.user ?? null,
    googleTokens: payload.googleTokens ?? null,
  };

  serializeSession(storedSession);
}

export function loadAuthSession() {
  return parseSession();
}

export function clearAuthSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasValidAccessToken(session = loadAuthSession()) {
  if (!session?.accessToken || !session.accessTokenExpiresAt) {
    return false;
  }

  return session.accessTokenExpiresAt - Date.now() > 5000;
}

export function getAccessToken(session = loadAuthSession()) {
  if (hasValidAccessToken(session)) {
    return session.accessToken;
  }

  return null;
}

export function getAuthenticatedUser(session = loadAuthSession()) {
  if (!hasValidAccessToken(session)) {
    return null;
  }

  return session?.user ?? null;
}
