<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="overlayVisible"
      class="fixed inset-0 z-[3001] flex justify-end bg-slate-900/40"
      @click.self="handleClose"
      role="presentation"
    >
      <div
        class="flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out md:rounded-l-2xl"
        :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="drawerLabelId"
      >
        <header
          class="bg-gradient-to-br from-indigo-500 to-violet-600 pb-3 text-white"
        >
          <div class="flex items-center justify-between px-4 pt-3 pb-1">
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/20 text-lg transition hover:bg-white/25"
              aria-label="닫기"
              @click="handleClose"
            >
              ←
            </button>
            <h2 :id="drawerLabelId" class="text-lg font-semibold tracking-tight">
              최근 웹빌더
            </h2>
            <span class="icon-btn-spacer w-9" aria-hidden="true"></span>
          </div>
        </header>

        <section class="flex-1 space-y-5 px-4 pb-32 pt-5 text-slate-800">
          <div v-if="!hasSessions" class="hint text-center text-[12px] text-[#6b7280]">
            최근 웹빌더 세션이 없습니다.
          </div>

          <ul v-else class="builder-list">
            <li
              v-for="session in sessions"
              :key="session.id"
              class="builder-item"
            >
              <div class="builder-meta">
                <div class="builder-title" :title="session.title">
                  {{ session.title }}
                </div>
                <small class="builder-time">{{ formatTimestamp(session.createdAt) }}</small>
              </div>
              <div class="builder-actions-row">
                <button class="btn-mini" type="button" @click="handleOpen(session.id)">
                  열기
                </button>
                <button
                  class="btn-mini ghost"
                  type="button"
                  @click="handleDuplicate(session.id)"
                >
                  복제
                </button>
                <button
                  class="btn-mini danger"
                  type="button"
                  @click="handleDelete(session.id)"
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
import { computed, nextTick, onBeforeUnmount, ref, toRef, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  builderSessions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  "update:modelValue",
  "open",
  "duplicate",
  "delete",
]);

const sessions = toRef(props, "builderSessions");

const overlayVisible = ref(false);
const drawerOpen = ref(false);
const drawerLabelId = "builderDrawerTitle";
let escHandler = null;
let closeTimer = null;

const hasSessions = computed(
  () => Array.isArray(sessions.value) && sessions.value.length > 0
);

function disableBodyScroll() {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "hidden";
  }
}

function restoreBodyScroll() {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
}

function detachEscListener() {
  if (escHandler && typeof document !== "undefined") {
    document.removeEventListener("keydown", escHandler);
    escHandler = null;
  }
}

function attachEscListener() {
  if (typeof document === "undefined") return;
  detachEscListener();
  escHandler = (event) => {
    if (event.key === "Escape") {
      handleClose();
    }
  };
  document.addEventListener("keydown", escHandler);
}

function handleClose() {
  emit("update:modelValue", false);
}

function handleOpen(id) {
  emit("open", id);
}

function handleDuplicate(id) {
  emit("duplicate", id);
}

function handleDelete(id) {
  emit("delete", id);
}

function formatTimestamp(source) {
  if (!source) return "";
  const date =
    source instanceof Date ? source : new Date(Number(source) || source);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleString();
  } catch (_err) {
    return date.toISOString();
  }
}

watch(
  () => props.modelValue,
  async (value) => {
    if (value) {
      if (closeTimer && typeof window !== "undefined") {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
      overlayVisible.value = true;
      disableBodyScroll();
      await nextTick();
      if (typeof window !== "undefined" && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => {
          drawerOpen.value = true;
        });
      } else {
        drawerOpen.value = true;
      }
      attachEscListener();
    } else if (overlayVisible.value) {
      if (closeTimer && typeof window !== "undefined") {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
      drawerOpen.value = false;
      detachEscListener();
      if (typeof window !== "undefined") {
        closeTimer = window.setTimeout(() => {
          overlayVisible.value = false;
          restoreBodyScroll();
          closeTimer = null;
        }, 220);
      } else {
        overlayVisible.value = false;
        restoreBodyScroll();
      }
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  detachEscListener();
  if (closeTimer && typeof window !== "undefined") {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }
  restoreBodyScroll();
});
</script>
