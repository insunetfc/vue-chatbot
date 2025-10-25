<template>
  <!-- ✅ 전체 드래그 오버레이 -->
  <div v-if="isDraggingFile" class="drag-overlay">
    <div class="drag-overlay-content">📎 무엇이든 추가하세요</div>
  </div>

  <div class="chat-wrapper">
    <div v-if="errorMessage" class="error-toast" role="alert" aria-live="polite">
      {{ errorMessage }}
    </div>

    <!-- ✅ 헤더: 로고 + (값만 보이는) 태그 + 설정 -->
    <div class="chat-header">
      <img src="/logo.png" alt="로고" class="chat-logo" />
    
      <!-- 오른쪽 영역을 밀어내는 스페이서 -->
      <div class="header-spacer"></div>
    
      <!-- 오른쪽 묶음: 태그 + 설정 아이콘 -->
      <!-- 헤더 내부 오른쪽 영역만 교체 -->
      <div class="header-right">
        <div class="header-tags">
          <span
            v-if="profile.division"
            class="tag tag-division clickable"
            title="구분"
            role="button" tabindex="0"
            @click="onDivisionTagClick"
            @keydown.enter.prevent="onDivisionTagClick"
            @keydown.space.prevent="onDivisionTagClick"
          >
            <i class="dot"></i>[{{ profile.division }}] {{ profile.job }}
          </span>
          <!--<span
            v-if="profile.job"
            class="tag tag-job clickable"
            title="직업"
            role="button" tabindex="0"
            @click="onJobTagClick"
            @keydown.enter.prevent="onJobTagClick"
            @keydown.space.prevent="onJobTagClick"
          >
            <i class="dot"></i>{{ profile.job }}
          </span>-->
        </div>
      
        <!-- ⚙ 대신 아바타 버튼 -->
        <button
          type="button"
          class="header-avatar-btn"
          @click="onSettingsClick"
          aria-label="프로필 설정 열기"
        >
          <template v-if="profile.avatar">
            <img :src="profile.avatar" alt="프로필 이미지" class="header-avatar-img" />
          </template>
          <template v-else>
            <span class="header-avatar-fallback">{{ initials }}</span>
          </template>
        </button>
      </div>

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
          <template v-if="msg.loading">
             <span v-if="msg.loadingText" class="loading-label">{{ msg.loadingText }}</span>
             <span class="typing-indicator">
               <span class="dot"></span><span class="dot"></span><span class="dot"></span>
             </span>
           </template>
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
    <!-- ✨ 추천 말풍선 (입력창 위 고정) -->
    <div
      v-if="showInitPrompts"
      class="suggested-prompts initial"
    >
      <button
        v-for="(p, i) in suggestedPromptsInitial"
        :key="'init-'+i"
        type="button"
        class="chip chip-2line"
        @click="applySuggestion(`${p.title} ${p.desc}`, { send: true })"
      >
        <div class="chip-title">{{ p.title }}</div>
        <div class="chip-desc">{{ p.desc }}</div>
      </button>
    </div>
    
    <!-- ✅ 답변 후 후속 제안(한 줄 칩) -->
    <div v-else-if="showFollowupPrompts" class="suggested-prompts">
      <button
        v-for="(p, i) in suggestedPrompts"
        :key="'sug-'+i"
        type="button"
        class="chip"
        @click="applySuggestion(p, { send: true })"
        title="탭: 바로 전송"
      >
        {{ p }}
      </button>
    </div>
    <!-- ⏳ 로딩 칩 -->
    <div v-else-if="showFollowupLoading" class="suggested-prompts">
      <div class="chip chip-loading" aria-live="polite" aria-busy="true">
        <span>후속 질문 생성 중</span>
        <span class="loading-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
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
        id="file-input"
        name="files[]"
        ref="fileInput"
        type="file"
        style="display:none"
        @change="handleFileUpload"
        multiple
        accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.xls,.xlsx"
      />

      <textarea
        id="chat-message"
        name="message"
        autocomplete="off"
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

  <!-- ✅ 설정 드로어: 오른쪽 → 왼쪽 슬라이드 (Vulk 톤) -->
  <transition name="aa-slide">
    <div v-if="showSettingsModal" class="aa-modal-backdrop" @click.self="closeSettings" role="presentation">
      <div
        class="aa-drawer"
        ref="drawer"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'drawerTitle'"
      >
        <!-- 헤더(그라디언트 앱바 + 히어로) -->
        <header class="drawer-header">
          <div class="drawer-appbar">
            <button type="button" class="icon-btn" aria-label="닫기" @click="closeSettings">←</button>
            <h2 id="drawerTitle" class="drawer-title">프로필 설정</h2>
            <span class="icon-btn-spacer" aria-hidden="true"></span>
          </div>
          <div class="drawer-hero">
            <button type="button" class="avatar-lg-btn" @click="triggerAvatarPick" aria-label="프로필 이미지 변경">
              <img v-if="profile.avatar" :src="profile.avatar" alt="프로필 이미지" class="avatar-lg-img" />
              <span v-else class="avatar-lg-fallback">{{ initials }}</span>
            </button>
            <p class="drawer-subtitle">고객 응대에 사용되는 기본 정보를 설정하세요.</p>
            <!-- 숨김 파일 입력 -->
            <input ref="avatarInput" type="file" accept="image/*" style="display:none" @change="onAvatarSelected" />
          </div>
        </header>

        <!-- 본문 -->
        <section class="drawer-body" :aria-labelledby="'sec-account'">
          <!-- 섹션: 계정 정보 -->
          <h3 id="sec-account" class="sec-title">계정 정보</h3>
          <div class="form-grid">
            <label class="field" for="profile-name">
              <span class="label">이름</span>
              <div class="input-wrap">
                <i class="fi">👤</i>
                <input
                  id="profile-name"
                  name="name"
                  autocomplete="name"
                  v-model.trim="profile.name"
                  type="text"
                  placeholder="홍길동"
                />
              </div>
              <small class="hint">명함/계약서 표기와 동일하게 입력</small>
            </label>

            <label class="field" for="profile-email">
              <span class="label">이메일</span>
              <div class="input-wrap">
                <i class="fi">✉</i>
                <input
                  id="profile-email"
                  name="email"
                  autocomplete="email"
                  v-model.trim="profile.email"
                  type="email"
                  placeholder="you@company.com"
                />
              </div>
              <small class="hint">알림 발송 및 로그인에 사용</small>
            </label>
          </div>

          <!-- 섹션: 연락처 -->
          <h3 class="sec-title" id="sec-contact">연락처</h3>
          <label class="field" for="profile-phone">
            <span class="label">전화번호</span>
            <div class="input-wrap">
              <i class="fi">📞</i>
              <input
                id="profile-phone"
                name="tel"
                autocomplete="tel"
                :value="profile.phone"
                @input="onPhoneInput"
                type="tel"
                inputmode="numeric"
                placeholder="010-0000-0000"
              />
            </div>
            <small class="hint">숫자만 입력해도 자동으로 하이픈 처리돼요</small>
          </label>

          <!-- 섹션: 업무 속성 -->
          <h3 class="sec-title" id="sec-role">업무 속성</h3>
          <div class="pill-group" role="radiogroup" aria-labelledby="sec-role">
            <div
              class="pill-group"
              ref="divisionField"
              role="radiogroup"
              aria-labelledby="sec-role"
            >
              <label
                v-for="opt in divisions"
                :key="opt"
                class="pill"
                :class="{ active: profile.division === opt }"
                :for="`division-${opt}`"
                :aria-checked="profile.division === opt"
                role="radio"
                tabindex="0"
                @keydown.enter.prevent="profile.division = opt"
                @keydown.space.prevent="profile.division = opt"
              >
                <input
                  class="vh"
                  :id="`division-${opt}`"
                  type="radio"
                  name="division"
                  :value="opt"
                  v-model="profile.division"
                />
                <span class="pill-text">{{ opt }}</span>
              </label>
            </div>
          </div>

          <label class="field" for="profile-job">
            <span class="label">직업</span>
            <div class="input-wrap">
              <i class="fi">💼</i>
              <input
                id="profile-job"
                ref="jobField"
                name="organization-title"
                autocomplete="organization-title"
                v-model.trim="profile.job"
                type="text"
                list="job-suggestions"
                placeholder="보험설계사"
              />
              <datalist id="job-suggestions">
                <option v-for="s in jobSuggestions" :key="s" :value="s" />
              </datalist>
            </div>
            <small class="hint">예: 보험설계사 / 손해사정사 / GA 설계사…</small>
          </label>
        </section>

        <!-- 하단 고정 액션 -->
        <footer class="drawer-footer">
          <button class="btn ghost" type="button" @click="closeSettings">취소</button>
          <button class="btn primary" type="button" @click="saveSettings">저장</button>
        </footer>

        <!-- 카테고리 미리보기 -->
        <p class="hint center pv-12">
          전송 시 <code>category</code>에<br />
          <strong>{{ previewCategoryString }}</strong> 로 포함됩니다.
        </p>
      </div>
    </div>
  </transition>
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
      previewURLs: [],
      isDragOver: false,
      isDraggingFile: false,
      dragCounter: 0,

      errorMessage: "",
      isSending: false,
      isComposing: false,
      abortController: null,

      // ✅ 프로필 상태(로컬 저장/로드)
      profile: {
        name: "",
        email: "",
        phone: "",
        division: "",
        job: "",
        avatar: ""          // ← 추가: dataURL 저장
      },
      divisions: ["영업", "지원", "교육", "정보"],
      jobSuggestions: ["보험설계사", "손해사정사", "GA 설계사", "언더라이터", "콜센터 상담사"],
      showSettingsModal: false,

      // 설정
      API_BASE: "http://15.165.60.45:5000",
      LIMIT_MAX_FILES: 3,
      LIMIT_PER_FILE: 10 * 1024 * 1024,
      LIMIT_TOTAL: 25 * 1024 * 1024,
      isAwaitingFollowups: false, // 추가질문 API 응답 대기 상태
      suggestedPrompts: [],            // 응답 후 한 줄 칩
      suggestedPromptsInitial: [ // 최초 2줄 칩(제목/설명)
        { title: "문서링크", desc: "고객·팀 공유" },
        { title: "SNS작성", desc: "업로드 글 생성" },
        { title: "성공측정", desc: "계약 성공률 확인" },
        { title: "문서분석", desc: "내용 요약·정리" },
        { title: "모바일쿠폰", desc: "고객 대상 선물 쿠폰 전송" }
      ]
    };
  },
  computed: {
    canSend() {
      return (this.userInput.trim().length > 0) || (this.uploadedFiles.length > 0);
    },
    previewCategoryString() {
      return this.buildCategoryMetaString();
    },
    // 이니셜 아바타 텍스트
    initials() {
      const n = (this.profile.name || "").trim();
      if (!n) return "U";
      // 공백 기준 앞 글자 2개 조합
      const parts = n.split(/\s+/).filter(Boolean);
      const first = parts[0]?.[0] || "";
      const second = parts[1]?.[0] || "";
      return (first + second).slice(0, 2).toUpperCase();
    },
    hasFiles() {
      return this.uploadedFiles.length > 0;
    },
    showInitPrompts() {
      return !this.hasFiles
      && !this.isAwaitingFollowups
      && this.messages.length === 0
      && this.suggestedPromptsInitial.length > 0;
    },
    showFollowupPrompts() {
      return !this.hasFiles
      && !this.isAwaitingFollowups
      && this.messages.length > 0
      && this.suggestedPrompts.length > 0;
    },
    showFollowupLoading() {
      return !this.hasFiles && this.isAwaitingFollowups;
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

    this._leaveWindow = (e) => {
      if (e.clientX <= 0 || e.clientY <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        this.dragCounter = 0;
        this.isDraggingFile = false;
      }
    };
    const cm = this.$refs.messagesContainer;
    if (cm) {
      cm.addEventListener('touchmove', (e) => {
        e.stopPropagation();
        // 필요하면 다음 줄도 활성화 (페이지 전체 끌리는 현상 강제 차단)
        // e.preventDefault();
      }, { passive: false });
    }
    window.addEventListener("mouseout", this._leaveWindow);

    // ✅ 프로필 로드
    this.loadSettings();
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

    this.clearAllPreviews();
    // 키 핸들러 제거
    document.removeEventListener("keydown", this._escHandler);
  },
  methods: {
    // ------ 공통 ------
    generateSessionId() {
      return "sess-" + Math.random().toString(36).slice(2, 11);
    },
    showError(msg) {
      this.errorMessage = msg;
      setTimeout(() => (this.errorMessage = ""), 4000);
    },
    _applyFollowups(arr) {
      let out = Array.isArray(arr) ? arr : [];
      out = out
        .filter(v => typeof v === "string")
        .map(v => v.trim())
        .filter(Boolean);
    
      // 중복 제거
      out = [...new Set(out)];
    
      if (out.length >= 3 && out.length <= 6) {
        this.suggestedPrompts = out;
      } else {
        throw new Error("3~6개 JSON 배열 아님");
      }
    },
    safeFormat(text) {
      const esc = (s) =>
        (s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      const withBold = esc(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      const withBullets = withBold.replace(/(?:^|\n)- (.*?)(?=\n|$)/g, "<br>• $1");
      const withBreaks = withBullets.replace(/\n/g, "<br>");
      return DOMPurify.sanitize(withBreaks, {
        ALLOWED_TAGS: ["br","strong","b"],
        ALLOWED_ATTR: []
      });
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) {
          setTimeout(() => { container.scrollTop = container.scrollHeight; }, 40);
        }
      });
    },
    autoResize(e) {
      const el = e?.target || this.$refs.chatInput;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    },

    // ------ 키 입력 ------
    onCompositionStart() { this.isComposing = true; },
    onCompositionEnd() { this.isComposing = false; },
    onKeydown(e) {
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) return;
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
        if (seen.has(key)) continue;

        added.push(f);
        totalAddSize += f.size;
      }

      for (const f of added) {
        this.uploadedFiles.push(f);
        if (f.type.startsWith("image/")) {
          const url = URL.createObjectURL(f);
          this.previewURLs.push(url);
        } else {
          this.previewURLs.push("");
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
      this.$nextTick(this.scrollToBottom);
    },
    clearAllPreviews() {
      this.previewURLs.forEach(u => u && URL.revokeObjectURL(u));
      this.previewURLs = [];
      this.uploadedFiles = [];
      this.$nextTick(this.scrollToBottom);
    },

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
        fr.onerror = (err) => {
          console.warn("FileReader error:", err);
          reject(err);
        };
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

    // ------ 설정 드로어 ------
    onSettingsClick() {
      this.openSettings();
    },
    // ✅ 태그 클릭 시 타깃 전달
    onDivisionTagClick() {
      this.openSettings('division');
    },
    //onJobTagClick() {
    //  this.openSettings('job');
    //},
    // ✅ target: 'division' | 'job' | undefined
    openSettings(target) {
      this.showSettingsModal = true;
      document.body.classList.add('lock-scroll'); // ✅ 스크롤 잠금
      document.body.style.overflow = 'hidden';
      // ESC 닫기 핸들러
      this._escHandler = (e) => { if (e.key === 'Escape') this.closeSettings(); };
      document.addEventListener("keydown", this._escHandler);
  
      // 드로어 DOM 렌더 → 트랜지션 끝난 뒤 스크롤
      this.$nextTick(() => {
        const doScroll = () => this.scrollToDrawerTarget(target);
        // 전환 시간(.3s) + 약간의 여유
        setTimeout(doScroll, 320);
      });
    },
  
    closeSettings() {
      this.showSettingsModal = false;
      document.body.style.overflow = '';
      document.body.classList.remove('lock-scroll'); // ✅ 스크롤 해제
      document.removeEventListener("keydown", this._escHandler);
    },
  
    // ✅ 스크롤 & 포커스
    scrollToDrawerTarget(target) {
      const drawer = this.$refs.drawer;
      if (!drawer || !target) return;
  
      // 타깃 엘리먼트 선택
      const el =
        target === 'division'
          ? this.$refs.divisionField
          : target === 'job'
          ? this.$refs.jobField
          : null;
  
      if (!el) return;
  
      // 스크롤 이동
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (_) {
        // 일부 브라우저 폴백
        const top = el.getBoundingClientRect().top + drawer.scrollTop - drawer.clientHeight / 2;
        drawer.scrollTo({ top, behavior: 'smooth' });
      }
  
      // 포커스
      this.$nextTick(() => {
        if (target === 'job') {
          // 입력창 포커스
          el.focus?.();
        } else if (target === 'division') {
          // 선택된 라디오 또는 첫 라디오에 포커스
          const radio =
            el.querySelector('input[type=radio]:checked') ||
            el.querySelector('input[type=radio]');
          radio?.focus?.();
        }
      });
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
            avatar: p.avatar || ""   // ← 추가
          };
        } else {
          this.profile.division = "영업";
          this.profile.job = "보험설계사";
        }
      } catch (err) {
        console.warn("Failed to load profile from localStorage:", err);
        this.profile = { name:"", email:"", phone:"", division:"영업", job:"보험설계사", avatar:"" };
      }
    },
    saveSettings() {
      this.saveSettingsToStorage();
      this.closeSettings();
      //this.showError("✅ 프로필이 저장되었습니다.");
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
      // 간단히 base64로 저장 (원한다면 리사이즈/압축 로직 추가 가능)
      const reader = new FileReader();
      reader.onload = () => {
        this.profile.avatar = reader.result;
        this.saveSettingsToStorage();  // 즉시 저장
      };
      reader.onerror = (err) => console.warn("avatar read error:", err);
      reader.readAsDataURL(file);
    },

    // ✅ 전화번호 하이픈 포맷터
    formatPhone(v) {
      const d = (v || "").replace(/\D/g, "").slice(0, 11);
      if (d.startsWith("02")) {
        if (d.length <= 2) return d;
        if (d.length <= 5) return `${d.slice(0,2)}-${d.slice(2)}`;
        return `${d.slice(0,2)}-${d.slice(2, d.length-4)}-${d.slice(-4)}`;
      } else {
        if (d.length <= 3) return d;
        if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`;
        return `${d.slice(0,3)}-${d.slice(3, d.length-4)}-${d.slice(-4)}`;
      }
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
    
    applySuggestion(text, {send=false} = {}) {
      this.userInput = text;
      this.$nextTick(() => {
        this.autoResize(); // 입력칸 높이 맞춤
        if (send) this.sendMessage();
        else this.$refs.chatInput?.focus();
      });
    },
  
    // 응답 후 후속 추천 생성(간단 규칙 + 서버 신호 파싱)
    async updateFollowupSuggestions({ lastUser, botText }) {
      try {
        const fd = new FormData();
        fd.append("session_id", this.sessionId || this.generateSessionId());
        fd.append(
          "question",
          [
            "최근 대화 맥락을 바탕으로 고객이 바로 이어서 할 가능성이 큰 실무적 후속 질문 3~6개 생성.",
            '출력은 JSON 배열만. 예) ["질문1","질문2",...]',
            "코드블록(```), 마크다운, 주석, 설명문, 접두어 금지."
          ].join(" ")
        );
    
        const categoryMeta = this.buildCategoryMetaString();
        const parts = categoryMeta.split("-");
        const jobValue = parts.slice(1).join("-");
        fd.append("category", "추가질문");
        fd.append("job", jobValue);
    
        const res = await fetch(`${this.API_BASE}/chat/suggestions`, {
          method: "POST",
          body: fd
        });
        if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
    
        // --- JSON 배열 바로 받기 ---
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
          "다른 옵션이나 대안이 있다면 알려주세요"
        ];
        this.isAwaitingFollowups = false;
      }
    },
    
    // ✅ category 문자열 생성기 (전화는 숫자만)
    buildCategoryMetaString() {
      const phoneDigits = (this.profile.phone || "").replace(/\D+/g, "");
      const parts = [
        (this.profile.division || "").trim(),
        (this.profile.job || "").trim(),
        `이름:${(this.profile.name || "").trim()}`,
        `이메일:${(this.profile.email || "").trim()}`,
        `전화:${phoneDigits}`
      ].filter(Boolean);
      return parts.join("-");
    },

    // ------ 전송 ------
    async sendMessage() {
      if (!this.canSend || this.isSending) return;
      this.isSending = true;
      
      this.isAwaitingFollowups = true;

      if (this.abortController) this.abortController.abort();
      this.abortController = new AbortController();

      if (!this.sessionId) this.sessionId = this.generateSessionId();

      const text = this.userInput.trim();
      const hasText = text.length > 0;
      const hasFiles = this.uploadedFiles.length > 0;
      const hasPDF = this.uploadedFiles.some(f => /\.pdf$/i.test(f.name));

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

      const categoryMeta = this.buildCategoryMetaString(); // 예: "영업-보험설계사-이름:홍길동-이메일:..."
      const parts = categoryMeta.split("-");
      
      // 맨 앞 값 = category
      const categoryValue = parts[0] || "";
      
      // 나머지 값 = job 필드에 붙여서 전달
      const jobValue = parts.slice(1).join("-");
      
      fd.append("category", categoryValue);
      fd.append("job", jobValue);

      // 파일 첨부
      this.uploadedFiles.forEach(f => fd.append("files", f));

      // 미리보기 정리
      this.clearAllPreviews();
      
      const startTime = Date.now(); // ⏳ 시작 시각 기록
      
      // 봇 자리(스트리밍 업데이트)
      const botIndex = this.messages.length;
      //this.messages.push({ role: "bot", text: "", loading: true });
      this.messages.push({
              role: "bot",
              text: "",
              loading: true,
              // PDF가 있으면 안내 문구 표시
              loadingText: hasPDF ? "📄 PDF를 텍스트로 변환 중" : ""
            });
      this.scrollToBottom();
      
       // ⏳ 초 카운트 업데이트 타이머
      const timer = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        const msg = this.messages[botIndex];
        if (msg && msg.loading) {
          msg.loadingText =
            (hasPDF ? "📄 PDF를 텍스트로 변환 중" : "응답 생성 중") +
            ` ${seconds}s ` + // 초 표시
            " " + "●●●"; // dot 3개
          this.$forceUpdate(); // Vue 강제 렌더링
        } else {
          clearInterval(timer); // 로딩이 끝나면 타이머 정지
        }
      }, 1000);

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
        this.isAwaitingFollowups = false;
      } finally {
        clearInterval(timer); // 안전하게 타이머 정지
        this.isSending = false;
        const lastBot = this.messages[this.messages.length - 1]?.text || "";
        this.updateFollowupSuggestions({ lastUser: hasText ? text : "", botText: lastBot });
      }
    }
  }
};
</script>

<style>
/* ===== Design Tokens (Vulk 톤) ===== */
:root{
  --aa-bg: #ffffff;
  --aa-text: #111827;
  --aa-muted: #6B7280;
  --aa-border: #E5E7EB;
  --aa-primary: #6366F1; /* indigo-500 */
  --aa-primary-2: #7C3AED; /* violet-600 */
  --aa-success: #10B981;
  --aa-error: #DC2626;
  --aa-radius: 12px;
  --aa-pill-radius: 999px;
  --aa-shadow: 0 10px 30px rgba(0,0,0,.12);
  --siri-blue-1:#60A5FA; /* blue-400 */
  --siri-blue-2:#3B82F6; /* blue-500 */
  --siri-blue-3:#2563EB; /* blue-600 */
  /* Base UI Primary (참고) */
  --ui-primary: #3B82F6;

  /* 팔레트 ① */
  --tag-div-start:#6366F1; --tag-div-end:#8B5CF6; /* 구분 */
  --tag-job-start:#06B6D4; --tag-job-end:#10B981; /* 직업 */

  /* 공통 */
  --tag-text-on: #FFFFFF;
  --tag-border-div: rgba(99,102,241,.28);
  --tag-border-job: rgba(16,185,129,.28);
  --tag-gloss: .20; /* 0.18~0.28 사이 조절 */
}

/* ✅ 전체 채팅 래퍼 */
.chat-wrapper {
  width: 100%;
  max-width: 600px;
  height: 100vh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background-color: var(--aa-bg);
  border: 1px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

/* ✅ 상단 로고 헤더 */
.chat-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 600px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--aa-border);
  background-color: var(--aa-bg);
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  box-sizing: border-box;
  overflow: hidden;  /* ← 우측 튀어나옴 방지 */
}
.chat-logo { height: 32px; width: auto; }
.header-tags { display: flex; align-items: center; gap: 6px; margin-left: 8px; flex: 1; position: relative;}
.tag { font-size: 12px; padding: 4px 8px; background: #eef2ff; color: #3730A3; border-radius: var(--aa-pill-radius); }
.settings-btn { background: transparent; border: none; font-size: 18px; cursor: pointer; }

/* ✅ 메시지 영역 */
.chat-messages {
  position: relative;
  flex: 1 1 auto;
  overflow-y: auto;
  background-color: var(--aa-bg);
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  margin-top: 56px;   /* 헤더 */
  margin-bottom: 180px; /* 입력창 + compose-preview 여유 */
  padding: 12px;
}

/* ✅ 채팅 말풍선 */
.chat-bubble { display: flex; margin-bottom: 12px; max-width: 85%; }
.chat-bubble.user { justify-content: flex-end; align-self: flex-end; width: fit-content; max-width: 90%; margin-left: auto; }
.chat-bubble.bot { justify-content: flex-start; align-self: flex-start;  }

/* ✅ 아바타 */
.avatar { width: 32px; height: 32px; font-size: 20px; margin-right: 8px; align-self: flex-start; }
.chat-bubble.user .avatar { display: none; }

/* ✅ 말풍선 스타일 */
.bubble-content {
  padding: 10px 14px; border-radius: 12px; white-space: pre-wrap;
  line-height: 1.5; word-break: break-word; text-align: left; font-size: 15px;
}
.chat-bubble.user .bubble-content { background-color: #d1e9ff; color: #000; border-bottom-right-radius: 0; }
.chat-bubble.bot .bubble-content { background-color: #eeeeee; color: #000; border-bottom-left-radius: 0; }

/* ✅ 버블 내부 첨부 */
.bubble-attachments { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.bubble-attachment {
  display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--aa-border);
  border-radius: 8px; padding: 6px; background: #fff;
}
.bubble-attachment img { width: 64px; height: 64px; object-fit: cover; border-radius: 6px; display: block; }
.file-emoji { font-size: 16px; }
.file-label { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ✅ 플러스 버튼 스타일 */
.upload-button {
  width: 36px; height: 36px; background-color: #fff; border: 1px solid #ccc;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0; margin: 0; transition: background-color 0.2s ease;
}
.upload-button:hover { background-color: #f5f5f5; }

/* ✨ 작성 중 첨부 미리보기 (입력창 위) */
.compose-preview-container {
  position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
  width: calc(100% - 32px); max-width: 600px; background: #fff;
  border: 1px solid var(--aa-border); border-radius: 10px; padding: 8px;
  display: flex; flex-wrap: wrap; gap: 8px; z-index: 1001;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08); box-sizing: border-box;
}
.compose-preview-item {
  position: relative; border: 1px solid #ccc; border-radius: 8px; padding: 4px 8px;
  background-color: #f9f9f9; display: flex; align-items: center; gap: 6px;
}
.image-preview img { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; }
.file-icon { font-size: 14px; }
.file-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.remove-file {
  background: none; border: none; color: red; font-size: 14px;
  position: absolute; top: 2px; right: 4px; cursor: pointer;
}

/* ✅ 입력창 컨테이너 */
.chat-input-container{
  position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
  width: calc(100% - 32px); max-width: 600px;
  z-index: 1000; gap: 8px; display: flex; align-items: flex-end;
  padding: 8px 48px 8px 16px; box-sizing: border-box;

  background: transparent;  /* 글로우/내부는 pseudo로 */
  border: none;
  border-radius: 12px;
  box-shadow: none;
}
@supports (padding: max(0px)){
  .chat-input-container{ padding-bottom: max(8px, env(safe-area-inset-bottom)); }
}


/* 바깥 연한 블루 글로우 */
.chat-input-container::before{
  content:"";
  position:absolute; inset:-6px;
  border-radius: inherit;
  background: linear-gradient(135deg, var(--siri-blue-1), var(--siri-blue-2), var(--siri-blue-3));
  filter: blur(14px);
  opacity:.35;                 /* ← 연하게 */
  z-index:-2;
  transition: filter .25s ease, opacity .25s ease;
}

/* 내부는 완전 흰색 캡슐 */
.chat-input-container::after{
  content:"";
  position:absolute; inset:0;
  border-radius: inherit;
  background:#ffffff;          /* ← 흰색 */
  border: 1px solid rgba(59,130,246,.15);  /* 아주 연한 블루 테두리 */
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.9),
    0 6px 16px rgba(0,0,0,.06),
    0 8px 24px rgba(59,130,246,.08);
  backdrop-filter: saturate(130%) blur(4px);
  -webkit-backdrop-filter: saturate(130%) blur(4px);
  z-index:-1;
}

/* 포커스 시 살짝만 강조 */
.chat-input-container:focus-within::before{ opacity:.55; filter: blur(16px); }
.chat-input-container:focus-within::after{
  border-color: rgba(59,130,246,.22);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.95),
    0 8px 22px rgba(0,0,0,.08),
    0 0 0 2px rgba(59,130,246,.10);
}

/* 드래그 오버도 연한 톤 유지 */
.chat-input-container.dragover{ background: transparent; border:none; }
.chat-input-container.dragover::before{ opacity:.6; filter: blur(18px); }

/* 입력창은 투명 → 내부 흰색이 보임 */
.chat-textarea{
  flex:1; border:none; background:transparent; outline:none;
  font-size:15px; padding:8px 0; line-height:1.5; min-height:24px; max-height:200px;
  color:#0f172a;resize: none !important;
  -webkit-appearance: none;
  appearance: none;
}

/* WebKit(Chrome/Edge/Safari)에서 모서리 리사이저 숨김 */
.chat-textarea::-webkit-resizer {
  display: none;
}
.chat-textarea::placeholder{ color:#94a3b8; opacity:.95; }

/*
.chat-input-container.dragover { border: 2px dashed #3b82f6; background-color: #f0f8ff; }

 ✅ 텍스트에어리어 
.chat-textarea {
  flex: 1; border: none; resize: none; font-size: 15px; padding: 8px 0;
  line-height: 1.5; background: transparent; min-height: 24px; max-height: 200px;
  overflow-y: auto; outline: none; font-family: inherit;
}*/

/* ✅ 전송 버튼 */
.send-button {
  position: absolute; right: 12px; bottom: 8px; width: 36px; height: 36px; border-radius: 50%;
  background-color: #3b82f6; border: none; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background-color 0.2s ease;
  box-shadow: 0 6px 16px rgba(59,130,246,.20);
}
.send-button:hover { background-color: #2563eb; }
.send-button:disabled { opacity: .6; cursor: not-allowed; }

/* ✅ 타이핑 인디케이터 */
.typing-indicator { display: inline-flex; align-items: center; gap: 4px; height: 20px; }
.dot { width: 6px; height: 6px; background-color: #888; border-radius: 50%; animation: blink 1.4s infinite ease-in-out both; }
.dot:nth-child(2){ animation-delay:.2s } .dot:nth-child(3){ animation-delay:.4s }

/* ✅ 드래그 오버레이 */
.drag-overlay {
  position: fixed; inset: 0; background-color: rgba(240, 248, 255, 0.6);
  backdrop-filter: blur(2px); z-index: 3000; display: flex; align-items: center; justify-content: center;
  animation: pulse-bg 1.5s infinite ease-in-out; pointer-events: none;
}
.drag-overlay-content {
  font-size: 20px; font-weight: 600; padding: 24px 36px; border: 2px dashed #3b82f6;
  background-color: #ffffffcc; border-radius: 16px; color: #3b82f6; pointer-events: none;
  box-shadow: 0 6px 24px rgba(0,0,0,0.08);
}

/* ✅ 에러 토스트 */
.error-toast {
  position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
  background-color: #fee2e2; color: #b91c1c; padding: 10px 16px; border-radius: 8px;
  border: 1px solid #fca5a5; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 2000; font-size: 14px;
  animation: fadeInOut 4s ease-in-out;
}

/* ===== 드로어 & 전환 ===== */

/* 백드롭: 우측 정렬 */
.aa-modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  background: rgba(0,0,0,.35);
  z-index: 3001;
}

/* 오른쪽 슬라이드 인 패널 */
.aa-drawer {
  width: min(520px, 92vw);
  height: 100vh;
  background: var(--aa-bg);
  box-shadow: -10px 0 30px rgba(0,0,0,.15);
  border-top-left-radius: var(--aa-radius);
  border-bottom-left-radius: var(--aa-radius);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 그라디언트 헤더 */
.drawer-header {
  background: linear-gradient(135deg, var(--aa-primary) 0%, var(--aa-primary-2) 100%);
  color: #fff;
  padding-bottom: 12px;
}
.drawer-appbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 12px 4px 12px;
}
.drawer-title { font-size: 18px; font-weight: 700; letter-spacing: .2px; }
.icon-btn, .icon-btn-spacer {
  width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.3);
  color: #fff; border-radius: 10px; cursor: pointer;
}
.icon-btn:hover { background: rgba(255,255,255,.22); }
.icon-btn-spacer { visibility: hidden; }

.drawer-hero {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 10px 12px 12px 12px;
}
.avatar-lg {
  width: 56px; height: 56px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.2);
  border: 1px solid rgba(255,255,255,.35);
  font-weight: 800; letter-spacing: .5px;
}
.drawer-subtitle { opacity: .95; margin-top: 8px; font-size: 13px; }

/* 본문 */
.drawer-body {
  padding: 16px 16px 96px 16px; /* 하단 CTA 여유 */
  color: var(--aa-text);
}
.sec-title {
  font-size: 14px; font-weight: 700; color: var(--aa-text);
  margin: 16px 0 8px 0;
}
.form-grid {
  display: grid; grid-template-columns: 1fr; gap: 12px;
}

/* 입력 필드 */
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 13px; color: var(--aa-text); font-weight: 600; }
.hint { font-size: 12px; color: var(--aa-muted); }
.hint.center { text-align: center; }
.pv-12 { padding: 12px 0; }

.input-wrap {
  display: flex; align-items: center; gap: 8px;
  background: #fff;
  border: 1px solid var(--aa-border);
  border-radius: var(--aa-radius);
  padding: 10px 12px;
  box-shadow: 0 0 0 0 rgba(99,102,241,0);
  transition: box-shadow .12s ease, border-color .12s ease, background .12s ease;
}
.input-wrap:focus-within {
  border-color: var(--aa-primary);
  box-shadow: 0 0 0 3px rgba(99,102,241,.18);
}
.input-wrap input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 15px; color: var(--aa-text);
}
.fi { font-style: normal; opacity: .8; }

/* Pill 라디오 */
.pill-group {
  display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 8px 2px;
  -webkit-overflow-scrolling: touch; scrollbar-width: thin;
}
.pill {
  display: inline-flex; align-items: center; padding: 8px 14px;
  background: #F3F4F6; border: 1px solid #E5E7EB; color: #374151;
  border-radius: var(--aa-pill-radius); cursor: pointer; user-select: none;
  transition: background .16s ease, color .16s ease, border-color .16s ease, transform .12s ease;
}
.pill:hover { transform: translateY(-1px); }
.pill.active {
  background: rgba(99,102,241,.12);
  border-color: var(--aa-primary);
  color: #1f2a73;
}
.pill-text { font-size: 14px; font-weight: 600; }
.vh { position: absolute !important; clip: rect(1px,1px,1px,1px); width:1px; height:1px; overflow:hidden; }

/* 하단 고정 CTA */
.drawer-footer {
  position: sticky; bottom: 0; left: 0; right: 0;
  display: flex; gap: 10px; justify-content: space-between;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom)) 16px;
  background:
    linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,.92) 40%, rgba(255,255,255,0));
  border-top: 1px solid var(--aa-border);
  backdrop-filter: saturate(120%) blur(6px);
}
.btn {
  min-height: 44px; padding: 0 16px; border-radius: var(--aa-radius);
  border: 1px solid var(--aa-border); background: #fff; color: var(--aa-text);
  font-weight: 700; cursor: pointer;
}
.btn.primary {
  background: linear-gradient(135deg, var(--aa-primary) 0%, var(--aa-primary-2) 100%);
  color: #fff; border: none; box-shadow: var(--aa-shadow);
}
.btn.ghost { background: #fff; }

/* 오른쪽 여백 채우는 스페이서 */
.header-spacer { flex: 1; }

.header-right {
  display: flex;
  gap: 8px;
  align-self: stretch;
  align-items: flex-end;
  /* 폭 계산을 위해 축소 허용 */
  min-width: 0;      /* ← 중요 */
}

/* 태그를 '시각적으로' 더 아래로 살짝 내림 */
:root { --tag-bottom-nudge: 6px; } /* 필요시 4~10px 사이로 조절 */
.header-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 0;              /* ← 기존 -3px 제거 */
  transform: translateY(var(--tag-bottom-nudge));
}
.settings-btn { align-self: center; }


/* === Tag Base === */
/* 헤더 하단 정렬(유지) */
.header-right { display:flex; gap:8px; align-self:stretch; align-items:flex-end; }
.header-tags  { display:flex; gap:6px; margin-bottom:2px; }
.settings-btn { align-self:center; }

/* === Tag Base === */
.tag{
  position:relative;
  display:inline-flex; align-items:center; gap:6px;
  font-size:12px; font-weight:700; line-height:1;
  padding:6px 10px; border-radius:999px; color:#fff;
  border:1px solid transparent; box-shadow:0 6px 16px rgba(0,0,0,.10);
  backdrop-filter:saturate(140%) blur(4px);
  transition:transform .15s ease, box-shadow .15s ease;
}
.tag::before{ content:none; }           /* ← 샾 제거 */
.tag:hover{ transform:translateY(-1px); box-shadow:0 8px 20px rgba(0,0,0,.14); }
.tag > .dot{ width:6px; height:6px; border-radius:50%; display:inline-block; opacity:.95; }
.clickable{ cursor:pointer; }

.loading-label{
  font-size: 13px;
  margin-right: 6px;
  color: #374151; /* 회색계 톤 */
  vertical-align: middle;
}

/* 구분/직업 그라데이션 (유지) */
.tag-division{ background:linear-gradient(135deg,var(--tag-div-start),var(--tag-div-end));
               border-color: rgba(99,102,241,var(--tag-border-alpha)); }
.tag-division > .dot{ background:#ECFDF5; }
.tag-job{ background:linear-gradient(135deg,var(--tag-job-start),var(--tag-job-end));
          border-color: rgba(16,185,129,var(--tag-border-alpha)); }
.tag::after{ background:linear-gradient(to bottom, rgba(255,255,255,var(--tag-gloss)), rgba(255,255,255,0)); }
.tag-job > .dot{ background:#ECFDF5; }

/* === 헤더 아바타 버튼 === */
.header-avatar-btn{
  -webkit-appearance: none;
  appearance: none;
  padding: 0;
  line-height: 0;

  /* 보이는 링은 border 대신 바깥 그림자로 */
  border: none; /* ← 이게 표시 영역을 줄였습니다 */
  box-shadow:
    0 0 0 1px rgba(0,0,0,.08),   /* 얇은 외곽선 */
    0 4px 12px rgba(0,0,0,.08);  /* 살짝 그림자 */

  width: 32px; height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: inline-block;        /* flex 불필요 */
  background: #fff;
}
.header-avatar-img{
  width: 100%;
  height: 100%;
  display: block;               /* inline 여백 제거 */
  object-fit: cover;            /* 꽉 채우되 왜곡 없음 */
  object-position: center;      /* 중심 정렬 */
  border-radius: 0;             /* 부모가 마스킹하므로 불필요 */
}
.header-avatar-fallback{
  font-size:12px; font-weight:800; color:#334155;
}

/* === 드로어 아바타(업로드 가능) === */
.avatar-lg-btn{
  width:56px; height:56px; border-radius:50%;
  display:inline-flex; align-items:center; justify-content:center;
  background: rgba(255,255,255,.2);
  border:1px solid rgba(255,255,255,.35);
  box-shadow:0 8px 24px rgba(0,0,0,.10);
  overflow:hidden; cursor:pointer;
}
.avatar-lg-img{ width:100%; height:100%; object-fit:cover; display:block; }
.avatar-lg-fallback{ font-weight:800; letter-spacing:.5px; color:#fff; }

/* 접근성 대비 보정(다크) */
@media (prefers-color-scheme: dark){
  .tag{ box-shadow:0 6px 16px rgba(0,0,0,.28); }
}


code { background: #F3F4F6; padding: 0 4px; border-radius: 6px; }

/* ===== 전환 ===== */
.aa-slide-enter-active,
.aa-slide-leave-active { transition: opacity .2s ease; }
.aa-slide-enter-from,
.aa-slide-leave-to { opacity: 0; }
.aa-slide-enter-to,
.aa-slide-leave-from { opacity: 1; }

/* 드로어 슬라이드 이동 */
.aa-slide-enter-from .aa-drawer,
.aa-slide-leave-to .aa-drawer { transform: translateX(100%); }
.aa-drawer { transform: translateX(0); transition: transform .3s ease; }

html, body {
  height: 100%;
  overflow: hidden;          /* ← 화면 전체 스크롤 금지 */
  overscroll-behavior-y: none; /* iOS 고무줄 완화 */
}

.compose-preview-container {
  z-index: 1003; /* 기존 */
}

/* ✅ 후속 제안 질문 말풍선 앞으로 오게 */
.suggested-prompts {
  z-index: 1002; /* 파일 미리보기보다 높게 */
}

/* ✨ 추천 말풍선 컨테이너(공통) */
.suggested-prompts{
  --gap: 12px;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 72px;
  width: calc(100% - 32px);
  max-width: 600px;
  display: flex;
  gap: var(--gap);
  overflow-x: auto;
  padding: 8px;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  z-index: 1001;
  margin-bottom: 16px;
}

/* ✅ 응답 후 한 줄 칩(기존) */
.suggested-prompts .chip{
  flex: 0 0 auto;
  border: 1px solid var(--aa-border);
  background: #fff;
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.2;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
  white-space: nowrap;
}
.suggested-prompts .chip:hover{ transform: translateY(-1px); }
.suggested-prompts .chip:active{ transform: translateY(0); box-shadow: 0 2px 8px rgba(0,0,0,.05); }

/* ✨ 최초 진입 2줄 칩: 화면에 2.5개 보이기 */
.suggested-prompts.initial .chip-2line{
  /* 2.5개 = 가용폭을 2.5로 분할. gap 보정(1.5*gap) */
  flex: 0 0 calc((100% - var(--gap) * 1.5) / 2.5);
  min-width: 0;
  white-space: normal;               /* 두 줄 허용 */
  background: #f3f4f6;               /* 밝은 회색 박스 */
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* 로딩 칩 */
.suggested-prompts .chip-loading{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--aa-border);
  background: #fff;
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
}
.loading-dots { display: inline-flex; gap: 4px; height: 16px; align-items: baseline;}
.loading-dots .dot{
  width: 6px; height: 6px; border-radius: 50%;
  background-color: #666; animation: blink 1.4s infinite ease-in-out both;
}
.loading-dots .dot:nth-child(2){ animation-delay:.2s }
.loading-dots .dot:nth-child(3){ animation-delay:.4s }

/* 2줄 칩 텍스트 컬러: 제목=파란계열, 설명=짙은 회색 */
.suggested-prompts.initial .chip-2line .chip-title{
  font-size: 14px;
  font-weight: 800;
  color: #2563eb;                    /* 파란색 계열 */
  margin-bottom: 4px;
}
.suggested-prompts.initial .chip-2line .chip-desc{
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;                    /* 검은 진한 회색 */
}

/* ✅ 래퍼를 '화면 높이'에 딱 맞추기 (100vh 대신) */
@supports (height: 100dvh) {
  .chat-wrapper { height: 100dvh; }
}
@supports not (height: 100dvh) {
  .chat-wrapper { height: 100svh; }
}

/* 반응형 */
@media (max-width: 768px) {
  .chat-messages { margin-bottom: 120px; }
  html, body { touch-action: manipulation; }
  .chat-bubble.bot {
    margin-left: 0;      /* 왼쪽 여백 제거 */
    padding-left: 4px;   /* 말풍선 안쪽 패딩은 최소 유지 */
  }

  .chat-bubble.bot .avatar {
    margin-right: 1px;   /* 아바타와 말풍선 사이 간격 축소 */
    width: 1px;         /* 아바타 크기도 모바일에 맞게 축소 */
    height: 1px;
  }
}

/* 모바일에서 살짝 더 내리고 싶다면 */
@media (max-width: 480px) {
  .header-tags { transform: translateY(4px); }
  .header-avatar-btn{ width:28px; height:28px; }
  .tag{ padding:5px 8px; font-size:11px; }
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
