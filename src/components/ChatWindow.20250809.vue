<template>
  <!-- ✅ 전체 드래그 오버레이 -->
  <div v-if="isDraggingFile" class="drag-overlay">
    <div class="drag-overlay-content">
      📎 무엇이든 추가하세요
    </div>
  </div>
  <div class="chat-wrapper">
    <div v-if="errorMessage" class="error-toast">
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
          <span v-if="msg.loading" class="typing-indicator">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </span>
          <span v-else v-html="formatMessage(msg.text)"></span>
        </div>
      </div>
    </div>
    <!-- ✅ 파일 미리보기 표시 -->
    <div v-if="uploadedFiles.length" class="file-preview-container">
    <div
      v-for="(file, index) in uploadedFiles"
      :key="index"
      class="file-preview-item"
    >
      <!-- ✅ 이미지 파일인 경우 썸네일 미리보기 -->
      <div v-if="file.type.startsWith('image/')" class="image-preview">
        <img :src="getPreviewURL(file)" />
      </div>
  
      <!-- ✅ 이미지 외 파일 (pdf, docx 등)은 파일명만 표시 -->
      <div v-else class="file-icon">
        <span v-if="file.name.endsWith('.pdf')">📕</span>
        <span v-else-if="file.name.endsWith('.docx')">📘</span>
        <span v-else-if="file.name.endsWith('.xlsx') || file.name.endsWith('.xls')">📗</span>
        <span v-else>📄</span>
        <span class="file-name">{{ file.name }}</span>
      </div>
  
      <!-- ✅ 삭제 버튼 -->
      <button class="remove-file" @click="removeFile(index)">✖</button>
    </div>
  </div>
    <!-- ✅ 기존 textarea 그대로 유지 -->
    <form class="chat-input-container">
      <button type="button" class="upload-button" @click="$refs.fileInput.click()">
        <!-- 플러스 아이콘 -->
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <input
        ref="fileInput"
        type="file"
        style="display: none"
        @change="handleFileUpload"
        multiple
        accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.xls,.xlsx"/>
      <textarea
        v-model="userInput"
        ref="chatInput"
        @input="autoResize"
        @keyup.enter="handleKeyup"
        placeholder="무엇이든 물어보세요..."
        class="chat-textarea"
        rows="1"
      ></textarea>
      <button type="button" class="send-button" @click="sendMessage">
        <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
          <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
        </svg>
      </button>
    </form>
  </div>
</template>



<script>
export default {
  data() {
    return {
      userInput: "",
      messages: [],
      sessionId: null,
      uploadedFiles: [],
      isDragOver: false, // ✅ 드래그 중 상태 표시용
      isDraggingFile: false, // ✅ 전체 drag 감지용
      dragCounter: 0,        // ✅ 중첩 drag 이벤트 보정용
      errorMessage: "",     // ✅ 에러 메시지 상태
      isSending: false // ✅ 중복 방지용
    };
  },
  mounted() {
    window.addEventListener("dragenter", this.onDragEnter);
    window.addEventListener("dragleave", this.onDragLeave);
    window.addEventListener("dragover", this.onDragOver);
    window.addEventListener("drop", this.onDrop);
  },
  beforeUnmount() {
    window.removeEventListener("dragenter", this.onDragEnter);
    window.removeEventListener("dragleave", this.onDragLeave);
    window.removeEventListener("dragover", this.onDragOver);
    window.removeEventListener("drop", this.onDrop);
  },
  methods: {
    generateSessionId() {
      return "sess-" + Math.random().toString(36).substr(2, 9);
    },
    showError(msg) {
      this.errorMessage = msg;
      setTimeout(() => {
        this.errorMessage = "";
      }, 4000); // 4초 후 자동 사라짐
    },
    handleKeyup(e) {
    
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
      // ✅ 모바일이면 줄바꿈만 허용 (sendMessage 실행 안 함)
      if (isMobile) return;

    
      if (!e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    },
    getPreviewURL(file) {
      try {
        return URL.createObjectURL(file);
      } catch (e) {
        return "";
      }
    },
    handleFileUpload(e) {
      const files = Array.from(e.target.files);
      const validExtensions = /\.(pdf|txt|docx|png|jpg|jpeg|xls|xlsx)$/i;
    
      const validFiles = files.filter(file => validExtensions.test(file.name));
      const invalidFiles = files.filter(file => !validExtensions.test(file.name));
    
      if (invalidFiles.length > 0) {
        this.showError("❌ 지원하지 않는 파일 형식입니다. (.pdf, .txt, .docx, .png, .jpg, .jpeg)");
      }
    
      const totalFiles = this.uploadedFiles.length + validFiles.length;
    
      if (totalFiles > 3) {
        this.showError("❌ 최대 3개 파일까지만 업로드할 수 있습니다.");
        return;
      }
    
      this.uploadedFiles.push(...validFiles);
      this.$nextTick(() => this.scrollToBottom());
    
      // 파일 input 초기화 (같은 파일 다시 선택 가능하게)
      e.target.value = "";
    },
    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
      },
      onDragEnter(e) {
      e.preventDefault();
      this.dragCounter++;
      this.isDraggingFile = true;
    },
    onDragLeave(e) {
      e.preventDefault();
      this.dragCounter--;
      if (this.dragCounter === 0) {
        this.isDraggingFile = false;
      }
    },
    onDragOver(e) {
      e.preventDefault();
    },
    onDrop(e) {
      e.preventDefault();
      this.dragCounter = 0;
      this.isDraggingFile = false;
    
      const files = Array.from(e.dataTransfer.files);
      const validExtensions = /\.(pdf|txt|docx|png|jpg|jpeg|xls|xlsx)$/i;
    
      const validFiles = files.filter(file => validExtensions.test(file.name));
      const invalidFiles = files.filter(file => !validExtensions.test(file.name));
    
      if (invalidFiles.length > 0) {
        this.showError("❌ 지원하지 않는 파일 형식입니다. (.pdf, .txt, .docx, .png, .jpg, .jpeg)");
      }
    
      const totalFiles = this.uploadedFiles.length + validFiles.length;
    
      if (totalFiles > 3) {
        this.showError("❌ 최대 3개 파일까지만 업로드할 수 있습니다.");
        return;
      }
    
      this.uploadedFiles.push(...validFiles);
      this.$nextTick(() => this.scrollToBottom());
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) {
          // 아주 약간의 delay를 줘서 확실히 DOM 갱신 이후 스크롤 수행
          setTimeout(() => {
            container.scrollTop = container.scrollHeight;
          }, 50);
        }
      });
    },
    handleResize() {
      // 키보드 닫힘 등으로 인해 UI 깨질 경우 자동 조정
      this.$nextTick(() => {
        const input = this.$refs.chatInput;
        if (input) {
          input.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    },
    autoResize() {
      const el = this.$refs.chatInput;
      if (el) {
        el.style.height = "auto"; // 초기화
        el.style.height = `${el.scrollHeight}px`; // 내용만큼 높이 증가
      }
    },
    formatMessage(text) {
      return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/(?:^|\n)- (.*?)(?=\n|$)/g, "<br>• $1")
        .replace(/\n/g, "<br>");
    },
    async sendMessage() {
      if (this.isSending) return; // ✅ 중복 요청 방지
      this.isSending = true;
      
      const userText = this.userInput.trim(); // ✅ 줄바꿈 제거
      const hasText = !!this.userInput.trim();
      const hasFiles = this.uploadedFiles.length > 0;
    
      // 아무것도 없으면 종료
      if (!hasText && !hasFiles) return;
    
      // 세션 ID 없으면 생성
      if (!this.sessionId) {
        this.sessionId = this.generateSessionId();
      }
    
      const userMessages = [];
    
      // ✅ 파일 업로드 알림 메시지 (사용자에게만 표시)
      if (hasFiles) {
        userMessages.push({
          role: "user",
          text: `📎 ${this.uploadedFiles.length}개 파일 업로드됨`
        });
      }
    
      // ✅ 텍스트 메시지
      if (hasText) {
        userMessages.push({
          role: "user",
          text: userText
        });
      }
    
      // ✅ 사용자 메시지 출력
      this.messages.push(...userMessages);
    
      // ✅ 입력창 초기화 및 스크롤
      this.userInput = "";
      this.$nextTick(() => this.scrollToBottom());
    
      // ✅ bot 응답 준비
      const botIndex = this.messages.length;
      this.messages.push({ role: "bot", text: "", loading: true });
      this.$nextTick(() => this.scrollToBottom());
    
      try {
        const API_BASE = "http://15.165.60.45:5000";
    
        const formData = new FormData();
        formData.append("session_id", this.sessionId);
        formData.append("question", hasText ? userText : "[FILE_UPLOAD_ONLY]");
        formData.append("category", "보험");
    
        this.uploadedFiles.forEach(file => {
          formData.append("files", file);
        });
    
        const res = await fetch(`${API_BASE}/chat/stream-file`, {
          method: "POST",
          body: formData
        });
    
        if (!res.ok || !res.body) {
          throw new Error(`서버 오류: ${res.status}`);
        }
    
        // ✅ 파일 초기화
        this.uploadedFiles = [];
        this.userInput = "";
        // ✅ 입력창 높이 초기화
        this.$nextTick(() => {
          const el = this.$refs.chatInput;
          if (el) el.style.height = "auto";
        });
    
        // ✅ 스트리밍 응답 처리
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
    
            this.messages.splice(botIndex, 1, {
              role: "bot",
              text: botText,
              loading: false
            });
    
            this.$nextTick(() => this.scrollToBottom());
          }
        }
      } catch (err) {
        // ✅ 에러 응답 출력
        this.messages.splice(botIndex, 1, {
          role: "bot",
          text: "❌ 서버와 연결할 수 없습니다.",
          loading: false
        });
        this.scrollToBottom();
      } finally {
        this.isSending = false; // ✅ 항상 리셋
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
  height: 100vh; /* ✅ 전체 화면 기준 높이 */
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
  left: 0;
  right: 0; /* ✅ 추가 */
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

.chat-logo {
  height: 32px;
  width: auto;
}

/* ✅ 메시지 영역 */
.chat-messages {
  flex: 1 1 auto;
  overflow-y: auto;
  background-color: #ffffff;
  -webkit-overflow-scrolling: touch;

  /* 헤더와 입력창 높이만큼 제외 */
  margin-top: 56px;  /* 헤더 높이 */
  margin-bottom: 140px;  /* 입력창 높이 */

  /* ✅ padding 조정 */
  padding: 12px 12px 0 12px; /* 하단 padding 제거 */
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
  max-width: 90%; /* 너무 길어지지 않도록 제한 */
  margin-left: auto;  /* 왼쪽 여백 자동 */
}
.chat-bubble.bot {
  justify-content: flex-start;
  align-self: flex-start;
}

/* ✅ 아바타 */
.avatar {
  width: 32px;
  height: 32px;
  font-size: 20px;
  margin-right: 8px;
  align-self: flex-start;
}

.chat-bubble.user .avatar {
  display: none;
}

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

/* ✅ 입력창 컨테이너 */
.chat-input-container {
  position: fixed; /* 하단 플로팅 고정 */
  bottom: 16px; /* 👉 하단과 간격 확보 */
  left: 50%; /* 👉 가운데 정렬 */
  transform: translateX(-50%); /* 👉 정확한 중앙 정렬 */
  width: calc(100% - 32px); /* 👉 좌우 여백 16px씩 확보 */
  max-width: 600px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px; /* 👉 약간의 곡선 처리로 떠 있는 느낌 강조 */
  padding: 8px 48px 8px 16px;
  display: flex;
  align-items: flex-end;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* 👉 플로팅 느낌 강조 */
  z-index: 1000;
  gap: 8px; /* ➕ 버튼과 입력창 사이 여백 */
  padding: 8px 48px 8px 16px;
}

/* ✅ 텍스트에어리어 */
.chat-textarea {
  flex: 1;
  border: none;
  resize: none;
  font-size: 15px;
  padding: 8px 0;
  line-height: 1.5;
  background: transparent;
  min-height: 24px;
  max-height: 200px;
  overflow-y: auto;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  padding-left: 0;
}

/* ✅ 전송 버튼 */
.send-button {
  position: absolute;
  right: 12px;
  bottom: 8px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #3b82f6;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.send-button:hover {
  background-color: #2563eb;
}

/* ✅ 타이핑 인디케이터 */
.typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
}

.dot {
  width: 6px;
  height: 6px;
  background-color: #888;
  border-radius: 50%;
  animation: blink 1.4s infinite ease-in-out both;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}
/* ✅ 플러스 버튼 감싸는 wrapper */
.upload-wrapper {
  display: flex;
  align-items: flex-end;
  margin-right: 8px;
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

.file-preview-container {
  position: fixed;
  bottom: 80px; /* 채팅 입력창 높이보다 위 */
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
  z-index: 1001; /* 입력창보다 위 */
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  box-sizing: border-box;
}

.file-preview-item {
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
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
}

.file-icon {
  font-size: 14px;
}

.file-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-file {
  background: none;
  border: none;
  color: red;
  font-size: 14px;
  position: absolute;
  top: 2px;
  right: 4px;
  cursor: pointer;
}

.chat-input-container.dragover {
  border: 2px dashed #3b82f6;
  background-color: #f0f8ff;
}

.drag-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(240, 248, 255, 0.6); /* 알파값으로 흐리게 */
  backdrop-filter: blur(2px); /* 약간 흐림 효과 */
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-bg 1.5s infinite ease-in-out;
  pointer-events: none; /* 마우스 이벤트 막기 */
}

.drag-overlay-content {
  font-size: 20px;
  font-weight: 600;
  padding: 24px 36px;
  border: 2px dashed #3b82f6;
  background-color: #ffffffcc;
  border-radius: 16px;
  color: #3b82f6;
  pointer-events: none;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}

.error-toast {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #fee2e2;
  color: #b91c1c;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #fca5a5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 2000;
  font-size: 14px;
  animation: fadeInOut 4s ease-in-out;
}

@media (max-width: 768px) {
  .chat-messages {
    margin-bottom: 80px; /* 모바일 입력창 높이에 맞게 */
  }
  .chat-input-container {
    position: fixed; /* 하단 플로팅 고정 */
    bottom: 16px; /* 👉 하단과 간격 확보 */
    left: 50%; /* 👉 가운데 정렬 */
    transform: translateX(-50%); /* 👉 정확한 중앙 정렬 */
    width: calc(100% - 32px); /* 👉 좌우 여백 16px씩 확보 */
    max-width: 600px;
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px; /* 👉 약간의 곡선 처리로 떠 있는 느낌 강조 */
    padding: 8px 48px 8px 16px;
    display: flex;
    align-items: flex-end;
    box-sizing: border-box;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* 👉 플로팅 느낌 강조 */
    z-index: 1000;
  }
  html, body {
    touch-action: manipulation; /* 터치 조작만 허용 (확대/스크롤 X) */
  }
  

}


@keyframes blink {
  0%, 80%, 100% {
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
}

@keyframes pulse-bg {
  0% {
    background-color: rgba(240, 248, 255, 0.5);
    backdrop-filter: blur(1px);
  }
  50% {
    background-color: rgba(240, 248, 255, 0.75);
    backdrop-filter: blur(3px);
  }
  100% {
    background-color: rgba(240, 248, 255, 0.5);
    backdrop-filter: blur(1px);
  }
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  10%, 90% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
}

</style>
