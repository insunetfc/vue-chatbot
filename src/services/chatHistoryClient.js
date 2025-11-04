import { normalizeHistoryEntry } from "@/composables/useChatHistory";

function joinUrl(base, path) {
  const trimmedBase = base ? base.replace(/\/+$/, "") : "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${normalizedPath}`;
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

async function parseJson(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

async function request(url, { method = "GET", headers, body, signal } = {}) {
  const init = {
    method,
    headers: {
      Accept: "application/json",
      ...(headers || {}),
    },
    signal,
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else if (typeof body === "string") {
      init.headers["Content-Type"] =
        init.headers["Content-Type"] || "application/json";
      init.body = body;
    } else {
      init.headers["Content-Type"] =
        init.headers["Content-Type"] || "application/json";
      init.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    const errorBody = await parseJson(response);
    const message =
      errorBody?.message ||
      errorBody?.error ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = errorBody;
    throw error;
  }

  return parseJson(response);
}

function ensureArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export async function listChats(
  apiBase,
  { page, limit, headers, signal } = {}
) {
  const query = buildQuery({ page, limit });
  const url = joinUrl(apiBase, `/chats${query}`);
  const payload = await request(url, { headers, signal });
  const items = ensureArray(payload);
  const normalized = items
    .map((item) => normalizeHistoryEntry(item))
    .filter((entry) => !!entry);
  const pageInfo = {
    page: typeof payload?.page === "number" ? payload.page : undefined,
    limit: typeof payload?.limit === "number" ? payload.limit : undefined,
    total: typeof payload?.total === "number" ? payload.total : undefined,
  };
  return { items: normalized, ...pageInfo };
}

export async function getChat(apiBase, chatId, { headers, signal } = {}) {
  if (!chatId) throw new Error("chatId is required");
  const url = joinUrl(apiBase, `/chats/${encodeURIComponent(chatId)}`);
  const payload = await request(url, { headers, signal });
  return normalizeHistoryEntry(payload);
}

export async function createChat(apiBase, body, { headers, signal } = {}) {
  const url = joinUrl(apiBase, "/chats");
  const payload = await request(url, {
    method: "POST",
    headers,
    body,
    signal,
  });
  return normalizeHistoryEntry(payload);
}

export async function appendChatMessage(
  apiBase,
  chatId,
  body,
  { headers, signal } = {}
) {
  if (!chatId) throw new Error("chatId is required");
  const url = joinUrl(
    apiBase,
    `/chats/${encodeURIComponent(chatId)}/messages`
  );
  const payload = await request(url, {
    method: "POST",
    headers,
    body,
    signal,
  });
  const chatPayload =
    payload?.chat ||
    payload?.data ||
    payload?.result ||
    payload ||
    undefined;
  return normalizeHistoryEntry(chatPayload);
}
