import { reactive, toRefs } from 'vue';

const DEFAULT_PROMPTS = [
  { title: '문서공유', desc: '고객 실시간 상담' },
  { title: '보장분석', desc: '계약 보장 내용 분석' },
  { title: '제안서작성', desc: '우선순위 추천 제안서 생성' },
  { title: '안내문작성', desc: '후속 안내문·톡 발송' },
  { title: '교육자료', desc: '상담·영업 교육자료 제작' },
  { title: '스케줄작성', desc: '업무·상담 일정 계획' },
  { title: '상담스크립트', desc: '방문·콜 상담 대본 생성' },
  { title: '마케팅콘텐츠', desc: '홍보·마케팅 글/이미지 제작' },
  { title: 'FAQ·상담보조', desc: '자주 묻는 질문/보조 답변' },
  { title: '성공율측정', desc: '계약 성공률 분석·개선' },
  { title: '예상수수료', desc: '계약 예상 수수료 계산' },
  { title: '보상담보예상', desc: '보험금·담보금 예상' },
  { title: '모바일쿠폰', desc: '고객 대상 선물 전송' },
];

const state = reactive({
  messages: [],
  sessionId: null,
  builderSessions: [],
  isAwaitingFollowups: false,
  suggestedPrompts: [],
  suggestedPromptsInitial: [...DEFAULT_PROMPTS],
  lastClickedChipTitle: null,
  isSending: false,
  abortController: null,
  apiBase: process.env.VUE_APP_API_BASE || 'http://15.165.60.45:5000',
});

function generateSessionId() {
  return `sess-${Math.random().toString(36).slice(2, 11)}`;
}

function ensureSessionId() {
  if (!state.sessionId) {
    state.sessionId = generateSessionId();
  }
  return state.sessionId;
}

function resetSession() {
  state.sessionId = null;
  state.messages = [];
}

function setAbortController(controller) {
  state.abortController = controller;
}

function clearAbortController() {
  state.abortController = null;
}

function setIsSending(flag) {
  state.isSending = flag;
}

function setAwaitingFollowups(flag) {
  state.isAwaitingFollowups = flag;
}

function setLastClickedChipTitle(title) {
  state.lastClickedChipTitle = title;
}

function setSuggestedPrompts(list) {
  state.suggestedPrompts = list;
}

function setMessages(nextMessages) {
  state.messages = nextMessages;
}

export function useChatStore() {
  return {
    ...toRefs(state),
    generateSessionId,
    ensureSessionId,
    resetSession,
    setAbortController,
    clearAbortController,
    setIsSending,
    setAwaitingFollowups,
    setLastClickedChipTitle,
    setSuggestedPrompts,
    setMessages,
  };
}
