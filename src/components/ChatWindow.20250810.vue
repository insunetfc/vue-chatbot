<template>
  <!-- ✅ 전체 드래그 오버레이 -->
  <div v-if="isDraggingFile" class="drag-overlay">
    <div class="drag-overlay-content">
      📎 무엇이든 추가하세요
    </div>
  </div>

  <div class="chat-wrapper">
    <div v-if="errorMessage" class="error-toast" role="alert" aria-live="polite">
      {{ errorMessage }}
    </div>

    <!-- 로고 영역 -->
    <div class="chat-header">
      <img src="/logo.png" alt="로고" class="chat-logo" />
    </div>

    <!-- 메시지 영역 -->
    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="['chat-bubble', msg.role]"
      >
        <div class="avatar">
          <span v-if="msg.role === 'user'">🙋</span>
        </div>

        <div class="bubble-content">
          <!-- 첨부(메시지 버블 내부) -->
          <div v-if="msg.attachments && msg.attachments.length" class="bubble-attachments">
            <div v-for="(att, i) in msg.attachments" :key="i" class="bubble-attachment">
              <template v-if="att.kind==='image'">
                <img :src="att.src" :alt="att.name" />
              </template>
              <template v-else>
                <span class="file-emoji">{{ att.emoji }}</span>
                <span class="file-label" :title="att.name">{{ att.name }}</span>
              </template>
            </div>
          </div>

          <!-- 텍스트 -->
          <span v-if="msg.loading" class="typing-indicator">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </span>
          <span v-else v-html="safeFormat(msg.text)"></span>
        </div>
      </div>
    </div>

    <!-- ✨ 작성 중 첨부 미리보기(전송 전, 입력창 위 고정) -->
    <div v-if="uploadedFiles.length" class="compose-preview-container">
      <div v-for="(file, index) in uploadedFiles" :key="index" class="compose-preview-item">
        <div v-if="file.type.startsWith('image/')" class="image-preview">
          <img :src="previewURLs[index]" alt="미리보기" />
        </div>
        <div v-else class="file-icon">
          <span>{{ fileEmoji(file.name) }}</span>
          <span class="file-name" :title="file.name">{{ file.name }}</span>
        </div>
        <button class="remove-file" @click="removeFile(index)" aria-label="첨부 삭제">✖</button>
      </div>
    </div>

    <!-- 입력 영역 -->
    <form class="chat-input-container" :class="{ dragover: isDragOver }" @submit.prevent>
      <button
        type="button"
        class="upload-button"
        aria-label="파일 업로드"
        @click="$refs.fileInput.click()"
        :disabled="isSending"
      >
        <!-- 플러스 아이콘 -->
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <input
        ref="fileInput"
        type="file"
        style="display:none"
        @change="handleFileUpload"
        multiple
        accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.xls,.xlsx"
      />

      <textarea
        v-model="userInput"
        ref="chatInput"
        class="chat-textarea"
        placeholder="무엇이든 물어보세요..."
        rows="1"
        @input="autoResize"
        @keydown="onKeydown"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      ></textarea>

      <button
        type="button"
        class="send-button"
        :disabled="!canSend || isSending"
        aria-label="메시지 전송"
        @click="sendMessage"
      >
        <svg viewBox="0 0 24 24" fill="white" width="18" height="18" aria-hidden="true">
          <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
        </svg>
      </button>
    </form>
  </div>
</template>

<script>
/**
 * Vue 3 SFC
 * npm i dompurify
 */
import DOMPurify from "dompurify";

export default {
  name: "ChatAA",
  data() {
    return {
      userInput: "",
      messages: [],
      sessionId: null,

      // 작성 중 첨부(전송 전)
      uploadedFiles: [],
      previewURLs: [], // objectURL (전송 시 revoke)
      isDragOver: false,
      isDraggingFile: false,
      dragCounter: 0,

      errorMessage: "",
      isSending: false,
      isComposing: false,
      abortController: null,

      // 설정
      API_BASE: "http://15.165.60.45:5000",
      LIMIT_MAX_FILES: 3,
      LIMIT_PER_FILE: 10 * 1024 * 1024, // 10MB
      LIMIT_TOTAL: 25 * 1024 * 1024    // 25MB
    };
  },
  computed: {
    canSend() {
      return (this.userInput.trim().length > 0) || (this.uploadedFiles.length > 0);
    }
  },
  mounted() {
    // drag global
    window.addEventListener("dragenter", this.onDragEnter);
    window.addEventListener("dragleave", this.onDragLeave);
    window.addEventListener("dragover", this.onDragOver);
    window.addEventListener("drop", this.onDrop);

    // viewport/blur 안전장치
    this._vvHandler = () => this.scrollToBottom();
    if (window.visualViewport) window.visualViewport.addEventListener("resize", this._vvHandler);

    this._blurHandler = () => { this.dragCounter = 0; this.isDraggingFile = false; };
    window.addEventListener("blur", this._blurHandler);
    document.addEventListener("visibilitychange", this._blurHandler);

    // 윈도우 밖으로 마우스 나가면 drag overlay 해제
    this._leaveWindow = (e) => {
      if (e.clientX <= 0 || e.clientY <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        this.dragCounter = 0;
        this.isDraggingFile = false;
      }
    };
    window.addEventListener("mouseout", this._leaveWindow);
  },
  beforeUnmount() {
    window.removeEventListener("dragenter", this.onDragEnter);
    window.removeEventListener("dragleave", this.onDragLeave);
    window.removeEventListener("dragover", this.onDragOver);
    window.removeEventListener("drop", this.onDrop);

    if (window.visualViewport && this._vvHandler) {
      window.visualViewport.removeEventListener("resize", this._vvHandler);
    }
    window.removeEventListener("blur", this._blurHandler);
    document.removeEventListener("visibilitychange", this._blurHandler);
    window.removeEventListener("mouseout", this._leaveWindow);

    // 미리보기 정리
    this.clearAllPreviews();
  },
  methods: {
    generateSessionId() {
      return "sess-" + Math.random().toString(36).slice(2, 11);
    },
    showError(msg) {
      this.errorMessage = msg;
      setTimeout(() => (this.errorMessage = ""), 4000);
    },

    // ------ XSS-safe 포맷팅 ------
    safeFormat(text) {
      // 1) escape
      const esc = (s) =>
        s.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;");

      const escaped = esc(text || "");

      // 2) 간단 마크업(**굵게**, - 불릿, 줄바꿈)
      const withBold = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      const withBullets = withBold.replace(/(?:^|\n)- (.*?)(?=\n|$)/g, "<br>• $1");
      const withBreaks = withBullets.replace(/\n/g, "<br>");

      // 3) 최종 sanitize
      return DOMPurify.sanitize(withBreaks, {
        ALLOWED_TAGS: ["br","strong","b"],
        ALLOWED_ATTR: []
      });
    },

    // ------ 키 입력 ------
    onCompositionStart() { this.isComposing = true; },
    onCompositionEnd() { this.isComposing = false; },
    onKeydown(e) {
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) return; // 모바일은 Enter=줄바꿈

      if (e.key === "Enter" && !e.shiftKey && !this.isComposing) {
        e.preventDefault();
        this.sendMessage();
      }
    },

    // ------ 파일 처리 ------
    fileEmoji(name) {
      if (name.endsWith(".pdf")) return "📕";
      if (name.endsWith(".docx")) return "📘";
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "📗";
      return "📄";
    },
    async handleFileUpload(e) {
      const incoming = Array.from(e.target.files || []);
      if (!incoming.length) return;

      const validExtensions = /\.(pdf|txt|docx|png|jpg|jpeg|xls|xlsx)$/i;

      // 현재 총합
      const currentTotal = this.uploadedFiles.reduce((s,f)=>s+f.size,0);
      const seen = new Set(this.uploadedFiles.map(f => `${f.name}:${f.size}`));

      let added = [];
      let totalAddSize = 0;

      for (const f of incoming) {
        if (!validExtensions.test(f.name)) { this.showError(`❌ 지원 안함: ${f.name}`); continue; }
        if (this.uploadedFiles.length + added.length >= this.LIMIT_MAX_FILES) { this.showError("❌ 최대 3개 파일"); break; }
        if (f.size > this.LIMIT_PER_FILE) { this.showError(`❌ 10MB 초과: ${f.name}`); continue; }
        if (currentTotal + totalAddSize + f.size > this.LIMIT_TOTAL) { this.showError("❌ 총 25MB 초과"); break; }

        const key = `${f.name}:${f.size}`;
        if (seen.has(key)) continue; // 중복 차단

        added.push(f);
        totalAddSize += f.size;
      }

      // 미리보기 URL 생성
      for (const f of added) {
        this.uploadedFiles.push(f);
        if (f.type.startsWith("image/")) {
          const url = URL.createObjectURL(f);
          this.previewURLs.push(url);
        } else {
          this.previewURLs.push(""); // 자리 맞춤
        }
      }

      this.$nextTick(this.scrollToBottom);
      e.target.value = "";
    },
    removeFile(index) {
      const url = this.previewURLs[index];
      if (url) URL.revokeObjectURL(url);
      this.previewURLs.splice(index,1);
      this.uploadedFiles.splice(index,1);
    },
    clearAllPreviews() {
      this.previewURLs.forEach(u => u && URL.revokeObjectURL(u));
      this.previewURLs = [];
      this.uploadedFiles = [];
    },

    // 메시지 버블에 보존할 썸네일(DataURL) 생성
    async buildAttachmentPayloadForMessage() {
      const result = [];
      for (let i=0; i<this.uploadedFiles.length; i++) {
        const f = this.uploadedFiles[i];
        if (f.type.startsWith("image/")) {
          const dataUrl = await this.readFileAsDataURL(f);
          result.push({ kind: "image", src: dataUrl, name: f.name });
        } else {
          result.push({ kind: "file", emoji: this.fileEmoji(f.name), name: f.name });
        }
      }
      return result;
    },
    readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
      });
    },

    // ------ 드래그 ------
    onDragEnter(e) { e.preventDefault(); this.dragCounter++; this.isDraggingFile = true; },
    onDragLeave(e) { e.preventDefault(); this.dragCounter--; if (this.dragCounter===0) this.isDraggingFile=false; },
    onDragOver(e) { e.preventDefault(); this.isDragOver = true; },
    onDrop(e) {
      e.preventDefault();
      this.dragCounter = 0;
      this.isDraggingFile = false;
      this.isDragOver = false;
      const dt = Array.from(e.dataTransfer.files || []);
      const evt = { target: { files: dt } };
      this.handleFileUpload(evt);
    },

    // ------ 공통 ------
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) {
          setTimeout(() => { container.scrollTop = container.scrollHeight; }, 40);
        }
      });
    },

    // ------ 전송 ------
    async sendMessage() {
      if (!this.canSend || this.isSending) return;
      this.isSending = true;

      // 기존 스트림 취소
      if (this.abortController) this.abortController.abort();
      this.abortController = new AbortController();

      // 세션
      if (!this.sessionId) this.sessionId = this.generateSessionId();

      const text = this.userInput.trim();
      const hasText = text.length > 0;
      const hasFiles = this.uploadedFiles.length > 0;

      // 사용자 버블(첨부+텍스트) 먼저 출력
      const attachmentsForBubble = await this.buildAttachmentPayloadForMessage();
      const userMsg = { role: "user", text: hasText ? text : (hasFiles ? "(첨부 전송)" : ""), attachments: attachmentsForBubble };
      this.messages.push(userMsg);

      // 입력 영역 초기화 & 스크롤
      this.userInput = "";
      this.$nextTick(() => {
        const el = this.$refs.chatInput;
        if (el) el.style.height = "auto";
      });

      // 전송 준비: FormData
      const fd = new FormData();
      fd.append("session_id", this.sessionId);
      fd.append("question", hasText ? text : "[FILE_UPLOAD_ONLY]");
      fd.append("category", "보험");
      this.uploadedFiles.forEach(f => fd.append("files", f));

      // 미리보기 ObjectURL 정리 + 첨부 리스트 초기화
      this.clearAllPreviews();

      // 봇 자리(스트리밍 업데이트)
      const botIndex = this.messages.length;
      this.messages.push({ role: "bot", text: "", loading: true });
      this.scrollToBottom();

      try {
        const res = await fetch(`${this.API_BASE}/chat/stream-file`, {
          method: "POST",
          body: fd,
          signal: this.abortController.signal
        });

        if (!res.ok || !res.body) throw new Error(`서버 오류: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;
        let botText = "";

        while (!done) {
          const { value, done: isDone } = await reader.read();
          done = isDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            botText += chunk;
            this.messages.splice(botIndex, 1, { role: "bot", text: botText, loading: false });
            this.scrollToBottom();
          }
        }
      } catch (err) {
        const aborted = err?.name === "AbortError";
        this.messages.splice(botIndex, 1, {
          role: "bot",
          text: aborted ? "⏹️ 이전 요청을 취소했습니다." : "❌ 서버와 연결할 수 없습니다.",
          loading: false
        });
      } finally {
        this.isSending = false;
      }
    }
  }
};
</script>

<style>
/* ✅ 전체 채팅 래퍼 */
.chat-wrapper {
  width: 100%;
  max-width: 600px;
  height: 100vh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 1px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

/* ✅ 상단 로고 헤더 */
.chat-header {
  position: fixed;
  top: 0;
  left: 0; right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 600px;
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
  background-color: #fff;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.chat-logo { height: 32px; width: auto; }

/* ✅ 메시지 영역 */
.chat-messages {
  flex: 1 1 auto;
  overflow-y: auto;
  background-color: #ffffff;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  margin-top: 56px;   /* 헤더 */
  margin-bottom: 180px; /* 입력창 + compose-preview 여유 */
  padding: 12px;
}

/* ✅ 채팅 말풍선 */
.chat-bubble {
  display: flex;
  margin-bottom: 12px;
  max-width: 85%;
}
.chat-bubble.user {
  justify-content: flex-end;
  align-self: flex-end;
  width: fit-content;
  max-width: 90%;
  margin-left: auto;
}
.chat-bubble.bot {
  justify-content: flex-start;
  align-self: flex-start;
}

/* ✅ 아바타 */
.avatar {
  width: 32px; height: 32px;
  font-size: 20px;
  margin-right: 8px;
  align-self: flex-start;
}
.chat-bubble.user .avatar { display: none; }

/* ✅ 말풍선 스타일 */
.bubble-content {
  padding: 10px 14px;
  border-radius: 12px;
  white-space: pre-wrap;
  line-height: 1.5;
  word-break: break-word;
  text-align: left;
  font-size: 15px;
}
.chat-bubble.user .bubble-content {
  background-color: #d1e9ff;
  color: #000;
  border-bottom-right-radius: 0;
}
.chat-bubble.bot .bubble-content {
  background-color: #eeeeee;
  color: #000;
  border-bottom-left-radius: 0;
}

/* ✅ 버블 내부 첨부 */
.bubble-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
.bubble-attachment {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 6px;
  background: #fff;
}
.bubble-attachment img {
  width: 64px; height: 64px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}
.file-emoji { font-size: 16px; }
.file-label {
  max-width: 150px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}


/* ✅ 플러스 버튼 스타일 */
.upload-button {
  width: 36px;
  height: 36px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  margin: 0;
  transition: background-color 0.2s ease;
}

.upload-button:hover {
  background-color: #f5f5f5;
}

/* ✨ 작성 중 첨부 미리보기 (입력창 위) */
.compose-preview-container {
  position: fixed;
  bottom: 100px; /* 입력창 위 */
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 600px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  box-sizing: border-box;
}
.compose-preview-item {
  position: relative;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 4px 8px;
  background-color: #f9f9f9;
  display: flex;
  align-items: center;
  gap: 6px;
}
.image-preview img {
  width: 48px; height: 48px; object-fit: cover; border-radius: 4px;
}
.file-icon { font-size: 14px; }
.file-name {
  max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.remove-file {
  background: none; border: none; color: red; font-size: 14px;
  position: absolute; top: 2px; right: 4px; cursor: pointer;
}

/* ✅ 입력창 컨테이너 */
.chat-input-container {
  position: fixed;
  bottom: 16px;
  left: 50%; transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 600px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 48px 8px 16px;
  display: flex; align-items: flex-end;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 1000;
  gap: 8px;
}
@supports (padding: max(0px)) {
  .chat-input-container {
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }
}
.chat-input-container.dragover {
  border: 2px dashed #3b82f6;
  background-color: #f0f8ff;
}

/* ✅ 텍스트에어리어 */
.chat-textarea {
  flex: 1; border: none; resize: none;
  font-size: 15px; padding: 8px 0;
  line-height: 1.5; background: transparent;
  min-height: 24px; max-height: 200px;
  overflow-y: auto; outline: none; font-family: inherit;
}

/* ✅ 전송 버튼 */
.send-button {
  position: absolute; right: 12px; bottom: 8px;
  width: 36px; height: 36px; border-radius: 50%;
  background-color: #3b82f6; border: none; display: flex;
  align-items: center; justify-content: center; cursor: pointer;
  transition: background-color 0.2s ease;
}
.send-button:hover { background-color: #2563eb; }
.send-button:disabled { opacity: .6; cursor: not-allowed; }

/* ✅ 타이핑 인디케이터 */
.typing-indicator { display: inline-flex; align-items: center; gap: 4px; height: 20px; }
.dot { width: 6px; height: 6px; background-color: #888; border-radius: 50%; animation: blink 1.4s infinite ease-in-out both; }
.dot:nth-child(2){ animation-delay:.2s } .dot:nth-child(3){ animation-delay:.4s }

/* ✅ 드래그 오버레이 */
.drag-overlay {
  position: fixed; inset: 0;
  background-color: rgba(240, 248, 255, 0.6);
  backdrop-filter: blur(2px);
  z-index: 3000; display: flex; align-items: center; justify-content: center;
  animation: pulse-bg 1.5s infinite ease-in-out;
  pointer-events: none;
}
.drag-overlay-content {
  font-size: 20px; font-weight: 600; padding: 24px 36px;
  border: 2px dashed #3b82f6; background-color: #ffffffcc;
  border-radius: 16px; color: #3b82f6; pointer-events: none;
  box-shadow: 0 6px 24px rgba(0,0,0,0.08);
}

/* ✅ 에러 토스트 */
.error-toast {
  position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
  background-color: #fee2e2; color: #b91c1c; padding: 10px 16px;
  border-radius: 8px; border: 1px solid #fca5a5;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 2000; font-size: 14px;
  animation: fadeInOut 4s ease-in-out;
}

/* 반응형 */
@media (max-width: 768px) {
  .chat-messages { margin-bottom: 120px; }
  html, body { touch-action: manipulation; }
}

/* 애니메이션 */
@keyframes blink { 0%,80%,100% {opacity:0;} 40% {opacity:1;} }
@keyframes pulse-bg {
  0% { background-color: rgba(240,248,255,0.5); backdrop-filter: blur(1px); }
  50% { background-color: rgba(240,248,255,0.75); backdrop-filter: blur(3px); }
  100% { background-color: rgba(240,248,255,0.5); backdrop-filter: blur(1px); }
}
@keyframes fadeInOut {
  0% { opacity:0; transform: translateX(-50%) translateY(-10px); }
  10%,90% { opacity:1; transform: translateX(-50%) translateY(0); }
  100% { opacity:0; transform: translateX(-50%) translateY(-10px); }
}
</style>
