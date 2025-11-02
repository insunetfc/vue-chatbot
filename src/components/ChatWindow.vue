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

    <ChatComposer
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
  </div>

  <ChatHistoryPanel
    v-if="showHistoryPanel"
    :history="chatHistory"
    :current-session-id="sessionId"
    @close="showHistoryPanel = false"
    @select="onHistoryEntrySelect"
    @clear="onHistoryClear"
  />

  <web-builder
    v-if="showWebBuilder"
    :files="webBuilderData.files"
    :initial-content="webBuilderData.content"
    @close="showWebBuilder = false"
  />

  <!-- ✅ 설정 드로어: 오른쪽 → 왼쪽 슬라이드 (Vulk 톤) -->
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showSettingsModal"
      class="fixed inset-0 z-[3001] flex justify-end bg-slate-900/40"
      @click.self="closeSettings"
      role="presentation"
    >
      <div
        class="flex h-full w-full max-w-[520px] flex-col overflow-y-auto rounded-l-2xl bg-white shadow-2xl transition-transform duration-300 ease-out"
        :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
        ref="drawer"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'drawerTitle'"
      >
        <!-- 헤더(그라디언트 앱바 + 히어로) -->
        <header
          class="pb-3 text-white bg-gradient-to-br from-indigo-500 to-violet-600"
        >
          <div class="flex items-center justify-between px-4 pt-3 pb-1">
            <button
              type="button"
              class="inline-flex items-center justify-center text-lg transition border rounded-lg h-9 w-9 border-white/30 bg-white/20 hover:bg-white/25"
              aria-label="닫기"
              @click="closeSettings"
            >
              ←
            </button>
            <h2 id="drawerTitle" class="text-lg font-semibold tracking-tight">
              프로필 설정
            </h2>
            <span
              class="inline-flex items-center justify-center border border-transparent rounded-lg opacity-0 h-9 w-9"
              aria-hidden="true"
            ></span>
          </div>
          <div class="flex flex-col items-center px-4 pb-4 text-center">
            <button
              type="button"
              class="flex items-center justify-center overflow-hidden text-lg font-bold tracking-tight text-white transition border rounded-full group h-14 w-14 border-white/40 bg-white/20 hover:bg-white/30"
              @click="triggerAvatarPick"
              aria-label="프로필 이미지 변경"
            >
              <img
                v-if="profile.avatar"
                :src="profile.avatar"
                alt="프로필 이미지"
                class="object-cover w-full h-full"
              />
              <span v-else class="text-lg font-semibold">{{ initials }}</span>
            </button>
            <p class="mt-2 text-sm text-white/90">
              고객 응대에 사용되는 기본 정보를 설정하세요.
            </p>
            <!-- 숨김 파일 입력 -->
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onAvatarSelected"
            />
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onAvatarSelected"
            />
          </div>
        </header>

        <!-- 본문 -->
        <section
          class="flex-1 px-4 pt-5 pb-32 space-y-5 text-slate-800"
          :aria-labelledby="'sec-account'"
        >
          <!-- 섹션: 계정 정보 -->
          <h3 id="sec-account" class="text-sm font-semibold text-slate-800">
            계정 정보
          </h3>
          <div class="grid gap-3">
            <label class="flex flex-col gap-1" for="profile-name">
              <span class="text-xs font-semibold text-slate-700">이름</span>
              <div
                class="flex items-center gap-2 px-3 py-2 transition bg-white border shadow-sm rounded-xl border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100"
              >
                <i class="text-base text-slate-400">👤</i>
                <input
                  id="profile-name"
                  name="name"
                  autocomplete="name"
                  v-model.trim="profile.name"
                  type="text"
                  placeholder="홍길동"
                  class="w-full text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <small class="text-xs text-slate-500"
                >명함/계약서 표기와 동일하게 입력</small
              >
            </label>

            <label class="flex flex-col gap-1" for="profile-email">
              <span class="text-xs font-semibold text-slate-700">이메일</span>
              <div
                class="flex items-center gap-2 px-3 py-2 transition bg-white border shadow-sm rounded-xl border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100"
              >
                <i class="text-base text-slate-400">✉</i>
                <input
                  id="profile-email"
                  name="email"
                  autocomplete="email"
                  v-model.trim="profile.email"
                  type="email"
                  placeholder="you@company.com"
                  class="w-full text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <small class="text-xs text-slate-500"
                >알림 발송 및 로그인에 사용</small
              >
            </label>
          </div>

          <!-- 섹션: 연락처 -->
          <h3 class="text-sm font-semibold text-slate-800" id="sec-contact">
            연락처
          </h3>
          <label class="flex flex-col gap-1" for="profile-phone">
            <span class="text-xs font-semibold text-slate-700">전화번호</span>
            <div
              class="flex items-center gap-2 px-3 py-2 transition bg-white border shadow-sm rounded-xl border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100"
            >
              <i class="text-base text-slate-400">📞</i>
              <input
                id="profile-phone"
                name="tel"
                autocomplete="tel"
                :value="profile.phone"
                @input="onPhoneInput"
                type="tel"
                inputmode="numeric"
                placeholder="010-0000-0000"
                class="w-full text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <small class="text-xs text-slate-500"
              >숫자만 입력해도 자동으로 하이픈 처리돼요</small
            >
          </label>

          <!-- 섹션: 업무 속성 -->
          <h3 class="text-sm font-semibold text-slate-800" id="sec-role">
            업무 속성
          </h3>
          <div
            class="flex gap-2 px-1 pb-2 overflow-x-auto"
            role="radiogroup"
            aria-labelledby="sec-role"
          >
            <div
              class="flex gap-2"
              ref="divisionField"
              role="radiogroup"
              aria-labelledby="sec-role"
            >
              <label
                v-for="opt in divisions"
                :key="opt"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition border rounded-full"
                :class="
                  profile.division === opt
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                "
                :for="`division-${opt}`"
                :aria-checked="profile.division === opt"
                role="radio"
                tabindex="0"
                @keydown.enter.prevent="profile.division = opt"
                @keydown.space.prevent="profile.division = opt"
              >
                <input
                  class="sr-only"
                  :id="`division-${opt}`"
                  type="radio"
                  name="division"
                  :value="opt"
                  v-model="profile.division"
                />
                <span>{{ opt }}</span>
              </label>
            </div>
          </div>

          <label class="flex flex-col gap-1" for="profile-job">
            <span class="text-xs font-semibold text-slate-700">직업</span>
            <div
              class="flex items-center gap-2 px-3 py-2 transition bg-white border shadow-sm rounded-xl border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100"
            >
              <i class="text-base text-slate-400">💼</i>
              <input
                id="profile-job"
                ref="jobField"
                name="organization-title"
                autocomplete="organization-title"
                v-model.trim="profile.job"
                type="text"
                list="job-suggestions"
                placeholder="보험설계사"
                class="w-full text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
              />
              <datalist id="job-suggestions">
                <option v-for="s in jobSuggestions" :key="s" :value="s" />
              </datalist>
            </div>
            <small class="text-xs text-slate-500"
              >예: 보험설계사 / 손해사정사 / GA 설계사…</small
            >
          </label>
        </section>

        <!-- 하단 고정 액션 -->
        <footer
          class="sticky bottom-0 left-0 right-0 flex gap-3 border-t border-slate-200 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md"
        >
          <button
            class="flex-1 font-semibold transition bg-white border min-h-11 rounded-xl border-slate-200 text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
            type="button"
            @click="closeSettings"
          >
            취소
          </button>
          <button
            class="flex-1 font-semibold text-white transition shadow-lg min-h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
            type="button"
            @click="saveSettings"
          >
            저장
          </button>
        </footer>

        <!-- 카테고리 미리보기 -->
        <p class="py-3 text-xs text-center text-slate-500">
          전송 시 <code>category</code>에<br />
          <strong>{{ previewCategoryString }}</strong> 로 포함됩니다.
        </p>
      </div>
    </div>
  </Transition>

  <Transition
    name="aa-slide"
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showBuilderList"
      class="aa-modal-backdrop fixed inset-0 z-[3001] flex justify-end bg-slate-900/40"
      @click.self="closeBuilderList"
      role="presentation"
    >
      <div
        class="flex h-full w-full max-w-[520px] flex-col overflow-y-auto rounded-l-2xl bg-white shadow-2xl transition-transform duration-300 ease-out"
        :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
        ref="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="builderDrawer"
      >
        <header
          class="pb-3 text-white bg-gradient-to-br from-indigo-500 to-violet-600"
        >
          <div class="flex items-center justify-between px-4 pt-3 pb-1">
            <button
              type="button"
              class="icon-btn"
              aria-label="닫기"
              @click="closeBuilderList"
            >
              ←
            </button>
            <h2 id="builderDrawer" class="drawer-title">최근 웹빌더</h2>
            <span class="icon-btn-spacer" aria-hidden="true"></span>
          </div>
        </header>
        <section class="flex-1 px-4 pt-5 pb-32 space-y-5 text-slate-800">
          <div v-if="!builderSessions.length" class="hint">
            최근 웹빌더 세션이 없습니다.
          </div>
          <ul v-else class="builder-list">
            <li v-for="s in builderSessions" :key="s.id" class="builder-item">
              <div class="builder-meta">
                <div class="builder-title" :title="s.title">{{ s.title }}</div>
                <small class="builder-time">{{
                  new Date(s.createdAt).toLocaleString()
                }}</small>
              </div>
              <div class="builder-actions-row">
                <button class="btn-mini" @click="openBuilderFromSession(s.id)">
                  열기
                </button>
                <button
                  class="btn-mini ghost"
                  @click="duplicateBuilderSession(s.id)"
                >
                  복제
                </button>
                <button
                  class="btn-mini danger"
                  @click="deleteBuilderSession(s.id)"
                >
                  삭제
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import {
  reactive,
  ref,
  computed,
  toRefs,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from "vue";
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import ChatHeader from "@/components/chat/ChatHeader.vue";
import ChatMessages from "@/components/chat/ChatMessages.vue";
import ChatSuggestions from "@/components/chat/ChatSuggestions.vue";
import ChatComposer from "@/components/chat/ChatComposer.vue";
import ChatHistoryPanel from "@/components/chat/ChatHistoryPanel.vue";
import { useChatHistory } from "@/composables/useChatHistory";
import { createChatHistoryState } from "@/composables/useChatHistoryPanel";
import { useUserStore } from "@/stores/userStore";
import { useChatStore } from "@/stores/chatStore";
import AnalysisSheet from "./sheet/AnalysisSheet.vue";
import WebBuilder from "./builder/WebBuilder.vue";

const historyUtils = useChatHistory();

const state = reactive({
  userInput: "",
  uploadedFiles: [],
  previewURLs: [],
  isDragOver: false,
  isDraggingFile: false,
  dragCounter: 0,
  errorMessage: "",
  isComposing: false,
  forceInitPrompts: false,
  showAnalysisSheet: false,
  showSettingsModal: false,
  LIMIT_MAX_FILES: 3,
  LIMIT_PER_FILE: 10 * 1024 * 1024,
  LIMIT_TOTAL: 25 * 1024 * 1024,
});

const historyState = reactive(createChatHistoryState());

const userStore = useUserStore();
const chatStore = useChatStore();

const {
  userInput,
  uploadedFiles,
  previewURLs,
  isDragOver,
  isDraggingFile,
  errorMessage,
  isComposing,
  forceInitPrompts,
  showAnalysisSheet,
  showSettingsModal,
} = toRefs(state);

const {
  profile,
  divisions,
  jobSuggestions,
  initials,
  loadProfileFromStorage,
  saveProfileToStorage,
  formatPhone,
  buildCategoryMetaString,
} = userStore;

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
const drawer = ref(null);
const divisionField = ref(null);
const jobField = ref(null);
const avatarInput = ref(null);
const drawerOpen = ref(false);
const showWebBuilder = ref(false);
const showBuilderList = ref(false);
const composerHeight = ref(65);
const webBuilderData = ref({
  files: [],
  content: "", // 빌더 본문 초기값
});

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});
md.enable(["table"]);

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

let vvHandler = null;
let blurHandler = null;
let leaveWindowHandler = null;
let escHandler = null;
let touchMoveCleanup = null;
let errorTimer = null;
let closeTimer = null;
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

function safeFormat(text) {
  if (!text) return "";

  let normalized = String(text).replace(/\r\n?/g, "\n");
  normalized = normalized.replace(/\n{3,}/g, "\n\n");
  normalized = normalized.replace(/(\n\|[^\n]*\n)(?!\|)/g, "$1\n");
  normalized = normalized.replace(/(\n[^\n]*\t[^\n]*\n)(?![^\n]*\t)/g, "$1\n");
  normalized = normalized.replace(/(\n\|?\s*:?-{3,}.*\|\s*\n)(?!\|)/g, "$1\n");
  normalized = normalized.replace(/(\n\|[^\n]*\n)(?=\s*(?:🔹|✅))/g, "$1\n");
  normalized = normalized.trim().replace(/\n{3,}/g, "\n\n");

  const sanitizeAll = (html) =>
    DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "div",
        "p",
        "br",
        "strong",
        "b",
        "em",
        "u",
        "span",
        "ul",
        "ol",
        "li",
        "blockquote",
        "code",
        "pre",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "caption",
        "col",
        "colgroup",
        "hr",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "a",
      ],
      ALLOWED_ATTR: [
        "class",
        "rowspan",
        "colspan",
        "align",
        "width",
        "href",
        "title",
        "target",
        "rel",
        "data-chat-block",
      ],
    });

  const re = /```html([\s\S]*?)```/gi;
  let out = "";
  let last = 0;
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = re.exec(normalized)) !== null) {
    const before = normalized.slice(last, match.index);
    if (before) {
      out += `<div class="space-y-2 text-sm leading-relaxed" data-chat-block="md">${md.render(
        before
      )}</div>`;
    }
    const rawHtml = (match[1] || "").trim();
    out += `<div class="space-y-2 text-sm leading-relaxed" data-chat-block="html">${sanitizeAll(
      rawHtml
    )}</div>`;
    last = re.lastIndex;
  }

  const tail = normalized.slice(last);
  if (tail) {
    out += `<div class="space-y-2 text-sm leading-relaxed" data-chat-block="md">${md.render(
      tail
    )}</div>`;
  }

  out = out.replace(/(<br\s*\/?>|\s)+$/i, "");
  out = out.replace(
    /(<table[\s\S]*?<\/table>)/gi,
    '<div class="overflow-x-auto">$1</div>'
  );
  return sanitizeAll(out);
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
  const title = (item?.title || "").trim();
  setLastClickedChipTitle(title);
  if (title === "보장분석") {
    showAnalysisSheet.value = true;
    return;
  }
  applySuggestion(`${item.title} ${item.desc}`, { send: true });
}

function resetToInitPrompts() {
  setSuggestedPrompts([]);
  setAwaitingFollowups(false);
  forceInitPrompts.value = true;
  nextTick(() => scrollToBottom());
}

function emojiIcon(title) {
  const map = {
    문서공유: "📄",
    보장분석: "🔍",
    제안서작성: "✍️",
    안내문작성: "📤",
    교육자료: "👨‍🏫",
    스케줄작성: "📅",
    상담스크립트: "💬",
    마케팅콘텐츠: "📢",
    "FAQ·상담보조": "❓",
    성공율측정: "📈",
    예상수수료: "💰",
    보상담보예상: "🛡️",
    모바일쿠폰: "🎁",
  };
  return map[title] || "🧩";
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

function fileEmoji(name) {
  if (name.endsWith(".pdf")) return "📕";
  if (name.endsWith(".docx")) return "📘";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "📗";
  return "📄";
}

function onComposerFiles(payload) {
  const files = payload?.files;
  if (!Array.isArray(files) || !files.length) return;
  handleFileUpload({ target: { files } });
}

async function handleFileUpload(e) {
  const incoming = Array.from(e?.target?.files || []);
  if (!incoming.length) return;

  const validExtensions = /\.(pdf|txt|docx|png|jpg|jpeg|xls|xlsx)$/i;
  const currentTotal = uploadedFiles.value.reduce(
    (sum, file) => sum + file.size,
    0
  );
  const seen = new Set(
    uploadedFiles.value.map((file) => `${file.name}:${file.size}`)
  );

  const added = [];
  let totalAddSize = 0;

  for (const file of incoming) {
    if (!validExtensions.test(file.name)) {
      showError(`❌ 지원 안함: ${file.name}`);
      continue;
    }
    if (uploadedFiles.value.length + added.length >= state.LIMIT_MAX_FILES) {
      showError("❌ 최대 3개 파일");
      break;
    }
    if (file.size > state.LIMIT_PER_FILE) {
      showError(`❌ 10MB 초과: ${file.name}`);
      continue;
    }
    if (currentTotal + totalAddSize + file.size > state.LIMIT_TOTAL) {
      showError("❌ 총 25MB 초과");
      break;
    }

    const key = `${file.name}:${file.size}`;
    if (seen.has(key)) continue;

    added.push(file);
    totalAddSize += file.size;
  }

  for (const file of added) {
    uploadedFiles.value.push(file);
    if (file.type.startsWith("image/")) {
      previewURLs.value.push(URL.createObjectURL(file));
    } else {
      previewURLs.value.push("");
    }
  }

  nextTick(() => scrollToBottom());
  if (e?.target) e.target.value = "";
}

function removeFile(index) {
  const url = previewURLs.value[index];
  if (url) URL.revokeObjectURL(url);
  previewURLs.value.splice(index, 1);
  uploadedFiles.value.splice(index, 1);
  nextTick(() => scrollToBottom());
}

function clearAllPreviews() {
  previewURLs.value.forEach((url) => {
    if (url) URL.revokeObjectURL(url);
  });
  previewURLs.value = [];
  uploadedFiles.value = [];
  nextTick(() => scrollToBottom());
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

async function buildAttachmentPayloadForMessage() {
  const result = [];
  for (let i = 0; i < uploadedFiles.value.length; i += 1) {
    const file = uploadedFiles.value[i];
    if (file.type.startsWith("image/")) {
      result.push({
        kind: "image",
        src: await readFileAsDataURL(file),
        name: file.name,
      });
    } else {
      result.push({
        kind: "file",
        emoji: fileEmoji(file.name),
        name: file.name,
      });
    }
  }
  return result;
}

function onDragEnter(event) {
  event.preventDefault();
  state.dragCounter += 1;
  isDraggingFile.value = true;
}

function onDragLeave(event) {
  event.preventDefault();
  state.dragCounter = Math.max(0, state.dragCounter - 1);
  if (state.dragCounter === 0) {
    isDraggingFile.value = false;
    isDragOver.value = false;
  }
}

function onDragOver(event) {
  event.preventDefault();
  isDragOver.value = true;
}

function onDrop(event) {
  event.preventDefault();
  state.dragCounter = 0;
  isDraggingFile.value = false;
  isDragOver.value = false;
  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length) handleFileUpload({ target: { files } });
}

function onSettingsClick() {
  openSettings();
}

function onDivisionTagClick() {
  openSettings("division");
}

function openSettings(target) {
  if (closeTimer) {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }
  drawerOpen.value = false;
  showSettingsModal.value = true;
  document.body.style.overflow = "hidden";
  escHandler = (event) => {
    if (event.key === "Escape") closeSettings();
  };
  document.addEventListener("keydown", escHandler);
  nextTick(() => {
    drawerOpen.value = true;
    const doScroll = () => scrollToDrawerTarget(target);
    setTimeout(doScroll, 320);
  });
}

function closeSettings() {
  drawerOpen.value = false;
  if (escHandler) {
    document.removeEventListener("keydown", escHandler);
    escHandler = null;
  }
  closeTimer = window.setTimeout(() => {
    showSettingsModal.value = false;
    document.body.style.overflow = "";
    closeTimer = null;
  }, 220);
}

function scrollToDrawerTarget(target) {
  const drawerEl = drawer.value;
  if (!drawerEl || !target) return;

  const el =
    target === "division"
      ? divisionField.value
      : target === "job"
      ? jobField.value
      : null;

  if (!el) return;

  try {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    const top =
      el.getBoundingClientRect().top +
      drawerEl.scrollTop -
      drawerEl.clientHeight / 2;
    drawerEl.scrollTo({ top, behavior: "smooth" });
  }

  nextTick(() => {
    if (target === "job") {
      el.focus?.();
    } else if (target === "division") {
      const radio =
        el.querySelector?.("input[type=radio]:checked") ||
        el.querySelector?.("input[type=radio]");
      radio?.focus?.();
    }
  });
}

function loadSettings() {
  loadProfileFromStorage();
}

function saveSettings() {
  saveProfileToStorage();
  closeSettings();
}

function triggerAvatarPick() {
  avatarInput.value?.click?.();
}

function onAvatarSelected(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showError("이미지 파일을 선택해주세요.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    profile.value.avatar = reader.result;
    saveProfileToStorage();
  };
  reader.onerror = (err) => console.warn("avatar read error:", err);
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
    recordChatHistory({
      lastUserText: hasText ? text : "",
      lastBotText: lastBot,
    });
    setLastClickedChipTitle(null);
  }
}

function openBuilderList() {
  showBuilderList.value = !showBuilderList.value;
}

function openBuilderFromSession() {}
function duplicateBuilderSession() {}

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

function recordChatHistory({ lastUserText = "", lastBotText = "" } = {}) {
  const snapshot = serializeMessagesForHistory();
  if (!snapshot.length) return;
  const payload = {
    id: sessionId.value || generateSessionId(),
    updatedAt: Date.now(),
    messageCount: snapshot.length,
    lastUserText: lastUserText || findLastMessageText("user"),
    lastBotText: lastBotText || findLastMessageText("bot"),
    messages: snapshot,
  };
  const { history } = historyUtils.upsertHistory(
    historyState.chatHistory,
    payload
  );
  historyState.chatHistory = history;
}

function clearChatHistory() {
  historyUtils.clearHistory();
  historyState.chatHistory = [];
}

function onHistoryClear() {
  clearChatHistory();
  showHistoryPanel.value = false;
}

function onHistoryEntrySelect(targetId) {
  const target = historyState.chatHistory.find((item) => item.id === targetId);
  if (!target) return;
  if (Array.isArray(target.messages)) {
    const nextMessages = target.messages.map((msg) => ({
      role: msg?.role || "bot",
      text: typeof msg?.text === "string" ? msg.text : "",
      attachments: Array.isArray(msg?.attachments)
        ? msg.attachments.map((att) => ({ ...att }))
        : [],
    }));
    setMessages(nextMessages);
  }
  sessionId.value = target.id;
  showHistoryPanel.value = false;
  forceInitPrompts.value = false;
  setAwaitingFollowups(false);
  setSuggestedPrompts([]);
  nextTick(() => scrollToBottom());
}

function loadChatHistory() {
  historyState.chatHistory = historyUtils.loadHistory();
}

function onDragEnterWindowLeave() {
  state.dragCounter = 0;
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
  clearAllPreviews();
  if (escHandler) {
    document.removeEventListener("keydown", escHandler);
    escHandler = null;
  }
  if (abortController.value) {
    abortController.value.abort();
    clearAbortController();
  }
  if (closeTimer) {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (composerObserver) {
    composerObserver.disconnect();
    composerObserver = null;
  }
  document.body.style.overflow = "";
});

function openHistoryPanel() {
  loadChatHistory();
  showHistoryPanel.value = true;
}

loadChatHistory();
</script>
