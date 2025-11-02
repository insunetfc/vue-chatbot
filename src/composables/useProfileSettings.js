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
    divisions: ["영업", "지원", "교육", "정보"],
    jobSuggestions: [
      "보험설계사",
      "손해사정사",
      "GA 설계사",
      "언더라이터",
      "콜센터 상담사",
    ],
    showSettingsModal: false,
  };
}

export const profileSettingsMethods = {
  openSettings(target) {
    this.showSettingsModal = true;
    document.body.classList.add("lock-scroll");
    document.body.style.overflow = "hidden";
    this._escHandler = (e) => {
      if (e.key === "Escape") this.closeSettings();
    };
    document.addEventListener("keydown", this._escHandler);

    this.$nextTick(() => {
      const doScroll = () => this.scrollToDrawerTarget(target);
      setTimeout(doScroll, 320);
    });
  },
  closeSettings() {
    this.showSettingsModal = false;
    document.body.style.overflow = "";
    document.body.classList.remove("lock-scroll");
    document.removeEventListener("keydown", this._escHandler);
  },
  loadSettings() {
    try {
      const raw = localStorage.getItem("chat_profile");
      if (raw) {
        const p = JSON.parse(raw);
        this.profile = {
          name: p.name || "",
          email: p.email || "",
          phone: p.phone || "",
          division: p.division || "",
          job: p.job || "",
          avatar: p.avatar || "",
        };
      } else {
        this.profile.division = "영업";
        this.profile.job = "보험설계사";
      }
    } catch (err) {
      console.warn("Failed to load profile from localStorage:", err);
      this.profile = {
        name: "",
        email: "",
        phone: "",
        division: "영업",
        job: "보험설계사",
        avatar: "",
      };
    }
  },
  saveSettings() {
    this.saveSettingsToStorage();
    this.closeSettings();
  },
  saveSettingsToStorage() {
    try {
      localStorage.setItem("chat_profile", JSON.stringify(this.profile));
    } catch (err) {
      console.warn("Failed to save profile to localStorage:", err);
    }
  },
  triggerAvatarPick() {
    this.$refs.avatarInput?.click();
  },
  async onAvatarSelected(e) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      this.showError("이미지 파일을 선택해주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.profile.avatar = reader.result;
      this.saveSettingsToStorage();
    };
    reader.onerror = (err) => console.warn("avatar read error:", err);
    reader.readAsDataURL(file);
  },
  onSettingsClick() {
    this.openSettings();
  },
  onDivisionTagClick() {
    this.openSettings("division");
  },
  scrollToDrawerTarget(target) {
    const drawer = this.$refs.drawer;
    if (!drawer || !target) return;

    const el =
      target === "division"
        ? this.$refs.divisionField
        : target === "job"
        ? this.$refs.jobField
        : null;

    if (!el) return;

    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_) {
      const top =
        el.getBoundingClientRect().top +
        drawer.scrollTop -
        drawer.clientHeight / 2;
      drawer.scrollTo({ top, behavior: "smooth" });
    }

    this.$nextTick(() => {
      if (target === "job") {
        el.focus?.();
      } else if (target === "division") {
        const radio =
          el.querySelector("input[type=radio]:checked") ||
          el.querySelector("input[type=radio]");
        radio?.focus?.();
      }
    });
  },
  formatPhone(v) {
    const d = (v || "").replace(/\D/g, "").slice(0, 11);
    if (d.startsWith("02")) {
      if (d.length <= 2) return d;
      if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
      return `${d.slice(0, 2)}-${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    }
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
  },
  onPhoneInput(e) {
    const formatted = this.formatPhone(e.target.value);
    this.profile.phone = formatted;
    this.$nextTick(() => {
      try {
        const el = e.target;
        const pos = formatted.length;
        el.setSelectionRange(pos, pos);
      } catch (err) {
        console.debug("setSelectionRange unsupported:", err);
      }
    });
  },
};
