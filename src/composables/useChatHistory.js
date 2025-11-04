const STORAGE_KEY = "aa_chat.history";
const MAX_HISTORY = 50;

function safeJsonParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse chat history:", error);
    return [];
  }
}

function coerceUpdatedAt(value, fallback) {
  if (value == null) return fallback;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.valueOf();
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function resolveMessages(payload = {}) {
  if (Array.isArray(payload.messages)) return payload.messages;
  if (Array.isArray(payload.chat?.messages)) return payload.chat.messages;
  if (Array.isArray(payload.data?.messages)) return payload.data.messages;
  if (Array.isArray(payload.result?.messages)) return payload.result.messages;
  if (Array.isArray(payload.messageList)) return payload.messageList;
  if (Array.isArray(payload.message_history)) return payload.message_history;
  if (Array.isArray(payload.messageHistory)) return payload.messageHistory;
  return [];
}

function toClientAttachment(attachment) {
  if (!attachment) return null;
  if (typeof attachment === "string") {
    return {
      kind: "file",
      name: attachment,
      src: "",
    };
  }
  return {
    kind: attachment.kind || "file",
    name: attachment.name || "",
    src: attachment.src || "",
    emoji: attachment.emoji || "",
    type: attachment.type || "",
  };
}

function toClientMessage(message = {}) {
  const speaker = message.speaker || message.role || "bot";
  const role = speaker === "user" ? "user" : "bot";
  const text =
    typeof message.text === "string"
      ? message.text
      : typeof message.message === "string"
      ? message.message
      : "";
  const attachments = Array.isArray(message.attachments)
    ? message.attachments
        .map((att) => toClientAttachment(att))
        .filter((att) => !!att)
    : [];

  return {
    role,
    text,
    attachments,
  };
}

export function mapClientMessageToApi(message = {}) {
  const role = message.role === "user" ? "user" : "bot";
  return {
    speaker: role,
    message: message.text || "",
    date:
      typeof message.date === "string"
        ? message.date
        : message.date instanceof Date
        ? message.date.toISOString()
        : new Date().toISOString(),
    read: message.read ?? role !== "user",
  };
}

export function normalizeHistoryEntry(payload = {}) {
  const id = String(
    payload.id ||
      payload.sessionId ||
      payload.session_id ||
      payload.chatId ||
      payload.chat_id ||
      ""
  ).trim();
  if (!id) return null;

  const now = Date.now();
  const rawMessages = resolveMessages(payload);
  const clientMessages = rawMessages.map((msg) => toClientMessage(msg));
  const messageCount = clientMessages.length;

  const lastUserText =
    payload.lastUserText ||
    payload.last_user_text ||
    [...clientMessages]
      .reverse()
      .find((msg) => msg.role === "user")?.text ||
    "";

  const lastBotText =
    payload.lastBotText ||
    payload.last_bot_text ||
    [...clientMessages]
      .reverse()
      .find((msg) => msg.role === "bot")?.text ||
    "";

  const titleCandidate =
    payload.title ||
    payload.topic ||
    lastUserText ||
    clientMessages.find((msg) => msg.role === "user")?.text ||
    "";

  const updatedSource =
    payload.updatedAt ||
    payload.updated_at ||
    payload.date ||
    payload.createdAt ||
    payload.created_at ||
    payload.timestamp;

  const updatedAt = coerceUpdatedAt(updatedSource, now);

  return {
    id,
    title: (titleCandidate || "새 대화").trim().slice(0, 120) || "새 대화",
    updatedAt,
    messageCount,
    lastUserText,
    lastBotText,
    messages: clientMessages,
  };
}

export function useChatHistory(storageKey = STORAGE_KEY) {
  function loadHistory() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? safeJsonParse(raw) : [];
    } catch (error) {
      console.warn("Failed to load chat history:", error);
      return [];
    }
  }

  function persistHistory(list) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (error) {
      console.warn("Failed to persist chat history:", error);
    }
  }

  function upsertHistory(historyList, payload) {
    const entry = normalizeHistoryEntry(payload);
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
      console.warn("Failed to clear chat history:", error);
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
