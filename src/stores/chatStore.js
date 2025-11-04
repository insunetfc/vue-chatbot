import { reactive, toRefs } from "vue";
import { SUGGESTED_PROMPTS_INITIAL } from "@/composables/usePromptChips";

const state = reactive({
  messages: [],
  sessionId: null,
  builderSessions: [],
  isAwaitingFollowups: false,
  suggestedPrompts: [],
  suggestedPromptsInitial: [...SUGGESTED_PROMPTS_INITIAL],
  lastClickedChipTitle: null,
  isSending: false,
  abortController: null,
  apiBase: process.env.VUE_APP_API_BASE || "http://15.165.60.45:5000",
  backendBase:
    process.env.VUE_APP_API_HOST ??
    process.env.API_HOST ??
    "http://localhost:3000",
});

function generateSessionId() {
  return `sess-${Math.random().toString(36).slice(2, 11)}`;
}

function ensureSessionId() {
  if (!state.sessionId) {
    state.sessionId = generateSessionId();
  }
  return state.sessionId;
}

function resetSession() {
  state.sessionId = null;
  state.messages = [];
}

function setAbortController(controller) {
  state.abortController = controller;
}

function clearAbortController() {
  state.abortController = null;
}

function setIsSending(flag) {
  state.isSending = flag;
}

function setAwaitingFollowups(flag) {
  state.isAwaitingFollowups = flag;
}

function setLastClickedChipTitle(title) {
  state.lastClickedChipTitle = title;
}

function setSuggestedPrompts(list) {
  state.suggestedPrompts = list;
}

function setMessages(nextMessages) {
  state.messages = nextMessages;
}

export function useChatStore() {
  return {
    ...toRefs(state),
    generateSessionId,
    ensureSessionId,
    resetSession,
    setAbortController,
    clearAbortController,
    setIsSending,
    setAwaitingFollowups,
    setLastClickedChipTitle,
    setSuggestedPrompts,
    setMessages,
  };
}
