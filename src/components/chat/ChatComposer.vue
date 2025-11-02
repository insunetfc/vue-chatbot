<template>
  <form
    ref="formRef"
    class="fixed bottom-0 left-0 right-0 mx-auto flex w-full max-w-[600px] items-end gap-2 border-t border-slate-200 bg-white px-3 py-3"
    :class="{ 'border-indigo-400 bg-indigo-50': isDragOver }"
    @submit.prevent="emit('send')"
  >
    <button
      type="button"
      class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
      :disabled="isSending"
      @click.stop="togglePicker"
      aria-label="파일 업로드"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="#555"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>

    <div
      v-if="pickerOpen"
      class="absolute bottom-20 left-3 z-[1200] min-w-[180px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
      v-click-outside="closePicker"
      @click.stop
    >
      <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100" @click="openPicker('docs')">
        📄 문서 업로드
      </button>
      <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100" @click="openPicker('images')">
        🖼 사진 업로드
      </button>
    </div>

    <input
      ref="docsInput"
      type="file"
      class="hidden"
      multiple
      @change="onFilesSelected"
      accept="application/pdf, text/plain, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/vnd.ms-powerpoint.presentation.macroEnabled.12, application/vnd.openxmlformats-officedocument.presentationml.slideshow, .ppt,.pptx,.pps,.ppsx"
    />
    <input
      ref="imagesInput"
      type="file"
      class="hidden"
      multiple
      accept="image/*"
      @change="onFilesSelected"
    />

    <textarea
      ref="textarea"
      class="h-10 w-full resize-none rounded-xl border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none ring-0 transition focus:border-indigo-300 focus:bg-white focus:shadow-inner focus:ring-2 focus:ring-indigo-200"
      :value="modelValue"
      placeholder="무엇이든 물어보세요..."
      rows="1"
      autocomplete="off"
      @input="onInput"
      @keydown="(event) => emit('keydown', event)"
      @compositionstart="(event) => emit('compositionstart', event)"
      @compositionend="(event) => emit('compositionend', event)"
    ></textarea>

    <button
      type="button"
      class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white shadow transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      :disabled="!canSend || isSending"
      aria-label="메시지 전송"
      @click="emit('send')"
    >
      <svg viewBox="0 0 24 24" fill="white" width="18" height="18" aria-hidden="true">
        <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
      </svg>
    </button>
  </form>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  isSending: {
    type: Boolean,
    default: false,
  },
  canSend: {
    type: Boolean,
    default: false,
  },
  isDragOver: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'update:modelValue',
  'send',
  'files-selected',
  'keydown',
  'compositionstart',
  'compositionend',
]);

const pickerOpen = ref(false);
const formRef = ref(null);
const textarea = ref(null);
const docsInput = ref(null);
const imagesInput = ref(null);

const vClickOutside = {
  mounted(el, binding) {
    const handler = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value?.();
      }
    };
    el.__clickOutside__ = handler;
    document.addEventListener('click', handler);
  },
  unmounted(el) {
    if (el.__clickOutside__) {
      document.removeEventListener('click', el.__clickOutside__);
    }
  },
};

function autoResize() {
  if (!textarea.value) return;
  textarea.value.style.height = 'auto';
  textarea.value.style.height = `${Math.min(textarea.value.scrollHeight, 200)}px`;
}

watch(
  () => props.modelValue,
  () => nextTick(() => autoResize()),
  { immediate: true },
);

function onInput(event) {
  const target = event.target;
  emit('update:modelValue', target.value);
  autoResize();
}

function togglePicker() {
  pickerOpen.value = !pickerOpen.value;
}

function closePicker() {
  pickerOpen.value = false;
}

function openPicker(kind) {
  pickerOpen.value = false;
  if (kind === 'images') imagesInput.value?.click();
  else docsInput.value?.click();
}

function onFilesSelected(event) {
  const target = event.target;
  if (!target.files || !target.files.length) return;
  const kind = target === imagesInput.value ? 'images' : 'docs';
  emit('files-selected', { files: Array.from(target.files), kind });
  target.value = '';
}

function focusTextarea() {
  textarea.value?.focus();
}

defineExpose({
  root: formRef,
  focusTextarea,
  resetHeight: autoResize,
  openPicker,
  textarea,
});
</script>
