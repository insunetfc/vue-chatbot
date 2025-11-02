const STORAGE_KEY = 'aa_builder.sessions';

function parseSessions(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse builder sessions:', error);
    return [];
  }
}

export function useBuilderSessions(storageKey = STORAGE_KEY) {
  function loadSessions() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? parseSessions(raw) : [];
    } catch (error) {
      console.warn('Failed to load builder sessions:', error);
      return [];
    }
  }

  function persistSessions(sessions) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch (error) {
      console.warn('Failed to persist builder sessions:', error);
    }
  }

  function getTitleFromText(text = '') {
    const heading = text.match(/^\s*#\s+(.+)$/m);
    if (heading?.[1]) return heading[1].trim();

    const firstLine = text
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);

    if (firstLine) return firstLine.slice(0, 80);
    return (text || '웹페이지 초안').slice(0, 40);
  }

  function saveSession(sessions, payload = {}) {
    const sessionId = (payload.id || `wb-${Math.random().toString(36).slice(2, 10)}`).toLowerCase();
    const now = Date.now();
    const files = Array.isArray(payload.files) ? payload.files : [];

    const session = {
      id: sessionId,
      title: getTitleFromText(payload.content || ''),
      content: payload.content || '',
      files,
      createdAt: now,
      updatedAt: now,
    };

    const index = sessions.findIndex((item) => item.id === sessionId);
    const nextSessions = [...sessions];

    if (index >= 0) {
      nextSessions.splice(index, 1, {
        ...nextSessions[index],
        ...session,
        createdAt: nextSessions[index].createdAt,
      });
    } else {
      nextSessions.unshift(session);
    }

    const trimmed = nextSessions.slice(0, 20);
    persistSessions(trimmed);
    return { sessions: trimmed, sessionId };
  }

  function updateSession(sessions, payload) {
    const index = sessions.findIndex((item) => item.id === payload?.id);
    if (index < 0) return sessions;

    const previous = sessions[index];
    const next = {
      ...previous,
      content: typeof payload.content === 'string' ? payload.content : previous.content,
      files: Array.isArray(payload.files) ? payload.files : previous.files,
      title: getTitleFromText(typeof payload.content === 'string' ? payload.content : previous.content),
      updatedAt: Date.now(),
    };

    const result = [...sessions];
    result.splice(index, 1, next);
    persistSessions(result);
    return result;
  }

  function findSession(sessions, id) {
    return sessions.find((item) => item.id === id);
  }

  function deleteSession(sessions, id) {
    const result = sessions.filter((item) => item.id !== id);
    persistSessions(result);
    return result;
  }

  function duplicateSession(sessions, id) {
    const source = sessions.find((item) => item.id === id);
    if (!source) return { sessions, sessionId: id };

    return saveSession(sessions, {
      content: source.content,
      files: source.files,
    });
  }

  return {
    loadSessions,
    persistSessions,
    getTitleFromText,
    saveSession,
    updateSession,
    findSession,
    deleteSession,
    duplicateSession,
  };
}
