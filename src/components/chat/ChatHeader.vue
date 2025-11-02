<template>
  <header
    class="fixed top-0 left-0 right-0 z-[1001] mx-auto flex w-full max-w-[600px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur"
  >
    <div class="flex items-center">
      <button
        type="button"
        class="inline-flex items-center justify-center text-base transition bg-white border rounded-full shadow-sm h-9 w-9 border-slate-200 hover:bg-slate-50 mr-[10px]"
        aria-label="채팅 이력 보기"
        @click="$emit('history-click')"
      >
        <span class="sr-only">채팅 이력 열기</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="16" y2="12" />
          <line x1="4" y1="18" x2="12" y2="18" />
        </svg>
      </button>
      <img :src="logo" alt="로고" class="w-auto h-8" />
    </div>

    <div class="flex items-center min-w-0 gap-2">
      <div
        class="flex items-center flex-1 gap-2 text-xs font-medium text-slate-600"
      >
        <button
          v-if="profile?.division"
          type="button"
          class="inline-flex items-center gap-2 px-3 py-1 text-white transition border rounded-full shadow border-indigo-200/60 bg-gradient-to-r from-indigo-500 to-violet-500 hover:shadow-md"
          @click="$emit('division-click')"
        >
          <span class="inline-block w-2 h-2 rounded-full bg-white/80"></span>
          <span class="truncate"
            >[{{ profile.division }}] {{ profile.job }}</span
          >
        </button>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center text-base transition bg-white border rounded-full shadow-sm h-9 w-9 border-slate-200 hover:bg-slate-50"
        @click="$emit('open-builder')"
        aria-label="최근 웹빌더 열기"
      >
        🌐
      </button>
      <button
        type="button"
        class="relative inline-flex items-center justify-center overflow-hidden text-sm font-semibold transition border rounded-full shadow-sm h-9 w-9 border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
        @click="$emit('settings-click')"
        aria-label="프로필 설정 열기"
      >
        <template v-if="profile?.avatar">
          <img
            :src="profile.avatar"
            alt="프로필 이미지"
            class="object-cover w-full h-full"
          />
        </template>
        <template v-else>
          <span class="text-sm font-semibold">{{ initials }}</span>
        </template>
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  profile: {
    type: Object,
    default: () => ({}),
  },
  initials: {
    type: String,
    default: "",
  },
  logo: {
    type: String,
    default: "/logo.png",
  },
});

defineEmits([
  "history-click",
  "division-click",
  "open-builder",
  "settings-click",
]);
</script>
