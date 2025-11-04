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
      @click.self="handleBackdropClick"
      role="presentation"
    >
      <div
        class="flex h-full w-full max-w-[520px] flex-col md:rounded-l-2xl overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out"
        :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
        ref="drawer"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="drawerLabelId"
      >
        <header
          class="pb-3 text-white bg-gradient-to-br from-indigo-500 to-violet-600"
        >
          <div class="flex items-center justify-between px-4 pt-3 pb-1">
            <button
              type="button"
              class="inline-flex items-center justify-center text-lg transition border rounded-lg h-9 w-9 border-white/30 bg-white/20 hover:bg-white/25"
              aria-label="닫기"
              @click="handleCancel"
            >
              ←
            </button>
            <h2
              :id="drawerLabelId"
              class="text-lg font-semibold tracking-tight"
            >
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
                v-if="profile?.avatar"
                :src="profile.avatar"
                alt="프로필 이미지"
                class="object-cover w-full h-full"
              />
              <span v-else class="text-lg font-semibold">{{
                fallbackInitials
              }}</span>
            </button>
            <p class="mt-2 text-sm text-white/90">
              고객 응대에 사용되는 기본 정보를 설정하세요.
            </p>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onAvatarSelected"
            />
          </div>
        </header>

        <section
          class="flex-1 px-4 pt-5 pb-32 space-y-5 overflow-y-auto text-slate-800"
          :aria-labelledby="accountSectionId"
        >
          <h3
            :id="accountSectionId"
            class="text-sm font-semibold text-slate-800"
          >
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

          <h3
            class="text-sm font-semibold text-slate-800"
            :id="contactSectionId"
          >
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

          <h3 class="text-sm font-semibold text-slate-800" :id="roleSectionId">
            업무 속성
          </h3>
          <div
            class="flex gap-2 px-1 pb-2 overflow-x-auto"
            role="radiogroup"
            :aria-labelledby="roleSectionId"
          >
            <div
              class="flex gap-2"
              ref="divisionField"
              role="radiogroup"
              :aria-labelledby="roleSectionId"
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

        <footer
          class="sticky bottom-0 left-0 right-0 flex gap-3 border-t border-slate-200 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md"
        >
          <button
            class="flex-1 font-semibold transition bg-white border min-h-11 rounded-xl border-slate-200 text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
            type="button"
            @click="handleCancel"
          >
            취소
          </button>
          <button
            class="flex-1 font-semibold text-white transition shadow-lg min-h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
            type="button"
            @click="handleSave"
          >
            저장
          </button>
        </footer>

        <p class="py-3 text-xs text-center text-slate-500">
          전송 시 <code>category</code>에<br />
          <strong>{{ previewCategoryString }}</strong> 로 포함됩니다.
        </p>
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
  profile: {
    type: Object,
    required: true,
  },
  divisions: {
    type: Array,
    default: () => [],
  },
  jobSuggestions: {
    type: Array,
    default: () => [],
  },
  initials: {
    type: String,
    default: "",
  },
  previewCategoryString: {
    type: String,
    default: "",
  },
  target: {
    type: String,
    default: null,
  },
  loginInfo: {
    type: Object,
    default: () => ({}),
  },
});

const profile = toRef(props, "profile");
const divisions = toRef(props, "divisions");
const jobSuggestions = toRef(props, "jobSuggestions");
const initials = toRef(props, "initials");
const previewCategoryString = toRef(props, "previewCategoryString");

const emit = defineEmits([
  "update:modelValue",
  "save",
  "avatar-selected",
  "phone-input",
]);

const overlayVisible = ref(false);
const drawerOpen = ref(false);
const drawer = ref(null);
const divisionField = ref(null);
const jobField = ref(null);
const avatarInput = ref(null);
let escHandler = null;
let closeTimer = null;

const drawerLabelId = "drawerTitle";
const accountSectionId = "sec-account";
const contactSectionId = "sec-contact";
const roleSectionId = "sec-role";

const fallbackInitials = computed(() => initials.value || "U");

function restoreBodyScroll() {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
}

function disableBodyScroll() {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "hidden";
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
  if (escHandler) {
    document.removeEventListener("keydown", escHandler);
  }
  escHandler = (event) => {
    if (event.key === "Escape") {
      handleCancel();
    }
  };
  document.addEventListener("keydown", escHandler);
}

function handleBackdropClick() {
  handleCancel();
}

function handleCancel() {
  emit("update:modelValue", false);
}

function handleSave() {
  emit("save");
}

function triggerAvatarPick() {
  avatarInput.value?.click?.();
}

function onAvatarSelected(event) {
  emit("avatar-selected", event);
}

function onPhoneInput(event) {
  emit("phone-input", event);
}

function scrollToTarget(target) {
  if (!target || !drawer.value) return;
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
    try {
      const top =
        el.getBoundingClientRect().top +
        drawer.value.scrollTop -
        drawer.value.clientHeight / 2;
      drawer.value.scrollTo({ top, behavior: "smooth" });
    } catch (err) {
      console.debug("scrollToTarget fallback error", err);
    }
  }

  nextTick(() => {
    if (target === "job") {
      jobField.value?.focus?.();
    } else if (target === "division") {
      const radio =
        divisionField.value?.querySelector?.("input[type=radio]:checked") ||
        divisionField.value?.querySelector?.("input[type=radio]");
      radio?.focus?.();
    }
  });
}

watch(
  () => props.modelValue,
  async (value) => {
    if (value) {
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
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
    } else if (overlayVisible.value) {
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
      }
    }
  },
  { immediate: true }
);

watch(
  () => [props.target, drawerOpen.value],
  ([target, open]) => {
    if (open && target) {
      if (typeof window !== "undefined") {
        window.setTimeout(() => scrollToTarget(target), 320);
      } else {
        scrollToTarget(target);
      }
    }
  }
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
