<template>
  <!-- ✅ 전체 드래그 오버레이 -->
  <div
    v-if="isDraggingFile"
    class="pointer-events-none fixed inset-0 z-[3000] flex items-center justify-center bg-indigo-50/70 backdrop-blur-sm transition"
  >
    <div
      class="px-10 py-6 text-xl font-semibold text-indigo-500 border-2 border-indigo-400 border-dashed shadow-xl rounded-2xl bg-white/90"
    >
      📎 무엇이든 추가하세요
    </div>
  </div>

  <div
    class="relative mx-auto flex h-[100dvh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-white shadow-lg"
  >
    <div
      v-if="errorMessage"
      class="fixed left-1/2 top-16 z-[2000] -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 shadow-lg"
      role="alert"
      aria-live="polite"
    >
      {{ errorMessage }}
    </div>

    <ChatHeader
      :profile="profile"
      :initials="initials"
      @history-click="openHistoryPanel"
      @division-click="onDivisionTagClick"
      @open-builder="openBuilderList"
      @settings-click="onSettingsClick"
    />

    <ChatMessages
      ref="messageList"
      :messages="messages"
      :format-message="safeFormat"
      @open-builder="openBuilderFromSession"
      @duplicate-builder="duplicateBuilderSession"
    />

    <div
      v-if="uploadedFiles.length"
      class="fixed bottom-[100px] left-1/2 z-[1001] flex w-[calc(100%-32px)] max-w-[600px] -translate-x-1/2 flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
    >
      <div
        v-for="(file, index) in uploadedFiles"
        :key="index"
        class="relative flex items-center gap-2 px-3 py-2 text-sm border rounded-lg shadow-sm border-slate-200 bg-slate-50 text-slate-600"
      >
        <div
          v-if="file.type.startsWith('image/')"
          class="w-12 h-12 overflow-hidden rounded-md"
        >
          <img
            :src="previewURLs[index]"
            alt="미리보기"
            class="object-cover w-full h-full"
          />
        </div>
        <div v-else class="flex items-center gap-2 text-sm">
          <span>{{ fileEmoji(file.name) }}</span>
          <span
            class="max-w-[120px] truncate text-xs text-slate-600"
            :title="file.name"
            >{{ file.name }}</span
          >
        </div>
        <button
          class="absolute text-xs transition right-1 top-1 text-rose-500 hover:text-rose-600"
          @click="removeFile(index)"
          aria-label="첨부 삭제"
        >
          ✖
        </button>
      </div>
    </div>

    <ChatSuggestions
      :show-init-prompts="showInitPrompts"
      :init-items="shownInitItems"
      :all-init-items="suggestedPromptsInitial"
      :offset-bottom="suggestionsOffset"
      :show-followup-prompts="showFollowupPrompts"
      :followup-prompts="suggestedPrompts"
      :show-followup-loading="showFollowupLoading"
      :builder-has-sessions="builderSessions.length > 0"
      :emoji-for-title="emojiIcon"
      @init-click="onInitChipClick"
      @open-last-builder="openLastBuilder"
      @reset-init="resetToInitPrompts"
      @apply-suggestion="onSuggestionSend"
    />

    <ChatSender
      ref="chatComposer"
      v-model="userInput"
      :is-sending="isSending"
      :can-send="canSend"
      :is-drag-over="isDragOver"
      @files-selected="onComposerFiles"
      @send="sendMessage"
      @keydown="onKeydown"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
    />

    <AnalysisSheet
      v-if="showAnalysisSheet"
      :uploaded-files="uploadedFiles"
      :is-sending="isSending"
      :file-emoji="fileEmoji"
      @close="showAnalysisSheet = false"
      @remove-index="removeFile"
      @select-files="(files) => handleFileUpload({ target: { files } })"
      @send="onAnalysisSend"
    />

    <ChatHistoryPanel
      v-if="showHistoryPanel"
      :history="chatHistory"
      :current-session-id="sessionId"
      @close="showHistoryPanel = false"
      @select="onHistoryEntrySelect"
      @clear="onHistoryClear"
    />

    <ProposalSheet
      v-if="showProposalSheet"
      :uploaded-files="uploadedFiles"
      :is-sending="isSending"
      :file-emoji="fileEmoji"
      :limits="{
        maxFiles: state.LIMIT_MAX_FILES,
        perFile: state.LIMIT_PER_FILE,
        total: state.LIMIT_TOTAL,
      }"
      :valid-ext="/\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$/i"
      @close="showProposalSheet = false"
      @remove-index="removeFile"
      @select-files="handleSelectFiles"
      @send="onProposalSend"
      @open-builder="onOpenBuilder"
    />

    <QnaSheet
      v-if="showQnaSheet"
      :uploaded-files="uploadedFiles"
      :is-sending="isSending"
      :file-emoji="fileEmoji"
      :limits="{
        maxFiles: state.LIMIT_MAX_FILES,
        perFile: state.LIMIT_PER_FILE,
        total: state.LIMIT_TOTAL,
      }"
      :valid-ext="/\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$/i"
      @close="showQnaSheet = false"
      @remove-index="removeFile"
      @select-files="handleSelectFiles"
      @send="onQnaSend"
    />

    <NoticeSheet
      v-if="showNoticeSheet"
      :uploaded-files="uploadedFiles"
      :is-sending="isSending"
      :file-emoji="fileEmoji"
      :limits="{
        maxFiles: state.LIMIT_MAX_FILES,
        perFile: state.LIMIT_PER_FILE,
        total: state.LIMIT_TOTAL,
      }"
      :valid-ext="/\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$/i"
      @close="showNoticeSheet = false"
      @remove-index="removeFile"
      @select-files="handleSelectFiles"
      @send="onNoticeSend"
    />

    <WebBuilder
      v-if="showWebBuilder"
      :files="webBuilderData.files"
      :initial-content="webBuilderData.content"
      @close="showWebBuilder = false"
    />

    <ConsultScriptSheet
      v-if="showConsultScript"
      :is-sending="isSending"
      @close="showConsultScript = false"
      @send="onConsultScriptSend"
    />

    <BonusPlannerSheet
      v-if="showBonusSheet"
      :is-sending="isSending"
      @close="showBonusSheet = false"
      @send="onBonusSend"
    />

    <EduMaterialSheet
      v-if="showEduMaterial"
      :isSending="isSending"
      @close="showEduMaterial = false"
      @send="onEduMaterialSend"
    />

    <MarketingContentSheet
      v-if="showMarketingContent"
      :isSending="isSending"
      @close="showMarketingContent = false"
      @send="onMarketingContentSend"
    />

    <ConsultScheduleSheet
      v-if="showConsultSchedule"
      :isSending="isSending"
      @close="showConsultSchedule = false"
      @send="onConsultScheduleSend"
    />

    <CustomerStrategySheet
      v-if="showCustomerStrategy"
      :isSending="isSending"
      @close="showCustomerStrategy = false"
      @send="onCustomerStrategySend"
    />

    <ClaimCheckSheet
      v-if="showClaimCheck"
      :is-sending="isSending"
      @close="showClaimCheck = false"
      @send="onClaimCheckSend"
    />
  </div>

  <ProfileSettingsDrawer
    v-model="showSettingsModal"
    :profile="profile"
    :divisions="divisions"
    :job-suggestions="jobSuggestions"
    :initials="initials"
    :preview-category-string="previewCategoryString"
    :target="settingsDrawerTarget"
    :login-info="loginInfo"
    @save="saveSettings"
    @avatar-selected="onAvatarSelected"
    @phone-input="onPhoneInput"
  />

  <WebBuilderDrawer
    v-model="showBuilderList"
    :builder-sessions="builderSessions"
    @open="openBuilderFromSession"
    @duplicate="duplicateBuilderSession"
    @delete="deleteBuilderSession"
  />
</template>

<script setup>
import {
  reactive,
  ref,
  computed,
  watch,
  toRefs,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from "vue";
import MarkdownIt from "markdown-it";
import ChatHeader from "@/components/chat/ChatHeader.vue";
import ChatMessages from "@/components/chat/ChatMessages.vue";
import ChatSuggestions from "@/components/chat/ChatSuggestions.vue";
import ChatHistoryPanel from "@/components/chat/ChatHistoryPanel.vue";
import {
  useChatHistory,
  mapClientMessageToApi,
} from "@/composables/useChatHistory";
import { createChatHistoryState } from "@/composables/useChatHistoryPanel";
import {
  promptEmojiIcon,
  resolveInitPromptAction,
} from "@/composables/usePromptChips";
import { createSafeFormatter } from "@/utils/safeFormatter";
import { useChatFiles } from "@/composables/useChatFiles";
import { useBuilderSessions } from "@/composables/useBuilderSessions";
import { useProfileSettings } from "@/composables/useProfileSettings";
import { useUserStore } from "@/stores/userStore";
import { useChatStore } from "@/stores/chatStore";
import {
  loadAuthSession,
  getAccessToken,
  hasValidAccessToken,
} from "@/utils/authStorage";
import {
  listChats,
  getChat,
  createChat,
  appendChatMessage,
} from "@/services/chatHistoryClient";
import AnalysisSheet from "./sheet/AnalysisSheet.vue";
import ConsultScriptSheet from "./sheet/ConsultScriptSheet.vue";
import NoticeSheet from "./sheet/BonusPlannerSheet.vue";
import ProposalSheet from "@/components/sheet/ProposalSheet.vue";
import ProfileSettingsDrawer from "./settings/ProfileSettingsDrawer.vue";
import QnaSheet from "./sheet/QnaSheet.vue";
import WebBuilder from "./builder/WebBuilder.vue";
import WebBuilderDrawer from "./builder/WebBuilderDrawer.vue";
import ChatSender from "@/components/chat/ChatSender.vue";
import BonusPlannerSheet from "./sheet/BonusPlannerSheet.vue";
import EduMaterialSheet from "./sheet/EduMaterialSheet.vue";
import MarketingContentSheet from "./sheet/MarketingContentSheet.vue";
import ConsultScheduleSheet from "./sheet/ConsultScheduleSheet.vue";
import CustomerStrategySheet from "./sheet/CustomerStrategySheet.vue";
import ClaimCheckSheet from "./sheet/ClaimCheckSheet.vue";

const historyUtils = useChatHistory();

const state = reactive({
  userInput: "",
  errorMessage: "",
  isComposing: false,
  forceInitPrompts: false,
  showAnalysisSheet: false,
  LIMIT_MAX_FILES: 3,
  LIMIT_PER_FILE: 10 * 1024 * 1024,
  LIMIT_TOTAL: 25 * 1024 * 1024,
});

const historyState = reactive(createChatHistoryState());

const { userInput, errorMessage, isComposing, forceInitPrompts, showAnalysisSheet } =
  toRefs(state);

const userStore = useUserStore();
const {
  profile,
  divisions,
  jobSuggestions,
  initials,
  loadProfileFromStorage,
  saveProfileToStorage,
  updateProfile,
  formatPhone,
  buildCategoryMetaString,
} = userStore;

const {
  showSettingsModal,
  settingsDrawerTarget,
  openSettings: openProfileSettings,
  closeSettings: closeProfileSettings,
} = useProfileSettings();

const chatStore = useChatStore();

const {
  messages,
  sessionId,
  builderSessions,
  isAwaitingFollowups,
  suggestedPrompts,
  suggestedPromptsInitial,
  lastClickedChipTitle,
  isSending,
  apiBase,
  backendBase,
  abortController,
  generateSessionId,
  ensureSessionId,
  setAbortController,
  clearAbortController,
  setIsSending,
  setAwaitingFollowups,
  setSuggestedPrompts,
  setLastClickedChipTitle,
  setMessages,
} = chatStore;

const { showHistoryPanel, chatHistory } = toRefs(historyState);

const messageList = ref(null);
const chatComposer = ref(null);
const showWebBuilder = ref(false);
const showBuilderList = ref(false);
const showNoticeSheet = ref(false);
const showProposalSheet = ref(false);
const showQnaSheet = ref(false);
const showConsultScript = ref(false);
const showBonusSheet = ref(false);
const showEduMaterial = ref(false);
const showMarketingContent = ref(false);
const showConsultSchedule = ref(false);
const showCustomerStrategy = ref(false);
const showClaimCheck = ref(false);
const composerHeight = ref(65);
const webBuilderData = ref({
  files: [],
  content: "", // 빌더 본문 초기값
  sessionId: null,
});
const authSession = ref(null);
const authenticatedUser = ref(null);
const syncedMessageCounts = reactive({});
const builderObjectUrls = ref([]);
const captureNextBot = ref(null);
const builderSessionApi = useBuilderSessions();
if (typeof window !== "undefined") {
  try {
    builderSessions.value = builderSessionApi.loadSessions();
  } catch (error) {
    console.warn("Failed to initialize builder sessions:", error);
  }
}

const {
  uploadedFiles,
  previewURLs,
  isDragOver,
  isDraggingFile,
  dragCounter,
  fileEmoji,
  handleSelectFiles,
  handleFileUpload,
  onComposerFiles,
  removeFile,
  clearAllPreviews,
  buildAttachmentPayloadForMessage,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
} = useChatFiles({
  showError,
  scrollToBottom,
  limits: {
    maxFiles: state.LIMIT_MAX_FILES,
    perFile: state.LIMIT_PER_FILE,
    total: state.LIMIT_TOTAL,
  },
});

function releaseBuilderObjectUrls() {
  builderObjectUrls.value.forEach((url) => URL.revokeObjectURL(url));
  builderObjectUrls.value = [];
}

function normalizeBuilderFile(entry) {
  const rawFile =
    entry instanceof File
      ? entry
      : entry?.file instanceof File
      ? entry.file
      : null;
  const name = entry?.name || rawFile?.name || "";
  const type = entry?.type || rawFile?.type || "";
  const size = entry?.size || rawFile?.size || 0;
  let url = entry?.url || "";
  const isImage = (type || "").startsWith("image/");

  if (isImage) {
    if (rawFile && !url) {
      url = URL.createObjectURL(rawFile);
    }
    if (url) {
      builderObjectUrls.value.push(url);
    }
  }

  return {
    file: rawFile || entry?.file || null,
    name,
    size,
    type,
    url,
  };
}

function prepareBuilderFiles(files = []) {
  releaseBuilderObjectUrls();
  return files.map((item) => normalizeBuilderFile(item));
}

function serializeBuilderFiles(files = []) {
  return files.map((file) => ({
    name: file?.name || "",
    size: file?.size || 0,
    type: file?.type || "",
    url: file?.url || "",
  }));
}

function saveBuilderSession({ id, content = "", files = [] } = {}) {
  const { sessions, sessionId } = builderSessionApi.saveSession(
    [...builderSessions.value],
    {
      id,
      content,
      files: serializeBuilderFiles(files),
    }
  );
  builderSessions.value = sessions;
  return sessionId;
}

function attachSessionToLastBot(sessionId) {
  if (!sessionId) return;
  for (let i = messages.value.length - 1; i >= 0; i -= 1) {
    if (messages.value[i]?.role === "bot") {
      const current = messages.value[i];
      messages.value.splice(i, 1, {
        ...current,
        meta: { ...(current.meta || {}), builderSessionId: sessionId },
      });
      break;
    }
  }
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});
md.enable(["table"]);

const safeFormat = createSafeFormatter(md, {
  markdownWrapper: (content) =>
    `<div class="space-y-2 text-sm leading-relaxed" data-chat-block="md">${content}</div>`,
  htmlWrapper: (content) =>
    `<div class="space-y-2 text-sm leading-relaxed" data-chat-block="html">${content}</div>`,
  tableWrapperClass: "overflow-x-auto",
});

const initFirstLineCount = 2;
const SUGGESTION_GAP_PX = 0;

const canSend = computed(
  () => userInput.value.trim().length > 0 || uploadedFiles.value.length > 0
);
const previewCategoryString = computed(() => buildCategoryMetaString());
const hasFiles = computed(() => uploadedFiles.value.length > 0);
const showInitPrompts = computed(
  () =>
    !hasFiles.value &&
    !isAwaitingFollowups.value &&
    (forceInitPrompts.value || messages.value.length === 0) &&
    suggestedPromptsInitial.value.length > 0
);
const showFollowupPrompts = computed(
  () =>
    !hasFiles.value &&
    !isAwaitingFollowups.value &&
    !forceInitPrompts.value &&
    messages.value.length > 0 &&
    suggestedPrompts.value.length > 0
);
const showFollowupLoading = computed(
  () => !hasFiles.value && isAwaitingFollowups.value
);
const shownInitItems = computed(() =>
  suggestedPromptsInitial.value.slice(0, initFirstLineCount)
);
const suggestionsOffset = computed(() =>
  Math.max(64, Math.round(composerHeight.value + SUGGESTION_GAP_PX))
);
const loginInfo = computed(() => {
  const user = authenticatedUser.value;
  if (!user || typeof user !== "object") return {};
  const resolve = (...keys) => {
    for (const key of keys) {
      if (user && typeof user[key] === "string" && user[key].trim()) {
        return user[key].trim();
      }
    }
    return "";
  };
  const rawPhone = resolve("phone", "phoneNumber", "tel", "mobile");
  return {
    name: resolve("name", "displayName"),
    email: resolve("email", "username"),
    phone: rawPhone ? formatPhone(rawPhone) : "",
    division: resolve("division", "team"),
    job: resolve("job", "position", "title"),
  };
});

function buildAuthHeaders() {
  if (typeof window === "undefined") return {};
  const session = loadAuthSession();
  authSession.value = session || null;
  if (session?.user) {
    authenticatedUser.value = session.user;
    if (
      !profile.value.name ||
      !profile.value.email ||
      !profile.value.division ||
      !profile.value.job
    ) {
      applyLoginDefaults();
    }
  } else if (!session) {
    authenticatedUser.value = null;
  }
  if (!session || !hasValidAccessToken(session)) return {};
  const token = getAccessToken(session);
  if (!token) return {};
  const tokenType = session?.tokenType || "Bearer";
  return { Authorization: `${tokenType} ${token}` };
}

function getSyncedCount(id) {
  if (!id) return 0;
  return Number(syncedMessageCounts[id] ?? 0) || 0;
}

function setSyncedCount(id, count) {
  if (!id) return;
  syncedMessageCounts[id] = Math.max(0, Number(count) || 0);
}

function removeSyncedCount(id) {
  if (!id) return;
  delete syncedMessageCounts[id];
}

watch(showSettingsModal, (visible, prev) => {
  if (!visible && prev) {
    closeProfileSettings();
  }
  if (!visible) {
    settingsDrawerTarget.value = null;
  }
});

watch(showWebBuilder, (isOpen) => {
  if (!isOpen) {
    releaseBuilderObjectUrls();
  }
});

let vvHandler = null;
let blurHandler = null;
let leaveWindowHandler = null;
let touchMoveCleanup = null;
let errorTimer = null;
let composerObserver = null;

function getComposerElement() {
  const component = chatComposer.value;
  if (!component) return null;
  if (component.root?.value instanceof HTMLElement) return component.root.value;
  if (component.root instanceof HTMLElement) return component.root;
  if (component.$el instanceof HTMLElement) return component.$el;
  return null;
}

function updateComposerHeight() {
  const el = getComposerElement();
  if (!el) return;
  composerHeight.value = el.getBoundingClientRect().height;
}

function setupComposerObserver() {
  if (composerObserver) {
    composerObserver.disconnect();
    composerObserver = null;
  }
  const el = getComposerElement();
  if (!el || typeof window === "undefined" || !window.ResizeObserver) {
    updateComposerHeight();
    return;
  }
  updateComposerHeight();
  composerObserver = new ResizeObserver(() => updateComposerHeight());
  composerObserver.observe(el);
}

function getMessagesContainer() {
  return messageList.value?.container || null;
}

function scrollToBottom() {
  nextTick(() => {
    const container = getMessagesContainer();
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 40);
    }
  });
}

function colorizeStatus(root) {
  const skipTags = new Set(["CODE", "PRE", "A", "SCRIPT", "STYLE", "TEXTAREA"]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (skipTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!/충분|부족/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const targets = [];
  while (walker.nextNode()) targets.push(walker.currentNode);

  for (const target of targets) {
    const fragment = document.createDocumentFragment();
    const parts = target.nodeValue.split(/(충분|부족)/g);
    for (const part of parts) {
      if (part === "충분") {
        const span = document.createElement("span");
        span.className = "font-semibold text-indigo-600";
        span.textContent = part;
        fragment.appendChild(span);
      } else if (part === "부족") {
        const span = document.createElement("span");
        span.className = "font-semibold text-rose-600";
        span.textContent = part;
        fragment.appendChild(span);
      } else if (part) {
        fragment.appendChild(document.createTextNode(part));
      }
    }
    target.parentNode.replaceChild(fragment, target);
  }
}

function onAnalysisSend(payload) {
  const memo =
    payload && typeof payload.memo === "string" ? payload.memo.trim() : "";
  if (memo) userInput.value = memo;
  showAnalysisSheet.value = false;
  sendMessage();
}

function onInitChipClick(item) {
  const action = resolveInitPromptAction(item);
  const title = (action?.title || item?.title || "").trim();
  if (title) {
    setLastClickedChipTitle(title);
  }

  if (action?.type === "open-sheet" && action.sheet) {
    const openSheet = {
      analysis: () => (showAnalysisSheet.value = true),
      proposal: () => (showProposalSheet.value = true),
      qna: () => (showQnaSheet.value = true),
      notice: () => (showNoticeSheet.value = true),
      bonus: () => (showBonusSheet.value = true),
      script: () => (showConsultScript.value = true),
      edu: () => (showEduMaterial.value = true),
      marketing: () => (showMarketingContent.value = true),
      schedule: () => (showConsultSchedule.value = true),
      strategy: () => (showCustomerStrategy.value = true),
      claim: () => (showClaimCheck.value = true),
    }[action.sheet];
    if (typeof openSheet === "function") {
      openSheet();
      return;
    }
  }

  if (action?.type === "apply-suggestion" && action.suggestion) {
    applySuggestion(action.suggestion, { send: true });
    return;
  }

  if (title) {
    applySuggestion(title, { send: true });
  }
}

function resetToInitPrompts() {
  setSuggestedPrompts([]);
  setAwaitingFollowups(false);
  forceInitPrompts.value = true;
  nextTick(() => scrollToBottom());
}

function emojiIcon(title) {
  return promptEmojiIcon(title);
}

function showError(msg) {
  errorMessage.value = msg;
  if (errorTimer) clearTimeout(errorTimer);
  errorTimer = window.setTimeout(() => {
    errorMessage.value = "";
    errorTimer = null;
  }, 4000);
}

function applyFollowups(arr) {
  let out = Array.isArray(arr) ? arr : [];
  out = out
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  out = [...new Set(out)];
  if (out.length >= 3 && out.length <= 6) {
    setSuggestedPrompts(out);
  } else {
    throw new Error("3~6개 JSON 배열 아님");
  }
}

function onSuggestionSend(value) {
  applySuggestion(value, { send: true });
}

function autoResize() {
  chatComposer.value?.resetHeight?.();
}

function onCompositionStart() {
  isComposing.value = true;
}

function onCompositionEnd() {
  isComposing.value = false;
}

function onKeydown(event) {
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) return;
  if (event.key === "Enter" && !event.shiftKey && !isComposing.value) {
    event.preventDefault();
    sendMessage();
  }
}

function onSettingsClick() {
  openSettings();
}

function onDivisionTagClick() {
  openSettings("division");
}

function openSettings(target) {
  openProfileSettings(target || null);
}

function closeSettings() {
  closeProfileSettings();
}

function applyLoginDefaults() {
  const user = authenticatedUser.value;
  if (!user || typeof user !== "object") return;

  const pick = (...keys) => {
    for (const key of keys) {
      const value = user[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  };

  const updates = {};
  const nameCandidate = pick("name", "displayName");
  if (!profile.value.name && nameCandidate) updates.name = nameCandidate;

  const emailCandidate = pick("email", "username");
  if (!profile.value.email && emailCandidate) updates.email = emailCandidate;

  const phoneCandidate = pick("phone", "phoneNumber", "tel", "mobile");
  if (!profile.value.phone && phoneCandidate)
    updates.phone = formatPhone(phoneCandidate);

  const divisionCandidate = pick("division", "team");
  if (!profile.value.division && divisionCandidate)
    updates.division = divisionCandidate;

  const jobCandidate = pick("job", "position", "title");
  if (!profile.value.job && jobCandidate) updates.job = jobCandidate;

  const avatarCandidate = pick("avatar", "avatarUrl", "picture", "imageUrl");
  if (!profile.value.avatar && avatarCandidate)
    updates.avatar = avatarCandidate;

  if (Object.keys(updates).length > 0) {
    updateProfile(updates);
  }
}

function loadSettings() {
  loadProfileFromStorage();
  if (typeof window !== "undefined") {
    try {
      const session = loadAuthSession();
      authSession.value = session;
      authenticatedUser.value = session?.user ?? null;
      applyLoginDefaults();
    } catch (error) {
      console.warn("Failed to load auth session", error);
      authSession.value = null;
      authenticatedUser.value = null;
    }
  }
}

function saveSettings() {
  saveProfileToStorage();
  closeSettings();
}

function onAvatarSelected(event) {
  const inputEl = event?.target;
  const file = event?.target?.files?.[0];
  if (!file) {
    if (inputEl && typeof inputEl === "object" && "value" in inputEl) {
      inputEl.value = "";
    }
    return;
  }
  if (!file.type.startsWith("image/")) {
    showError("이미지 파일을 선택해주세요.");
    if (inputEl && typeof inputEl === "object" && "value" in inputEl) {
      inputEl.value = "";
    }
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    profile.value.avatar = reader.result;
    saveProfileToStorage();
    if (inputEl && typeof inputEl === "object" && "value" in inputEl) {
      inputEl.value = "";
    }
  };
  reader.onerror = (err) => {
    console.warn("avatar read error:", err);
    if (inputEl && typeof inputEl === "object" && "value" in inputEl) {
      inputEl.value = "";
    }
  };
  reader.readAsDataURL(file);
}

function onPhoneInput(event) {
  const formatted = formatPhone(event.target.value);
  profile.value.phone = formatted;
  nextTick(() => {
    try {
      const el = event.target;
      const pos = formatted.length;
      if (typeof el?.setSelectionRange === "function") {
        el.setSelectionRange(pos, pos);
      }
    } catch (err) {
      console.debug("setSelectionRange unsupported:", err);
    }
  });
}

function applySuggestion(text, { send = false } = {}) {
  userInput.value = text;
  forceInitPrompts.value = false;
  nextTick(() => {
    autoResize();
    if (send) {
      sendMessage();
    } else {
      chatComposer.value?.focusTextarea?.();
    }
  });
}

async function updateFollowupSuggestions({ lastUser, botText }) {
  try {
    const fd = new FormData();
    fd.append("session_id", sessionId.value || generateSessionId());
    fd.append(
      "question",
      [
        "최근 대화 맥락을 바탕으로 고객이 바로 이어서 할 가능성이 큰 실무적 후속 질문 3~6개 생성.",
        '출력은 JSON 배열만. 예) ["질문1","질문2",...]',
        "코드블록(```), 마크다운, 주석, 설명문, 접두어 금지.",
      ].join(" ")
    );

    const categoryMeta = buildCategoryMetaString();
    const parts = categoryMeta.split("-");
    const jobValue = parts.slice(1).join("-");

    fd.append("category", "추가질문");
    fd.append("job", jobValue);

    const res = await fetch(`${apiBase.value}/chat/suggestions`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error(`서버 오류: ${res.status}`);

    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error("응답이 배열 형식이 아님");

    applyFollowups(arr);
    setAwaitingFollowups(false);
  } catch (error) {
    console.debug("추가질문 API 실패, 폴백 사용:" + botText, error);
    const base = (lastUser || "").replace(/\s+/g, " ").trim();
    const topic = base.length > 0 ? base.slice(0, 32) : "이 내용";
    setSuggestedPrompts([
      `${topic} 실제 사례 3개만 알려줘`,
      `${topic} 제안서 형식으로 작성해줘`,
      "비슷한 상황에서 주의해야 할 점은 무엇인가요?",
      "이걸 적용하면 기대할 수 있는 효과는 무엇인가요?",
      "추가로 참고할 만한 자료가 있나요?",
      "다른 옵션이나 대안이 있다면 알려주세요",
    ]);
    setAwaitingFollowups(false);
  }
}

async function sendMessage() {
  if (!canSend.value || isSending.value) return;

  forceInitPrompts.value = false;
  setIsSending(true);
  setAwaitingFollowups(true);

  if (abortController.value) abortController.value.abort();
  const controller = new AbortController();
  setAbortController(controller);

  ensureSessionId();

  const text = userInput.value.trim();
  const hasText = text.length > 0;
  const hasFiles = uploadedFiles.value.length > 0;
  const hasPDF = uploadedFiles.value.some((file) => /\.pdf$/i.test(file.name));

  const attachmentsForBubble = await buildAttachmentPayloadForMessage();
  messages.value.push({
    role: "user",
    text: hasText ? text : hasFiles ? "(첨부 전송)" : "",
    attachments: attachmentsForBubble,
  });

  userInput.value = "";
  nextTick(() => {
    chatComposer.value?.resetHeight?.();
    chatComposer.value?.focusTextarea?.();
  });

  const fd = new FormData();
  fd.append("session_id", sessionId.value);
  fd.append("question", hasText ? text : "[FILE_UPLOAD_ONLY]");

  const categoryMeta = buildCategoryMetaString();
  const parts = categoryMeta.split("-");
  let categoryValue = parts[0] || "";
  const jobValue = parts.slice(1).join("-");

  if (lastClickedChipTitle.value === "보장분석") {
    categoryValue = categoryValue ? `보장분석-${categoryValue}` : "보장분석";
  }

  fd.append("category", categoryValue);
  fd.append("job", jobValue);
  uploadedFiles.value.forEach((file) => fd.append("files", file));
  clearAllPreviews();

  const startTime = Date.now();
  const botIndex = messages.value.length;
  messages.value.push({
    role: "bot",
    text: "",
    loading: true,
    loadingText: hasPDF ? "📄 PDF를 텍스트로 변환 중" : "",
  });
  scrollToBottom();

  const timer = setInterval(() => {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const msg = messages.value[botIndex];
    if (msg && msg.loading) {
      msg.loadingText = `${
        hasPDF ? "📄 PDF를 텍스트로 변환 중" : "응답 생성 중"
      } ${seconds}s `;
    } else {
      clearInterval(timer);
    }
  }, 1000);

  try {
    const res = await fetch(`${apiBase.value}/chat/stream-file`, {
      method: "POST",
      body: fd,
      signal: controller.signal,
    });

    if (!res.ok || !res.body) throw new Error(`서버 오류: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;
    let botText = "";

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        botText += chunk;
        messages.value.splice(botIndex, 1, {
          role: "bot",
          text: botText,
          loading: false,
        });
        scrollToBottom();
      }
    }
  } catch (error) {
    const aborted = error?.name === "AbortError";
    messages.value.splice(botIndex, 1, {
      role: "bot",
      text: aborted
        ? "⏹️ 이전 요청을 취소했습니다."
        : "❌ 서버와 연결할 수 없습니다.",
      loading: false,
    });
    setAwaitingFollowups(false);
  } finally {
    clearInterval(timer);
    setIsSending(false);
    clearAbortController();

    const lastBot = messages.value[messages.value.length - 1]?.text || "";
    updateFollowupSuggestions({
      lastUser: hasText ? text : "",
      botText: lastBot,
    });
    nextTick(() => {
      const container = getMessagesContainer();
      if (container) {
        container
          .querySelectorAll("[data-chat-block]")
          .forEach((el) => colorizeStatus(el));
      }
    });
    await recordChatHistory({
      lastUserText: hasText ? text : "",
      lastBotText: lastBot,
    });
    const capture = captureNextBot.value;
    if (typeof capture === "function") {
      try {
        capture(lastBot);
      } finally {
        captureNextBot.value = null;
      }
    }
    setLastClickedChipTitle(null);
  }
}

function openBuilderList() {
  showBuilderList.value = !showBuilderList.value;
}

function openBuilderFromSession(sessionId) {
  if (!sessionId) return;
  const target = builderSessionApi.findSession(
    builderSessions.value,
    sessionId
  );
  if (!target) return;
  const builderFiles = prepareBuilderFiles(target.files || []);
  webBuilderData.value = {
    files: builderFiles,
    content: target.content || "",
    sessionId: target.id,
  };
  showWebBuilder.value = true;
  showBuilderList.value = false;
  captureNextBot.value = null;
}

function duplicateBuilderSession(sessionId) {
  if (!sessionId) return;
  const { sessions, sessionId: newId } = builderSessionApi.duplicateSession(
    [...builderSessions.value],
    sessionId
  );
  builderSessions.value = sessions;
  if (newId) {
    openBuilderFromSession(newId);
  }
}

function deleteBuilderSession(sessionId) {
  if (!sessionId) return;
  builderSessions.value = builderSessionApi.deleteSession(
    [...builderSessions.value],
    sessionId
  );
}

function openLastBuilder() {
  const last = Array.isArray(builderSessions.value)
    ? builderSessions.value[0]
    : null;
  if (last?.id) openBuilderFromSession(last.id);
}

function serializeMessagesForHistory(source = messages.value) {
  return source.map((msg) => ({
    role: msg.role,
    text: msg.text || "",
    attachments: Array.isArray(msg.attachments)
      ? msg.attachments.map((att) => ({
          kind:
            att?.kind === "image" &&
            (!(typeof att?.src === "string") || att.src.startsWith("data:"))
              ? "file"
              : att?.kind || "file",
          name: att?.name || "",
          emoji: att?.emoji || "",
          type: att?.type || "",
          src:
            typeof att?.src === "string" && !att.src.startsWith("data:")
              ? att.src
              : "",
        }))
      : [],
  }));
}

function findLastMessageText(role) {
  for (let i = messages.value.length - 1; i >= 0; i -= 1) {
    const msg = messages.value[i];
    if (msg?.role === role && typeof msg.text === "string" && msg.text) {
      return msg.text.slice(0, 120);
    }
  }
  return "";
}

async function recordChatHistory({ lastUserText = "", lastBotText = "" } = {}) {
  const snapshot = serializeMessagesForHistory();
  if (!snapshot.length) return;
  const previousId = sessionId.value || null;
  let historyId = sessionId.value;

  if (!historyId) {
    historyId = generateSessionId();
    sessionId.value = historyId;
  }

  const fallbackLastUser = lastUserText || findLastMessageText("user");
  const fallbackLastBot = lastBotText || findLastMessageText("bot");

  let normalizedEntry = null;

  const headers = buildAuthHeaders();
  const canSyncRemote = Boolean(headers.Authorization && backendBase.value);

  if (canSyncRemote) {
    try {
      const hasSyncedBefore =
        previousId &&
        Object.prototype.hasOwnProperty.call(syncedMessageCounts, previousId);
      if (!hasSyncedBefore) {
        const apiMessages = snapshot.map((message) =>
          mapClientMessageToApi(message)
        );
        const created = await createChat(
          backendBase.value,
          {
            messages: apiMessages,
            date: new Date().toISOString(),
          },
          { headers }
        );
        if (created?.id) {
          if (previousId && created.id !== previousId) {
            removeSyncedCount(previousId);
            historyState.chatHistory = historyState.chatHistory.filter(
              (entry) => entry.id !== previousId
            );
            historyUtils.persistHistory(historyState.chatHistory);
          }
          historyId = created.id;
          sessionId.value = created.id;
          normalizedEntry = created;
          setSyncedCount(created.id, snapshot.length);
        }
      } else if (previousId) {
        const syncedCount = getSyncedCount(previousId);
        const pendingMessages = snapshot.slice(syncedCount);
        if (pendingMessages.length) {
          for (const pending of pendingMessages) {
            await appendChatMessage(
              backendBase.value,
              previousId,
              mapClientMessageToApi(pending),
              { headers }
            );
          }
          setSyncedCount(previousId, snapshot.length);
        }
        normalizedEntry = {
          id: previousId,
          updatedAt: Date.now(),
          messageCount: snapshot.length,
          lastUserText: fallbackLastUser,
          lastBotText: fallbackLastBot,
          messages: snapshot,
        };
      }
    } catch (error) {
      console.warn("Failed to sync chat history with API:", error);
    }
  }

  const localPayload = normalizedEntry || {
    id: historyId,
    sessionId: historyId,
    updatedAt: Date.now(),
    messageCount: snapshot.length,
    lastUserText: fallbackLastUser,
    lastBotText: fallbackLastBot,
    messages: snapshot,
  };

  const { history } = historyUtils.upsertHistory(
    historyState.chatHistory,
    localPayload
  );
  historyState.chatHistory = history;
  setSyncedCount(localPayload.id, snapshot.length);
}

function clearHistoryLocal() {
  historyUtils.clearHistory();
  historyState.chatHistory = [];
}

async function onHistoryClear() {
  clearHistoryLocal();
  Object.keys(syncedMessageCounts).forEach((key) => removeSyncedCount(key));
  showHistoryPanel.value = false;
}

async function onHistoryEntrySelect(targetId) {
  if (!targetId) return;
  let entry =
    historyState.chatHistory.find((item) => item.id === targetId) || null;

  const headers = buildAuthHeaders();
  if (headers.Authorization && backendBase.value) {
    try {
      const remoteEntry = await getChat(backendBase.value, targetId, {
        headers,
      });
      if (remoteEntry?.id) {
        entry = remoteEntry;
        const { history } = historyUtils.upsertHistory(
          historyState.chatHistory,
          remoteEntry
        );
        historyState.chatHistory = history;
        setSyncedCount(remoteEntry.id, remoteEntry.messages.length);
      }
    } catch (error) {
      console.warn("Failed to fetch chat history detail:", error);
    }
  }

  if (!entry) return;

  const messagesForSession = Array.isArray(entry.messages)
    ? entry.messages.map((msg) => ({
        role: msg?.role === "user" ? "user" : "bot",
        text: typeof msg?.text === "string" ? msg.text : "",
        attachments: Array.isArray(msg?.attachments)
          ? msg.attachments.map((att) => ({ ...att }))
          : [],
      }))
    : [];

  if (!messagesForSession.length && entry.messageCount > 0) {
    showError("채팅 이력을 불러오지 못했습니다.");
  }

  setMessages(messagesForSession);
  sessionId.value = entry.id;
  showHistoryPanel.value = false;
  forceInitPrompts.value = false;
  setAwaitingFollowups(false);
  setSuggestedPrompts([]);
  nextTick(() => scrollToBottom());
}

async function loadChatHistory() {
  const cached = historyUtils.loadHistory();
  const cachedArray = Array.isArray(cached) ? cached : [];
  if (cachedArray.length && historyState.chatHistory.length === 0) {
    historyState.chatHistory = cachedArray;
  } else if (historyState.chatHistory.length === 0 && !cachedArray.length) {
    historyState.chatHistory = [];
  }
  cachedArray.forEach((entry) =>
    setSyncedCount(
      entry.id,
      Array.isArray(entry.messages) ? entry.messages.length : 0
    )
  );

  const headers = buildAuthHeaders();
  if (!headers.Authorization || !backendBase.value) {
    return;
  }

  try {
    const { items } = await listChats(backendBase.value, { headers });
    items.forEach((entry) =>
      setSyncedCount(
        entry.id,
        Array.isArray(entry.messages) ? entry.messages.length : 0
      )
    );
    const remoteIds = new Set(items.map((item) => item.id));
    const combined = [
      ...items,
      ...cachedArray.filter((item) => !remoteIds.has(item.id)),
    ];
    const limited = combined.slice(0, 50);
    historyState.chatHistory = limited;
    historyUtils.persistHistory(limited);
  } catch (error) {
    console.warn("Failed to load chat history from API:", error);
  }
}

function onDragEnterWindowLeave() {
  dragCounter.value = 0;
  isDraggingFile.value = false;
  isDragOver.value = false;
}

onMounted(() => {
  window.addEventListener("dragenter", onDragEnter);
  window.addEventListener("dragleave", onDragLeave);
  window.addEventListener("dragover", onDragOver);
  window.addEventListener("drop", onDrop);

  vvHandler = () => scrollToBottom();
  if (window.visualViewport)
    window.visualViewport.addEventListener("resize", vvHandler);

  blurHandler = () => onDragEnterWindowLeave();
  window.addEventListener("blur", blurHandler);
  document.addEventListener("visibilitychange", blurHandler);

  leaveWindowHandler = (event) => {
    if (
      event.clientX <= 0 ||
      event.clientY <= 0 ||
      event.clientX >= window.innerWidth ||
      event.clientY >= window.innerHeight
    ) {
      onDragEnterWindowLeave();
    }
  };
  window.addEventListener("mouseout", leaveWindowHandler);

  nextTick(() => {
    const container = getMessagesContainer();
    if (container) {
      const handler = (event) => event.stopPropagation();
      container.addEventListener("touchmove", handler, { passive: false });
      touchMoveCleanup = () =>
        container.removeEventListener("touchmove", handler);
    }
  });

  loadSettings();
  nextTick(() => setupComposerObserver());
});

onBeforeUnmount(() => {
  window.removeEventListener("dragenter", onDragEnter);
  window.removeEventListener("dragleave", onDragLeave);
  window.removeEventListener("dragover", onDragOver);
  window.removeEventListener("drop", onDrop);

  closeProfileSettings();

  if (window.visualViewport && vvHandler) {
    window.visualViewport.removeEventListener("resize", vvHandler);
  }
  if (blurHandler) {
    window.removeEventListener("blur", blurHandler);
    document.removeEventListener("visibilitychange", blurHandler);
  }
  if (leaveWindowHandler) {
    window.removeEventListener("mouseout", leaveWindowHandler);
  }
  if (touchMoveCleanup) touchMoveCleanup();
  releaseBuilderObjectUrls();
  clearAllPreviews();
  if (abortController.value) {
    abortController.value.abort();
    clearAbortController();
  }
  if (composerObserver) {
    composerObserver.disconnect();
    composerObserver = null;
  }
});

async function openHistoryPanel() {
  showHistoryPanel.value = true;
  await loadChatHistory();
}

async function onNoticeSend(payload) {
  const m =
    payload && typeof payload.memo === "string" ? payload.memo.trim() : "";
  if (m) userInput.value = m;
  if (Array.isArray(payload?.files) && payload.files.length) {
    handleSelectFiles({ files: payload.files, __fromChild: true });
  }
  showNoticeSheet.value = false;
  sendMessage();
}

async function onMarketingContentSend(payload) {
  const memo = payload?.memo?.trim() || "";
  if (memo) userInput.value = memo;
  if (payload?.files?.length) {
    handleSelectFiles({ files: payload.files, __fromChild: true });
  }
  showMarketingContent.value = false;
  sendMessage();
}

async function onOpenBuilder(payload) {
  showProposalSheet.value = false;

  const incoming = Array.isArray(payload?.files) ? payload.files : [];
  const memo = (payload?.memo || "").trim();

  const sourceFiles = incoming.length ? incoming : uploadedFiles.value;
  const builderFiles = prepareBuilderFiles(sourceFiles);

  captureNextBot.value = (botText) => {
    if (!botText) {
      showError("봇 응답을 가져오지 못했습니다.");
      return;
    }

    const sessId = saveBuilderSession({
      content: botText,
      files: builderFiles,
    });

    attachSessionToLastBot(sessId);

    webBuilderData.value = {
      files: builderFiles,
      content: botText,
      sessionId: sessId,
    };
    showWebBuilder.value = true;
    showBuilderList.value = false;
  };

  if (memo) userInput.value = memo;
  sendMessage();
}

async function onProposalSend(payload) {
  const m =
    payload && typeof payload.memo === "string" ? payload.memo.trim() : "";
  if (m) userInput.value = m;
  showProposalSheet.value = false;
  sendMessage();
}

async function onQnaSend(payload) {
  const m =
    payload && typeof payload.memo === "string" ? payload.memo.trim() : "";
  if (m) userInput.value = m;
  showQnaSheet.value = false;
  sendMessage();
}

loadChatHistory();
</script>
