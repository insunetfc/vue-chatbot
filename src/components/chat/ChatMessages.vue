<template>
  <div
    ref="container"
    class="relative flex flex-col flex-1 gap-3 px-3 pt-4 mt-16 overflow-y-auto pb-44"
  >
    <template v-for="(msg, index) in messages" :key="index">
      <div
        :class="[
          'flex max-w-[85%] gap-2',
          msg.role === 'user'
            ? 'ml-auto max-w-[90%] justify-end'
            : 'justify-start',
        ]"
      >
        <div
          v-if="msg.role !== 'user'"
          class="flex items-center justify-center w-8 h-8 text-xl text-slate-500"
        >
          🤖
        </div>
        <div v-else class="hidden"></div>

        <div
          :class="[
            'w-full rounded-2xl px-4 py-3 text-sm leading-relaxed shadow',
            msg.role === 'user'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'bg-slate-100/80 text-slate-700 shadow-sm',
          ]"
        >
          <div v-if="msg.attachments?.length" class="flex flex-wrap gap-2 mb-3">
            <div
              v-for="(att, attIndex) in msg.attachments"
              :key="attIndex"
              class="flex min-w-[120px] items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
            >
              <template v-if="att.kind === 'image'">
                <img
                  :src="att.src"
                  :alt="att.name"
                  class="object-cover w-20 h-20 rounded-lg"
                />
              </template>
              <template v-else>
                <span class="text-lg">{{ att.emoji }}</span>
                <span
                  class="max-w-[150px] truncate text-xs text-slate-600"
                  :title="att.name"
                  >{{ att.name }}</span
                >
              </template>
            </div>
          </div>

          <div
            v-if="msg.meta?.builderSessionId"
            class="flex flex-wrap items-center gap-2 mb-3"
            role="group"
            aria-label="웹빌더 작업"
          >
            <button
              type="button"
              class="inline-flex items-center justify-center px-3 py-1 text-xs font-semibold text-white transition bg-indigo-500 rounded-full shadow-sm hover:bg-indigo-600"
              @click="$emit('open-builder', msg.meta?.builderSessionId)"
            >
              웹빌더 열기
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center px-3 py-1 text-xs font-semibold text-indigo-500 transition bg-white border border-indigo-200 rounded-full shadow-sm hover:bg-indigo-50"
              @click="$emit('duplicate-builder', msg.meta?.builderSessionId)"
            >
              복제
            </button>
          </div>

          <template v-if="msg.loading">
            <span
              v-if="msg.loadingText"
              class="block mb-1 text-xs font-medium text-slate-500"
              >{{ msg.loadingText }}</span
            >
            <span class="flex items-center gap-1 text-slate-500">
              <span
                class="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current"
              ></span>
              <span
                class="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0.15s]"
              ></span>
              <span
                class="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0.3s]"
              ></span>
            </span>
          </template>
          <span v-else v-html="renderMessage(msg.text)"></span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
  formatMessage: {
    type: Function,
    required: true,
  },
});

defineEmits(["open-builder", "duplicate-builder"]);

const container = ref(null);
const renderMessage = (value) => props.formatMessage(value ?? "");

defineExpose({ container });
</script>
