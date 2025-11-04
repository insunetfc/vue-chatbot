export const SUGGESTED_PROMPTS_INITIAL = [
  { title: "문서공유", desc: "고객 실시간 상담" },
  { title: "보장분석", desc: "계약 보장 내용 분석" },
  { title: "제안서작성", desc: "상황에 맞는추천 제안서 생성" },
  { title: "고객질문답변", desc: "고객이 묻는 질문/보조 답변" },
  { title: "안내문작성", desc: "후속 안내 문자·톡 발송" },
  { title: "상담스크립트", desc: "방문·콜 상담 대본 생성" },
  { title: "교육자료", desc: "상담·영업 교육자료 제작" },
  { title: "마케팅콘텐츠", desc: "홍보·마케팅 글/이미지 제작" },
  { title: "고객공략법", desc: "고객 유형별 공략 아이디어 제시" },
  { title: "예상수수료", desc: "계약 예상 수수료 계산" },
  { title: "보험금확인", desc: "보험금 수령 예상 금액" },
  { title: "모바일쿠폰", desc: "고객 대상 선물 전송" },
];

export function createPromptState() {
  return {
    forceInitPrompts: false,
    initExpanded: false,
    isAwaitingFollowups: false,
    suggestedPrompts: [],
    suggestedPromptsInitial: [...SUGGESTED_PROMPTS_INITIAL],
    lastClickedChipTitle: null,
  };
}

const EMOJI_MAP = {
  문서공유: "📄",
  보장분석: "🔍",
  제안서작성: "✍️",
  안내문작성: "📤",
  교육자료: "👨‍🏫",
  스케줄작성: "📅",
  상담스크립트: "💬",
  마케팅콘텐츠: "📢",
  "FAQ·상담보조": "❓",
  고객공략법: "📈",
  예상수수료: "💰",
  보험금확인: "🛡️",
  모바일쿠폰: "🎁",
  고객질문답변: "🧩",
};

const SHEET_PROP_MAP = {
  analysis: "showAnalysisSheet",
  proposal: "showProposalSheet",
  qna: "showQnaSheet",
  notice: "showNoticeSheet",
  bonus: "showBonusSheet",
  script: "showConsultScript",
  edu: "showEduMaterial",
  marketing: "showMarketingContent",
  schedule: "showConsultSchedule",
  strategy: "showCustomerStrategy",
  claim: "showClaimCheck",
};

const PROMPT_ACTION_MAP = {
  보장분석: { type: "open-sheet", sheet: "analysis" },
  제안서작성: { type: "open-sheet", sheet: "proposal" },
  고객질문답변: { type: "open-sheet", sheet: "qna" },
  안내문작성: { type: "open-sheet", sheet: "notice" },
  예상수수료: { type: "open-sheet", sheet: "bonus" },
  상담스크립트: { type: "open-sheet", sheet: "script" },
  교육자료: { type: "open-sheet", sheet: "edu" },
  마케팅콘텐츠: { type: "open-sheet", sheet: "marketing" },
  스케줄작성: { type: "open-sheet", sheet: "schedule" },
  고객공략법: { type: "open-sheet", sheet: "strategy" },
  보험금확인: { type: "open-sheet", sheet: "claim" },
};

export function promptEmojiIcon(title) {
  return EMOJI_MAP[title] || "";
}

export function resolveInitPromptAction(prompt = {}) {
  const title = (prompt?.title || "").trim();
  if (!title) {
    return { type: "none", title: "" };
  }

  const action = PROMPT_ACTION_MAP[title];
  if (action) {
    return { ...action, title };
  }

  const desc = typeof prompt?.desc === "string" ? prompt.desc.trim() : "";
  const suggestion = [title, desc].filter(Boolean).join(" ").trim();

  if (suggestion) {
    return {
      type: "apply-suggestion",
      title,
      suggestion,
    };
  }

  return { type: "apply-suggestion", title, suggestion: title };
}

export const chatPromptMethods = {
  emojiIcon(title) {
    return promptEmojiIcon(title);
  },
  onSuggestionSend(value) {
    this.applySuggestion(value, { send: true });
  },
  toggleInitExpand() {
    this.initExpanded = !this.initExpanded;
  },
  onInitChipClick(p) {
    const action = resolveInitPromptAction(p);
    if (action.title) {
      this.lastClickedChipTitle = action.title;
    }
    if (action.type === "open-sheet" && action.sheet) {
      const sheetProp = SHEET_PROP_MAP[action.sheet];
      if (sheetProp && Object.prototype.hasOwnProperty.call(this, sheetProp)) {
        this[sheetProp] = true;
        return;
      }
    }
    if (action.type === "apply-suggestion" && action.suggestion) {
      this.applySuggestion(action.suggestion, { send: true });
      return;
    }
    if (action.title) {
      this.applySuggestion(action.title, { send: true });
    }
  },
  resetToInitPrompts() {
    this.suggestedPrompts = [];
    this.isAwaitingFollowups = false;
    this.initExpanded = false;
    this.forceInitPrompts = true;
    this.$nextTick(this.scrollToBottom);
  },
  applySuggestion(text, { send = false } = {}) {
    this.userInput = text;
    this.forceInitPrompts = false;
    this.$nextTick(() => {
      this.$refs.chatComposer?.resetHeight?.();
      if (send) this.sendMessage();
      else this.$refs.chatComposer?.focusTextarea?.();
    });
  },
  _applyFollowups(arr) {
    let out = Array.isArray(arr) ? arr : [];
    out = out
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
    out = [...new Set(out)];
    if (out.length >= 3 && out.length <= 6) {
      this.suggestedPrompts = out;
    } else {
      throw new Error("3~6개 JSON 배열 아님");
    }
  },
  async updateFollowupSuggestions({ lastUser, botText }) {
    try {
      const fd = new FormData();
      fd.append("session_id", this.sessionId || this.generateSessionId());
      fd.append(
        "question",
        [
          "최근 대화 맥락을 바탕으로 고객이 바로 이어서 할 가능성이 큰 실무적 후속 질문 3~6개 생성.",
          '출력은 JSON 배열만. 예) ["질문1","질문2",...]',
          "코드블록(```), 마크다운, 주석, 설명문, 접두어 금지.",
        ].join(" ")
      );

      const categoryMeta = this.buildCategoryMetaString();
      const parts = categoryMeta.split("-");
      const jobValue = parts.slice(1).join("-");

      fd.append("category", "추가질문");
      fd.append("job", jobValue);

      const res = await fetch(`${this.API_BASE}/chat/suggestions`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);

      const arr = await res.json();
      if (!Array.isArray(arr)) throw new Error("응답이 배열 형식이 아님");

      this._applyFollowups(arr);
      this.isAwaitingFollowups = false;
    } catch (err) {
      console.debug("추가질문 API 실패, 폴백 사용:" + botText, err);
      const base = (lastUser || "").replace(/\s+/g, " ").trim();
      const topic = base.length > 0 ? base.slice(0, 32) : "이 내용";
      this.suggestedPrompts = [
        `${topic} 실제 사례 3개만 알려줘`,
        `${topic} 제안서 형식으로 작성해줘`,
        "비슷한 상황에서 주의해야 할 점은 무엇인가요?",
        "이걸 적용하면 기대할 수 있는 효과는 무엇인가요?",
        "추가로 참고할 만한 자료가 있나요?",
        "다른 옵션이나 대안이 있다면 알려주세요",
      ];
      this.isAwaitingFollowups = false;
    }
  },
};
