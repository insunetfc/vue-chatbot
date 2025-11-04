import { reactive, computed, toRefs } from "vue";

const DEFAULT_PROFILE = {
  userid: "",
  name: "",
  email: "",
  phone: "",
  division: "영업",
  job: "보험설계사",
  avatar: "",
};

const state = reactive({
  profile: { ...DEFAULT_PROFILE },
  divisions: ["영업", "지원", "교육", "정보"],
  jobSuggestions: [
    "보험설계사",
    "손해사정사",
    "GA 설계사",
    "언더라이터",
    "콜센터 상담사",
  ],
});

let initialized = false;

function loadProfileFromStorage() {
  if (typeof window === "undefined") {
    state.profile = { ...DEFAULT_PROFILE };
    return;
  }
  try {
    const raw = window.localStorage.getItem("chat_profile");
    if (!raw) {
      state.profile = { ...DEFAULT_PROFILE };
      return;
    }
    const parsed = JSON.parse(raw);
    state.profile = {
      name: parsed.name || "",
      email: parsed.email || "",
      phone: parsed.phone || "",
      division: parsed.division || "영업",
      job: parsed.job || "보험설계사",
      avatar: parsed.avatar || "",
    };
  } catch (error) {
    console.warn("Failed to load profile from localStorage:", error);
    state.profile = { ...DEFAULT_PROFILE };
  }
}

function saveProfileToStorage(profile = state.profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("chat_profile", JSON.stringify(profile));
  } catch (error) {
    console.warn("Failed to save profile to localStorage:", error);
  }
}

function updateProfile(partial = {}) {
  state.profile = { ...state.profile, ...partial };
  saveProfileToStorage();
}

function formatPhone(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(
      2,
      digits.length - 4
    )}-${digits.slice(-4)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(
    3,
    digits.length - 4
  )}-${digits.slice(-4)}`;
}

const initials = computed(() => {
  const name = (state.profile.name || "").trim();
  if (!name) return "U";
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  return (first + second).slice(0, 2).toUpperCase();
});

function buildCategoryMetaString() {
  const phoneDigits = (state.profile.phone || "").replace(/\D+/g, "");
  const parts = [
    (state.profile.division || "").trim(),
    (state.profile.job || "").trim(),
    `이름:${(state.profile.name || "").trim()}`,
    `이메일:${(state.profile.email || "").trim()}`,
    `전화:${phoneDigits}`,
  ].filter(Boolean);
  return parts.join("-");
}

export function useUserStore() {
  if (!initialized && typeof window !== "undefined") {
    loadProfileFromStorage();
    initialized = true;
  }

  return {
    ...toRefs(state),
    initials,
    loadProfileFromStorage,
    saveProfileToStorage,
    updateProfile,
    formatPhone,
    buildCategoryMetaString,
  };
}
