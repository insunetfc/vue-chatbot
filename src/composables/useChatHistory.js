const STORAGE_KEY = 'aa_chat.history';
const MAX_HISTORY = 50;

function safeJsonParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse chat history:', error);
    return [];
  }
}

function normalizeEntry(payload = {}) {
  const id = String(payload.id || payload.sessionId || '');
  if (!id) return null;

  const now = Date.now();
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const title =
    payload.title ||
    payload.lastUserText ||
    messages.find((msg) => msg?.role === 'user' && msg?.text)?.text ||
    '새 대화';

  return {
    id,
    title: title.trim().slice(0, 120) || '새 대화',
    updatedAt: Number(payload.updatedAt || now),
    messageCount: Number(payload.messageCount || messages.length || 0),
    lastUserText: payload.lastUserText || '',
    lastBotText: payload.lastBotText || '',
    messages,
  };
}

export function useChatHistory(storageKey = STORAGE_KEY) {
  function loadHistory() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? safeJsonParse(raw) : [];
    } catch (error) {
      console.warn('Failed to load chat history:', error);
      return [];
    }
  }

  function persistHistory(list) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (error) {
      console.warn('Failed to persist chat history:', error);
    }
  }

  function upsertHistory(historyList, payload) {
    const entry = normalizeEntry(payload);
    if (!entry) {
      return { history: historyList };
    }

    const next = historyList.filter((item) => item.id !== entry.id);
    next.unshift(entry);
    const trimmed = next.slice(0, MAX_HISTORY);
    persistHistory(trimmed);
    return { history: trimmed, entry };
  }

  function removeHistory(historyList, id) {
    const next = historyList.filter((item) => item.id !== id);
    persistHistory(next);
    return next;
  }

  function clearHistory() {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear chat history:', error);
    }
  }

  return {
    loadHistory,
    persistHistory,
    upsertHistory,
    removeHistory,
    clearHistory,
  };
}
