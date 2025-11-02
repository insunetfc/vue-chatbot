<template>
  <div class="fixed inset-0 z-[1300]">
    <div
      class="absolute inset-0 bg-slate-900/40 transition-opacity duration-200"
      @click="handleClose"
    ></div>
    <div class="absolute inset-y-0 left-0 flex max-w-full">
      <div
        class="flex h-full w-[min(360px,100vw)] max-w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:w-[380px]"
        :class="panelVisible ? 'translate-x-0' : '-translate-x-full'"
      >
        <header class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-800">채팅 이력</h2>
            <p class="text-xs text-slate-500">
              최근 {{ history.length }}개의 대화를 확인할 수 있어요.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-500 disabled:opacity-50"
              :disabled="history.length === 0"
              @click="emit('clear')"
            >
              비우기
            </button>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base shadow-sm transition hover:bg-slate-100"
              aria-label="닫기"
              @click="handleClose"
            >
              ✕
            </button>
          </div>
        </header>

        <div class="border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          대화 목록
        </div>

        <div class="flex-1 overflow-y-auto">
          <template v-if="history.length">
            <button
              v-for="item in history"
              :key="item.id"
              type="button"
              class="flex w-full flex-col gap-1 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-indigo-50/50"
              :class="{
                'bg-indigo-50': item.id === activeId,
                'bg-white': item.id !== activeId,
              }"
              @click="handleSelect(item.id)"
            >
              <div class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold text-slate-800">
                  {{ item.title }}
                </span>
                <span
                  v-if="item.id === currentSessionId"
                  class="inline-flex items-center rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                >
                  현재
                </span>
              </div>
              <p class="text-xs text-slate-500">
                {{ formatDate(item.updatedAt) }} · {{ item.messageCount }} 메시지
              </p>
              <p v-if="item.lastUserText" class="truncate text-xs text-slate-600">
                🙋 {{ item.lastUserText }}
              </p>
              <p v-if="item.lastBotText" class="truncate text-xs text-slate-600">
                🤖 {{ item.lastBotText }}
              </p>
            </button>
          </template>
          <div
            v-else
            class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <span class="text-4xl">🗂️</span>
            <p class="text-sm text-slate-500">아직 저장된 채팅 이력이 없습니다.</p>
          </div>
        </div>

        <footer class="border-t border-slate-200 px-5 py-3 text-[11px] text-slate-400">
          다른 대화를 선택하면 자동으로 해당 대화가 열립니다.
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';

const props = defineProps({
  history: {
    type: Array,
    default: () => [],
  },
  currentSessionId: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['close', 'select', 'clear']);

const panelVisible = ref(false);
const activeId = ref('');

onMounted(() => {
  activeId.value = props.currentSessionId || props.history[0]?.id || '';
  requestAnimationFrame(() => {
    panelVisible.value = true;
  });
});

watch(
  () => props.currentSessionId,
  (id) => {
    if (id) activeId.value = id;
  },
);

watch(
  () => props.history,
  (list) => {
    if (!list.length) {
      activeId.value = '';
      return;
    }
    if (!list.some((item) => item.id === activeId.value)) {
      activeId.value = props.currentSessionId || list[0].id;
    }
  },
  { deep: true },
);

function handleSelect(id) {
  activeId.value = id;
  emit('select', id);
}

function handleClose() {
  emit('close');
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleString();
  } catch (error) {
    return '';
  }
}
</script>
