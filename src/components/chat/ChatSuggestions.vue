<template>
  <div
    class="sticky z-10 flex flex-wrap items-center gap-2 px-3 pb-2 sm:pb-3"
    :style="stickyInlineStyle"
  >
    <template v-if="showInitPrompts">
      <button
        v-for="(prompt, index) in initItems"
        :key="`init-${index}`"
        type="button"
        class="flex flex-col items-start w-full gap-1 px-4 py-3 text-sm font-medium text-left transition bg-white border shadow-sm rounded-2xl border-slate-200 text-slate-700 hover:border-indigo-200 hover:text-indigo-500 md:w-auto"
        @click="onInitSelect(prompt)"
      >
        <div
          class="flex items-center gap-2 text-sm font-semibold text-slate-700"
        >
          <span aria-hidden="true">{{ emojiForTitle(prompt.title) }}</span>
          <span>{{ prompt.title }}</span>
        </div>
        <div class="text-xs text-slate-500">{{ prompt.desc }}</div>
      </button>
      <button
        type="button"
        class="flex flex-col items-start w-full gap-1 px-4 py-3 text-sm font-medium text-left transition bg-white border border-dashed shadow-sm rounded-2xl border-slate-300 text-slate-700 hover:border-indigo-200 hover:text-indigo-500 md:w-auto"
        aria-pressed="false"
        @click="openModal"
      >
        <div class="text-sm font-semibold text-slate-700">더 보기</div>
        <div class="text-xs text-slate-500">전체 제안 보기</div>
      </button>
      <button
        v-if="builderHasSessions"
        type="button"
        class="inline-flex items-center px-4 py-2 text-sm font-medium transition bg-white border rounded-full shadow-sm border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-500"
        title="마지막 웹빌더 열기"
        @click="$emit('open-last-builder')"
      >
        최근빌더
      </button>
    </template>

    <template v-else-if="showFollowupPrompts">
      <button
        type="button"
        class="inline-flex items-center justify-center w-10 h-10 transition border rounded-full shadow-sm border-slate-200 bg-slate-200 text-slate-600 hover:bg-slate-300"
        title="초기 질문으로 돌아가기"
        @click="$emit('reset-init')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-rotate-ccw"
        >
          <path d="M3 2v6h6"></path>
          <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
        </svg>
      </button>
      <button
        v-for="(prompt, index) in followupPrompts"
        :key="`follow-${index}`"
        type="button"
        class="inline-flex items-center px-4 py-2 text-sm font-medium transition bg-white border rounded-full shadow-sm border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-500"
        @click="$emit('apply-suggestion', prompt)"
      >
        {{ prompt }}
      </button>
    </template>

    <template v-else-if="showFollowupLoading">
      <div
        class="inline-flex items-center gap-3 px-4 py-2 text-sm bg-white border rounded-full shadow-sm border-slate-200 text-slate-600"
      >
        <span>후속 질문 생성 중</span>
        <span class="flex items-center gap-1">
          <span
            class="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500"
          ></span>
          <span
            class="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0.15s]"
          ></span>
          <span
            class="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0.3s]"
          ></span>
        </span>
      </div>
    </template>
  </div>

  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showModal"
        class="fixed inset-0 z-[4010] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm md:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggestionModalTitle"
        @click.self="closeModal"
      >
        <div
          class="w-full max-w-xl bg-white shadow-2xl rounded-t-3xl md:rounded-3xl"
        >
          <header
            class="flex items-center justify-between px-5 py-4 border-b border-slate-100"
          >
            <div class="flex flex-col">
              <h2
                id="suggestionModalTitle"
                class="text-base font-semibold text-slate-800"
              >
                추천 작업 전체 보기
              </h2>
              <p class="text-xs text-slate-500">
                자주 사용하는 작업을 바로 선택해보세요.
              </p>
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center transition border rounded-full h-9 w-9 border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500"
              aria-label="닫기"
              @click="closeModal"
            >
              ✕
            </button>
          </header>
          <div class="max-h-[65vh] overflow-y-auto px-5 py-4">
            <div class="grid gap-3">
              <button
                v-for="(prompt, index) in allInitItems"
                :key="`modal-init-${index}`"
                type="button"
                class="flex items-start gap-3 px-4 py-3 text-sm font-medium text-left transition bg-white border shadow-sm rounded-2xl border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-600"
                @click="onModalSelect(prompt)"
              >
                <span
                  aria-hidden="true"
                  class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 mt-1 text-base text-indigo-500 bg-indigo-100 rounded-full"
                >
                  {{ emojiForTitle(prompt.title) }}
                </span>
                <span class="flex flex-col">
                  <span class="text-sm font-semibold text-slate-800">
                    {{ prompt.title }}
                  </span>
                  <span class="text-xs text-slate-500">
                    {{ prompt.desc }}
                  </span>
                </span>
              </button>
            </div>
          </div>
          <footer
            class="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100"
          >
            <button
              type="button"
              class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold transition border rounded-xl border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-700"
              @click="closeModal"
            >
              닫기
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, computed } from "vue";

const props = defineProps({
  showInitPrompts: { type: Boolean, default: false },
  initItems: { type: Array, default: () => [] },
  allInitItems: { type: Array, default: () => [] },
  offsetBottom: { type: Number, default: 75 },
  showFollowupPrompts: { type: Boolean, default: false },
  followupPrompts: { type: Array, default: () => [] },
  showFollowupLoading: { type: Boolean, default: false },
  builderHasSessions: { type: Boolean, default: false },
  emojiForTitle: { type: Function, required: true },
});

const emit = defineEmits([
  "init-click",
  "open-last-builder",
  "reset-init",
  "apply-suggestion",
]);

const showModal = ref(false);
const isClient = typeof window !== "undefined";
const stickyInlineStyle = computed(() => ({
  bottom: `calc(${props.offsetBottom}px + env(safe-area-inset-bottom))`,
}));

const escHandler = (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
};

function openModal() {
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function onInitSelect(prompt) {
  emit("init-click", prompt);
}

function onModalSelect(prompt) {
  emit("init-click", prompt);
  closeModal();
}

watch(
  () => props.showInitPrompts,
  (value) => {
    if (!value) closeModal();
  }
);

watch(showModal, (isOpen, wasOpen) => {
  if (!isClient) return;
  if (isOpen) {
    document.addEventListener("keydown", escHandler);
  } else if (wasOpen) {
    document.removeEventListener("keydown", escHandler);
  }
});

onBeforeUnmount(() => {
  if (isClient) {
    document.removeEventListener("keydown", escHandler);
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
