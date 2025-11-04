import { reactive, toRefs, nextTick } from "vue";

const DEFAULT_DIVISIONS = ["영업", "지원", "교육", "정보"];
const DEFAULT_JOB_SUGGESTIONS = [
  "보험설계사",
  "손해사정사",
  "GA 설계사",
  "언더라이터",
  "콜센터 상담사",
];

function lockBodyScroll() {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;
  body.dataset.prevOverflow = body.style.overflow || "";
  body.style.overflow = "hidden";
  body.classList.add("lock-scroll");
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;
  const prev = body.dataset.prevOverflow;
  if (prev !== undefined) {
    body.style.overflow = prev;
    delete body.dataset.prevOverflow;
  } else {
    body.style.overflow = "";
  }
  body.classList.remove("lock-scroll");
}

export function formatPhone(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

export function useProfileSettings(options = {}) {
  const state = reactive({
    showSettingsModal: false,
    settingsDrawerTarget: null,
    divisions: options.divisions || DEFAULT_DIVISIONS,
    jobSuggestions: options.jobSuggestions || DEFAULT_JOB_SUGGESTIONS,
  });

  let escHandler = null;

  function closeSettings() {
    state.showSettingsModal = false;
    state.settingsDrawerTarget = null;
    unlockBodyScroll();
    if (escHandler) {
      document.removeEventListener("keydown", escHandler);
      escHandler = null;
    }
  }

  function openSettings(target = null) {
    state.settingsDrawerTarget = target;
    if (state.showSettingsModal) return;
    state.showSettingsModal = true;
    lockBodyScroll();
    if (!escHandler) {
      escHandler = (event) => {
        if (event.key === "Escape") {
          closeSettings();
        }
      };
      document.addEventListener("keydown", escHandler);
    }
    if (typeof options.onOpen === "function") {
      nextTick(() => options.onOpen(target));
    }
  }

  function onPhoneInput(event, update) {
    const formatted = formatPhone(event?.target?.value || "");
    if (typeof update === "function") {
      update(formatted);
    }
    nextTick(() => {
      try {
        const el = event?.target;
        const pos = formatted.length;
        el?.setSelectionRange?.(pos, pos);
      } catch (err) {
        console.debug("setSelectionRange unsupported", err);
      }
    });
  }

  return {
    ...toRefs(state),
    openSettings,
    closeSettings,
    onPhoneInput,
    formatPhone,
  };
}

export function createProfileSettingsState() {
  return {
    profile: {
      name: "",
      email: "",
      phone: "",
      division: "",
      job: "",
      avatar: "",
    },
    divisions: DEFAULT_DIVISIONS.slice(),
    jobSuggestions: DEFAULT_JOB_SUGGESTIONS.slice(),
    showSettingsModal: false,
  };
}

export const profileSettingsMethods = {};
