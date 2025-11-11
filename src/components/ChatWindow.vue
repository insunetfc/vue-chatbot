<template>
  <!-- ✅ 전체 드래그 오버레이 -->
  <div v-if="isDraggingFile" class="drag-overlay">
    <div class="drag-overlay-content">📎 무엇이든 추가하세요</div>
  </div>

  <div class="chat-wrapper">
    <div
      v-if="errorMessage"
      class="error-toast"
      role="alert"
      aria-live="polite"
    >
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
            role="button"
            tabindex="0"
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
        <button
          type="button"
          class="header-webbuilder-btn"
          @click="openBuilderList"
          aria-label="최근 웹빌더 열기"
          title="최근 웹빌더 열기"
        >
          🌐
        </button>
        <!-- ⚙ 대신 아바타 버튼 -->
        <button
          type="button"
          class="header-avatar-btn"
          @click="onSettingsClick"
          aria-label="프로필 설정 열기"
        >
          <template v-if="profile.avatar">
            <img
              :src="profile.avatar"
              alt="프로필 이미지"
              class="header-avatar-img"
            />
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
          <div
            v-if="msg.attachments && msg.attachments.length"
            class="bubble-attachments"
          >
            <div
              v-for="(att, i) in msg.attachments"
              :key="i"
              class="bubble-attachment"
            >
              <template v-if="att.kind === 'image'">
                <img :src="att.src" :alt="att.name" />
              </template>
              <template v-else>
                <span class="file-emoji">{{ att.emoji }}</span>
                <span class="file-label" :title="att.name">{{ att.name }}</span>
              </template>
            </div>
          </div>
          <div
            v-if="msg.meta && msg.meta.builderSessionId"
            class="builder-actionbar"
            role="group"
            aria-label="웹빌더 작업"
          >
            <button
              type="button"
              class="btn-mini"
              @click="openBuilderFromSession(msg.meta.builderSessionId)"
            >
              웹빌더 열기
            </button>
            <button
              type="button"
              class="btn-mini ghost"
              @click="duplicateBuilderSession(msg.meta.builderSessionId)"
            >
              복제
            </button>
          </div>
          <!-- 텍스트 -->
          <template v-if="msg.loading">
            <span v-if="msg.loadingText" class="loading-label">{{
              msg.loadingText
            }}</span>
            <span class="typing-indicator">
              <span class="dot"></span><span class="dot"></span
              ><span class="dot"></span>
            </span>
          </template>
          <span v-else v-html="safeFormat(msg.text)"></span>
        </div>
      </div>
    </div>

    <!-- ✨ 작성 중 첨부 미리보기(전송 전, 입력창 위 고정) -->
    <div v-if="uploadedFiles.length" class="compose-preview-container">
      <div
        v-for="(file, index) in uploadedFiles"
        :key="index"
        class="compose-preview-item"
      >
        <div v-if="file.type.startsWith('image/')" class="image-preview">
          <img :src="previewURLs[index]" alt="미리보기" />
        </div>
        <div v-else class="file-icon">
          <span>{{ fileEmoji(file.name) }}</span>
          <span class="file-name" :title="file.name">{{ file.name }}</span>
        </div>
        <button
          class="remove-file"
          @click="removeFile(index)"
          aria-label="첨부 삭제"
        >
          ✖
        </button>
      </div>
    </div>
    <!-- ✨ 추천 말풍선 (입력창 위 고정) -->
    <div
      v-if="showInitPrompts"
      class="suggested-prompts initial"
      :class="{ expanded: initExpanded }"
    >
      <!-- ✅ 칩 목록 (1줄/2줄 토글에 따라 shownInitItems 사용) -->
      <button
        v-for="(p, i) in shownInitItems"
        :key="'init-' + i"
        type="button"
        class="chip chip-2line chip-with-icon"
        @click="onInitChipClick(p)"
      >
        <div class="chip-body">
          <!-- 아이콘과 타이틀 한 줄 -->
          <div class="chip-title-with-icon">
            <span class="chip-icon" aria-hidden="true">
              {{ emojiIcon(p.title) }}
            </span>
            <span class="chip-title">{{ p.title }}</span>
          </div>
          <div class="chip-desc">{{ p.desc }}</div>
        </div>
      </button>

      <!-- 더 보기 / 접기 -->
      <button
        type="button"
        class="chip chip-2line chip-more"
        :aria-pressed="initExpanded ? 'true' : 'false'"
        @click.stop="toggleInitExpand()"
      >
        <div class="chip-title">{{ initExpanded ? "접기" : "더 보기" }}</div>
        <div class="chip-desc">{{ initExpanded ? "한 줄로" : "2줄 보기" }}</div>
      </button>
      <button
        v-if="builderSessions.length"
        type="button"
        class="chip"
        title="마지막 웹빌더 열기"
        @click="openLastBuilder"
      >
        최근빌더
      </button>
    </div>

    <!-- ✅ 답변 후 후속 제안(한 줄 칩) -->
    <div v-else-if="showFollowupPrompts" class="suggested-prompts">
      <button
        type="button"
        class="chip chip-reset"
        title="초기 질문으로 돌아가기"
        @click="resetToInitPrompts"
      >
        <!-- lucide rotate-ccw 아이콘 -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-rotate-ccw"
        >
          <path d="M3 2v6h6"></path>
          <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
        </svg>
      </button>
      <button
        v-for="(p, i) in suggestedPrompts"
        :key="'sug-' + i"
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
        <span class="loading-dots"
          ><span class="dot"></span><span class="dot"></span
          ><span class="dot"></span
        ></span>
      </div>
    </div>
    <!-- 입력 영역 -->
    <form
      class="chat-input-container"
      :class="{ dragover: isDragOver }"
      @submit.prevent
    >
      <button
        type="button"
        class="upload-button"
        aria-label="파일 업로드"
        @click.stop="togglePicker"
        :disabled="isSending"
      >
        <!-- ...svg... -->

        <!-- 플러스 아이콘 -->
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="#555"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <!-- 작은 선택 메뉴 -->
      <div
        v-if="pickerOpen"
        class="picker-menu"
        v-click-outside="closePicker"
        @click.stop="noop"
      >
        <button type="button" class="picker-item" @click="openPicker('docs')">
          📄 문서 업로드
        </button>
        <button type="button" class="picker-item" @click="openPicker('images')">
          🖼 사진 업로드
        </button>
      </div>

      <!-- 문서 전용 input -->
      <input
        id="file-input-docs"
        ref="fileInputDocs"
        type="file"
        style="display: none"
        @change="onPickedFiles"
        multiple
        accept="
            application/pdf,
            text/plain,
            application/msword,
            application/vnd.openxmlformats-officedocument.wordprocessingml.document,
            application/vnd.ms-excel,
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
            application/vnd.ms-powerpoint,
            application/vnd.openxmlformats-officedocument.presentationml.presentation,
            application/vnd.ms-powerpoint.presentation.macroEnabled.12,
            application/vnd.openxmlformats-officedocument.presentationml.slideshow,
            .ppt,.pptx,.pps,.ppsx
          "
      />

      <!-- 이미지 전용 input -->
      <input
        id="file-input-images"
        ref="fileInputImages"
        type="file"
        style="display: none"
        @change="onPickedFiles"
        multiple
        accept="image/*"
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
        <svg
          viewBox="0 0 24 24"
          fill="white"
          width="18"
          height="18"
          aria-hidden="true"
        >
          <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
        </svg>
      </button>
    </form>
    <show-analysis-sheet
      v-if="showAnalysisSheet"
      :uploaded-files="uploadedFiles"
      :is-sending="isSending"
      :file-emoji="fileEmoji"
      :limits="{
        maxFiles: LIMIT_MAX_FILES,
        perFile: LIMIT_PER_FILE,
        total: LIMIT_TOTAL,
      }"
      :valid-ext="/\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$/i"
      @close="showAnalysisSheet = false"
      @remove-index="removeFile"
      @select-files="handleSelectFiles"
      @send="onAnalysisSend"
    />
    <show-proposal-sheet
      v-if="ShowProposalSheet"
      :uploaded-files="uploadedFiles"
      :is-sending="isSending"
      :file-emoji="fileEmoji"
      :limits="{
        maxFiles: LIMIT_MAX_FILES,
        perFile: LIMIT_PER_FILE,
        total: LIMIT_TOTAL,
      }"
      :valid-ext="/\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$/i"
      @close="ShowProposalSheet = false"
      @remove-index="removeFile"
      @select-files="handleSelectFiles"
      @send="onProposalSend"
      @open-builder="onOpenBuilder"
    />
    <show-qna-sheet
      v-if="showQnaSheet"
      :uploaded-files="uploadedFiles"
      :is-sending="isSending"
      :file-emoji="fileEmoji"
      :limits="{
        maxFiles: LIMIT_MAX_FILES,
        perFile: LIMIT_PER_FILE,
        total: LIMIT_TOTAL,
      }"
      :valid-ext="/\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$/i"
      @close="showQnaSheet = false"
      @remove-index="removeFile"
      @select-files="handleSelectFiles"
      @send="onQnaSend"
    />
    <show-notice-sheet
      v-if="showNoticeSheet"
      :uploaded-files="uploadedFiles"
      :is-sending="isSending"
      :file-emoji="fileEmoji"
      :limits="{
        maxFiles: LIMIT_MAX_FILES,
        perFile: LIMIT_PER_FILE,
        total: LIMIT_TOTAL,
      }"
      :valid-ext="/\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$/i"
      @close="showNoticeSheet = false"
      @remove-index="removeFile"
      @select-files="handleSelectFiles"
      @send="onNoticeSend"
    />
    <web-builder
      v-if="showWebBuilder"
      :files="webBuilderData.files"
      :initial-content="webBuilderData.content"
      @close="showWebBuilder = false"
    />
    <consult-script-sheet
      v-if="showConsultScript"
      :is-sending="isSending"
      @close="showConsultScript = false"
      @send="onConsultScriptSend"
    />
    <bonus-planner-sheet
      v-if="showBonusSheet"
      :uploaded-files="uploadedFiles"
      :is-sending="isSending"
      :file-emoji="fileEmoji"
      :limits="{ maxFiles: LIMIT_MAX_FILES, perFile: LIMIT_PER_FILE, total: LIMIT_TOTAL }"
      :valid-ext="/\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$/i"
      @close="showBonusSheet=false"
      @send="onBonusSend"
    />
    <EduMaterialSheet
      v-if="showEduMaterial"
      :isSending="isSending"
      @close="showEduMaterial = false"
      @send="onEduMaterialSend"
    />
    <MarketingContentSheet
      v-if="showMarketingContent"
      :isSending="isSending"
      @close="showMarketingContent = false"
      @send="onMarketingContentSend"
    />
    <ConsultScheduleSheet
      v-if="showConsultSchedule"
      :isSending="isSending"
      @close="showConsultSchedule = false"
      @send="onConsultScheduleSend"
    />
    <CustomerStrategySheet
      v-if="showCustomerStrategy"
      :isSending="isSending"
      @close="showCustomerStrategy = false"
      @send="onCustomerStrategySend"
    />
    <claim-check-sheet
      v-if="showClaimCheck"
      :is-sending="isSending"
      @close="showClaimCheck = false"
      @send="onClaimCheckSend"
    />
  </div>

  <!-- ✅ 설정 드로어: 오른쪽 → 왼쪽 슬라이드 (Vulk 톤) -->
  <transition name="aa-slide">
    <div
      v-if="showSettingsModal"
      class="aa-modal-backdrop"
      @click.self="closeSettings"
      role="presentation"
    >
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
            <button
              type="button"
              class="icon-btn"
              aria-label="닫기"
              @click="closeSettings"
            >
              ←
            </button>
            <h2 id="drawerTitle" class="drawer-title">프로필 설정</h2>
            <span class="icon-btn-spacer" aria-hidden="true"></span>
          </div>
          <div class="drawer-hero">
            <button
              type="button"
              class="avatar-lg-btn"
              @click="triggerAvatarPick"
              aria-label="프로필 이미지 변경"
            >
              <img
                v-if="profile.avatar"
                :src="profile.avatar"
                alt="프로필 이미지"
                class="avatar-lg-img"
              />
              <span v-else class="avatar-lg-fallback">{{ initials }}</span>
            </button>
            <p class="drawer-subtitle">
              고객 응대에 사용되는 기본 정보를 설정하세요.
            </p>
            <!-- 숨김 파일 입력 -->
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onAvatarSelected"
            />
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
          <button class="btn ghost" type="button" @click="closeSettings">
            취소
          </button>
          <button class="btn primary" type="button" @click="saveSettings">
            저장
          </button>
        </footer>

        <!-- 카테고리 미리보기 -->
        <p class="hint center pv-12">
          전송 시 <code>category</code>에<br />
          <strong>{{ previewCategoryString }}</strong> 로 포함됩니다.
        </p>
      </div>
    </div>
  </transition>
  <transition name="aa-slide">
    <div
      v-if="showBuilderList"
      class="aa-modal-backdrop"
      @click.self="closeBuilderList"
      role="presentation"
    >
      <div
        class="aa-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="builderDrawer"
      >
        <header class="drawer-header">
          <div class="drawer-appbar">
            <button
              type="button"
              class="icon-btn"
              aria-label="닫기"
              @click="closeBuilderList"
            >
              ←
            </button>
            <h2 id="builderDrawer" class="drawer-title">최근 웹빌더</h2>
            <span class="icon-btn-spacer" aria-hidden="true"></span>
          </div>
        </header>
        <section class="drawer-body">
          <div v-if="!builderSessions.length" class="hint">
            최근 웹빌더 세션이 없습니다.
          </div>
          <ul v-else class="builder-list">
            <li v-for="s in builderSessions" :key="s.id" class="builder-item">
              <div class="builder-meta">
                <div class="builder-title" :title="s.title">{{ s.title }}</div>
                <small class="builder-time">{{
                  new Date(s.createdAt).toLocaleString()
                }}</small>
              </div>
              <div class="builder-actions-row">
                <button class="btn-mini" @click="openBuilderFromSession(s.id)">
                  열기
                </button>
                <button
                  class="btn-mini ghost"
                  @click="duplicateBuilderSession(s.id)"
                >
                  복제
                </button>
                <button
                  class="btn-mini danger"
                  @click="deleteBuilderSession(s.id)"
                >
                  삭제
                </button>
              </div>
            </li>
          </ul>
        </section>
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
import MarkdownIt from "markdown-it";
import ShowAnalysisSheet from "@/components/sheet/AnalysisSheet.vue";
import ShowProposalSheet from "@/components/sheet/ProposalSheet.vue";
import ShowQnaSheet from "@/components/sheet/QnaSheet.vue";
import WebBuilder from "@/components/builder/WebBuilder.vue";
import ShowNoticeSheet from "@/components/sheet/NoticeSheet.vue";
import BonusPlannerSheet from "@/components/sheet/BonusPlannerSheet.vue";
import ConsultScriptSheet from "@/components/sheet/ConsultScriptSheet.vue";
import EduMaterialSheet from "@/components/sheet/EduMaterialSheet.vue";
import MarketingContentSheet from "@/components/sheet/MarketingContentSheet.vue";
import ConsultScheduleSheet from "@/components/sheet/ConsultScheduleSheet.vue";
import CustomerStrategySheet from "@/components/sheet/CustomerStrategySheet.vue";
import ClaimCheckSheet from "@/components/sheet/ClaimCheckSheet.vue";

const clickOutside = {
  beforeMount(el, binding) {
    el.__clickOutside__ = (e) => {
      if (!(el === e.target || el.contains(e.target))) {
        binding.value(e);
      }
    };
    setTimeout(() => {
      document.addEventListener("click", el.__clickOutside__);
    }, 0);
  },
  unmounted(el) {
    document.removeEventListener("click", el.__clickOutside__);
  },
};

export default {
  name: "ChatAA",
  directives: { clickOutside },
  components: {
    ShowAnalysisSheet,
    ShowProposalSheet,
    ShowQnaSheet,
    ShowNoticeSheet,
    WebBuilder,
    BonusPlannerSheet,
    ConsultScriptSheet,
    EduMaterialSheet,
    MarketingContentSheet,
    ConsultScheduleSheet,
    CustomerStrategySheet,
    ClaimCheckSheet,
  },
  data() {
    return {
      userInput: "",
      messages: [],
      sessionId: null,
      lastFileName: "",

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
      forceInitPrompts: false,
      showAnalysisSheet: false,
      ShowProposalSheet: false,
      showQnaSheet: false,
      showNoticeSheet: false,
      showConsultScript: false,
      showEduMaterial: false,
      showMarketingContent: false,
      showConsultSchedule: false,
      showCustomerStrategy: false,
      showClaimCheck: false,

      // ✅ 프로필 상태(로컬 저장/로드)
      profile: {
        name: "",
        email: "",
        phone: "",
        division: "",
        job: "",
        avatar: "", // ← 추가: dataURL 저장
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
      pickerOpen: false, // ← 추가: 업로드 종류 선택 메뉴 오픈 상태
      showWebBuilder: false,
      webBuilderData: {
        files: [],
        content: "", // 빌더 본문 초기값
      },
      builderSessions: [], // ✅ 최근 빌더 세션 목록
      showBuilderList: false, // ✅ 최근 빌더 드로어
      showBuilderNudge: false, // ✅ "초안 저장됨" 배지
      captureNextBot: null,
      showBonusSheet: false,
      pendingBonusPayload: null,

      // 설정
      API_BASE: "/api/v_1",
      LIMIT_MAX_FILES: 3,
      LIMIT_PER_FILE: 50 * 1024 * 1024,
      LIMIT_TOTAL: 25 * 1024 * 1024,
      initExpanded: false, // ✅ 초기 칩 확장 상태(더 보기)
      isAwaitingFollowups: false, // 추가질문 API 응답 대기 상태
      suggestedPrompts: [], // 응답 후 한 줄 칩
      suggestedPromptsInitial: [
        { title: "문서공유", desc: "고객 실시간 상담" },
        { title: "보장분석", desc: "계약 보장 내용 분석" },
        { title: "제안서작성", desc: "상황에 맞는추천 제안서 생성" },
        { title: "고객질문답변", desc: "고객이 묻는 질문/보조 답변" },
        { title: "안내문작성", desc: "후속 안내 문자·톡 발송" },
        { title: "상담스크립트", desc: "방문·콜 상담 대본 생성" },
        { title: "교육자료", desc: "상담·영업 교육자료 제작" },
        { title: "마케팅콘텐츠", desc: "홍보·마케팅 글/이미지 제작" },
        //{ title: "스케줄작성", desc: "업무·상담 일정 계획" },
        { title: "고객공략법", desc: "고객 유형별 공략 아이디어 제시" },
        { title: "예상수수료", desc: "계약 예상 수수료 계산" },
        { title: "보험금확인", desc: "보험금 수령 예상 금액" },
        { title: "모바일쿠폰", desc: "고객 대상 선물 전송" },
      ],
    };
  },
  created() {
    this.loadBuilderSessions(); // ✅ 로컬 저장된 세션 불러오기
    // 마크다운 파서: 테이블/개행/링크 활성화
    this._md = new MarkdownIt({
      html: false, // 마크다운 안에서 임의의 HTML 금지 (보안)
      linkify: true, // URL 자동 링크
      breaks: true, // 개행을 <br>로
    }).enable(["table"]); // GFM 표 지원
  },
  computed: {
    canSend() {
      return this.userInput.trim().length > 0 || this.uploadedFiles.length > 0;
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
    initFirstLineCount() {
      return 2;
    },
    shownInitItems() {
      return this.initExpanded
        ? this.suggestedPromptsInitial
        : this.suggestedPromptsInitial.slice(0, this.initFirstLineCount);
    },
    hasFiles() {
      return this.uploadedFiles.length > 0;
    },
    showInitPrompts() {
      return (
        !this.hasFiles &&
        !this.isAwaitingFollowups &&
        (this.forceInitPrompts || this.messages.length === 0) && // 🔹 강제 표시 허용
        this.suggestedPromptsInitial.length > 0
      );
    },
    showFollowupPrompts() {
      return (
        !this.hasFiles &&
        !this.isAwaitingFollowups &&
        !this.forceInitPrompts && // 🔹 강제 초기 모드일 땐 후속 칩 숨김
        this.messages.length > 0 &&
        this.suggestedPrompts.length > 0
      );
    },
    showFollowupLoading() {
      return !this.hasFiles && this.isAwaitingFollowups;
    },
  },
  mounted() {
    // drag global
    window.addEventListener("dragenter", this.onDragEnter);
    window.addEventListener("dragleave", this.onDragLeave);
    window.addEventListener("dragover", this.onDragOver);
    window.addEventListener("drop", this.onDrop);

    // viewport/blur 안전장치
    this._vvHandler = () => this.scrollToBottom();
    if (window.visualViewport)
      window.visualViewport.addEventListener("resize", this._vvHandler);

    this._blurHandler = () => {
      this.dragCounter = 0;
      this.isDraggingFile = false;
    };
    window.addEventListener("blur", this._blurHandler);
    document.addEventListener("visibilitychange", this._blurHandler);

    this._leaveWindow = (e) => {
      if (
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        this.dragCounter = 0;
        this.isDraggingFile = false;
      }
    };
    const cm = this.$refs.messagesContainer;
    if (cm) {
      cm.addEventListener(
        "touchmove",
        (e) => {
          e.stopPropagation();
          // 필요하면 다음 줄도 활성화 (페이지 전체 끌리는 현상 강제 차단)
          // e.preventDefault();
        },
        { passive: false }
      );
    }
    window.addEventListener("mouseout", this._leaveWindow);

    // ✅ 단축키: Ctrl/Cmd + B → 마지막 빌더 열기
    this._kbHandler = (e) => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        this.openLastBuilder();
      }
    };
    window.addEventListener("keydown", this._kbHandler);

    // ✅ 프로필 로드
    this.loadSettings();
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this._kbHandler);
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
    onClaimCheckSend(payload) {
      const memo = payload?.memo?.trim() || "";
      if (memo) this.userInput = memo;
      if (payload?.files?.length) {
        this.uploadedFiles.push(...payload.files);
      }
      this.showClaimCheck = false;
      this.sendMessage();
    },
    onCustomerStrategySend(payload) {
      const memo = payload?.memo?.trim() || "";
      if (memo) this.userInput = memo;
      if (payload?.files?.length) {
        this.uploadedFiles.push(...payload.files);
      }
      this.showCustomerStrategy = false;
      this.sendMessage();
    },
    onEduMaterialSend(payload) {
      const memo = payload?.memo?.trim() || "";
      if (memo) this.userInput = memo;
      if (payload?.files?.length) {
        this.uploadedFiles.push(...payload.files);
      }
      this.showEduMaterial = false;
      this.sendMessage();
    },
    onMarketingContentSend(payload) {
      const memo = payload?.memo?.trim() || "";
      if (memo) this.userInput = memo;
      if (payload?.files?.length) {
        this.uploadedFiles.push(...payload.files);
      }
      this.showMarketingContent = false;
      this.sendMessage();
    },
    onConsultScheduleSend(payload) {
      const memo = payload?.memo?.trim() || "";
      if (memo) this.userInput = memo;
      this.showConsultSchedule = false;
      this.sendMessage();
    },
    onConsultScriptSend(payload) {
      const memo = payload?.memo?.trim() || "";
      if (memo) this.userInput = memo;

      // 파일 업로드도 함께 전달
      if (payload?.files?.length) {
        this.uploadedFiles.push(...payload.files);
      }

      this.showConsultScript = false;
      this.sendMessage();
    },
    onBonusSend(payload) {
      // payload: { category, question, meta, result, humanText }
      const memoText = (payload?.question || "").trim();
      const visible = payload?.humanText?.trim()
        ? payload.humanText.trim()
        : memoText || "시상 최적화 시뮬레이션 요청";

      // 서버 최적화용 전체 컨텍스트를 숨김 블록에 담아 전송
      const hiddenJson = {
        categoryFromChild: payload?.category || "",
        questionFromChild: memoText,
        meta: payload?.meta || {},
        result: payload?.result || {},
      };

      const hidden =
        `\n\n[[HIDDEN_START]]__BONUS_PLANNER_JSON__\n` +
        `${JSON.stringify(hiddenJson)}\n` +
        `[[HIDDEN_END]]`;

      // ✅ 채팅 버블에는 사람이 읽는 요약(visible) 표시
      // ✅ 서버에는 숨김 JSON도 함께 전달
      this.userInput = visible + hidden;

      // 부모의 category 분기 로직(예상수수료 → 시상분석 prefix)을 트리거
      this.lastClickedChipTitle = '예상수수료';
      // 파일 업로드도 함께 전달
      if (payload?.files?.length) {
        this.uploadedFiles.push(...payload.files);
      }
    
      this.showBonusSheet = false;
      this.sendMessage();
    },
    onNoticeSend(payload) {
      const m =
        payload && typeof payload.memo === "string" ? payload.memo.trim() : "";
      if (m) this.userInput = m;
      this.showNoticeSheet = false;
      this.sendMessage();
    },
    // ✅ 로컬 세션 관리
    loadBuilderSessions() {
      try {
        const raw = localStorage.getItem("aa_builder.sessions");
        this.builderSessions = Array.isArray(JSON.parse(raw))
          ? JSON.parse(raw)
          : [];
      } catch (_) {
        this.builderSessions = [];
      }
    },
    persistBuilderSessions() {
      try {
        localStorage.setItem(
          "aa_builder.sessions",
          JSON.stringify(this.builderSessions)
        );
      } catch (err) {
        console.error("세션 저장 실패:", err);
        this.showError?.("웹빌더 세션 저장 중 오류가 발생했습니다.");
      }
    },
    getTitleFromText(text = "") {
      const h1 = text.match(/^\s*#\s+(.+)$/m)?.[1];
      if (h1) return h1.trim();
      const first = text
        .split("\n")
        .map((s) => s.trim())
        .find(Boolean);
      if (first) return first.slice(0, 80);
      return (text || "웹페이지 초안").slice(0, 40);
    },
    saveBuilderSession({ id, content = "", files = [] } = {}) {
      const sessId = id || "wb-" + Math.random().toString(36).slice(2, 10);
      const title = this.getTitleFromText(content);
      const filesSnap = files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type || "",
        url: f.url || "",
      }));
      const sess = {
        id: sessId,
        title,
        content,
        files: filesSnap,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      // 기존 동일 id 있으면 갱신, 없으면 맨 앞 추가
      const i = this.builderSessions.findIndex((x) => x.id === sessId);
      if (i >= 0) this.builderSessions.splice(i, 1, sess);
      else this.builderSessions.unshift(sess);
      this.builderSessions = this.builderSessions.slice(0, 20);
      this.persistBuilderSessions();
      return sessId;
    },
    updateBuilderSession({ id, content, files }) {
      const i = this.builderSessions.findIndex((x) => x.id === id);
      if (i < 0) return;
      const prev = this.builderSessions[i];
      const next = {
        ...prev,
        content: typeof content === "string" ? content : prev.content,
        files: Array.isArray(files) ? files : prev.files,
        title: this.getTitleFromText(
          typeof content === "string" ? content : prev.content
        ),
        updatedAt: Date.now(),
      };
      this.builderSessions.splice(i, 1, next);
      this.persistBuilderSessions();
    },
    findSessionById(id) {
      return this.builderSessions.find((s) => s.id === id);
    },
    openBuilderFromSession(id) {
      const s = this.findSessionById(id);
      if (!s) return this.showError("세션을 찾을 수 없습니다.");
      const files = (s.files || []).map((x) => ({
        name: x.name,
        size: x.size,
        type: x.type,
        url: x.url,
      }));
      this.webBuilderData = { files, content: s.content, sessionId: s.id };
      this.showWebBuilder = true;
      this.showBuilderList = false;
    },
    openLastBuilder() {
      if (!this.builderSessions.length)
        return this.showError("최근 빌더가 없습니다.");
      this.openBuilderFromSession(this.builderSessions[0].id);
    },
    duplicateBuilderSession(id) {
      const s = this.findSessionById(id);
      if (!s) return this.showError("세션을 찾을 수 없습니다.");
      const newId = this.saveBuilderSession({
        content: s.content,
        files: s.files,
      });
      this.openBuilderFromSession(newId);
    },
    deleteBuilderSession(id) {
      this.builderSessions = this.builderSessions.filter((s) => s.id !== id);
      this.persistBuilderSessions();
    },
    openBuilderList() {
      this.showBuilderList = true;
    },
    closeBuilderList() {
      this.showBuilderList = false;
    },
    _builderNudgeOnce() {
      this.showBuilderNudge = true;
      setTimeout(() => (this.showBuilderNudge = false), 5000);
    },

    // ✅ 제안서 → 웹빌더 여는 진입점(자식이 @open-builder 보낼 때 이미 사용 중)
    onOpenBuilder(payload) {
      this.ShowProposalSheet = false;

      const incoming = Array.isArray(payload?.files) ? payload.files : [];
      const memo = (payload?.memo || "").trim();

      this._builderObjectUrls = this._builderObjectUrls || [];
      const sourceFiles =
        (incoming.length ? incoming : this.uploadedFiles) || [];
      const builderFiles = sourceFiles.map((f) => {
        const isImg = f?.type?.startsWith?.("image/");
        const url = isImg ? URL.createObjectURL(f) : f.url || "";
        if (url && isImg) this._builderObjectUrls.push(url);
        return { file: f, name: f.name, size: f.size, type: f.type || "", url };
      });

      // 다음 봇 응답을 초안으로 저장 + 연결
      this.captureNextBot = (botText) => {
        if (!botText) {
          this.showError("봇 응답을 가져오지 못했습니다.");
          return;
        }

        // 1) 세션 저장
        const sessId = this.saveBuilderSession({
          content: botText,
          files: builderFiles,
        });

        // 2) 마지막 봇 메시지에 세션 ID 메타 연결
        let idx = -1;
        for (let i = this.messages.length - 1; i >= 0; i--) {
          if (this.messages[i].role === "bot") {
            idx = i;
            break;
          }
        }
        if (idx >= 0) {
          const m = this.messages[idx];
          this.messages.splice(idx, 1, {
            ...m,
            meta: { ...(m.meta || {}), builderSessionId: sessId },
          });
        }

        // 3) 웹빌더 열기
        this.webBuilderData = {
          files: builderFiles,
          content: botText,
          sessionId: sessId,
        };
        this.showWebBuilder = true;

        // 4) 너지
        this._builderNudgeOnce();
      };

      if (memo) this.userInput = memo;
      this.sendMessage();
    },

    // ✅ 웹빌더가 닫힐 때 자식이 emit하는 내용을 받음(내용/파일 갱신)
    onBuilderClosed(payload) {
      // payload: { sessionId, content, files }
      if (!payload?.sessionId) return;
      // files는 {name,size,type,url} 배열로 받기를 권장 (자식에서 가공)
      this.updateBuilderSession({
        id: payload.sessionId,
        content: payload.content,
        files: payload.files,
      });
    },
    stripHiddenAll(text = "") {
      return String(text)
        .replace(/\[\[HIDDEN_START\]\][\s\S]*?\[\[HIDDEN_END\]\]/g, "")
        .trim();
    },
    // 마커 토큰만 제거하고 "안의 내용은 유지" (API용)
    stripHiddenMarkers(text = "") {
      return String(text)
        .replace(/\[\[HIDDEN_START\]\]/g, "")
        .replace(/\[\[HIDDEN_END\]\]/g, "")
        .trim();
    },
    // (1) FileList/Array/단일 File/커스텀 payload 모두 처리 가능하게 정규화
    normalizeFiles(input) {
      // 자식이 { files, mode } 형태로 보낼 수도, FileList/Array만 보낼 수도 있음
      let files = [];
      let mode = "append";
      let __fromChild = false;

      if (input && input.files) {
        files = input.files;
        mode = input.mode || "append";
        __fromChild = !!input.__fromChild; // ✅ 추가
      } else if (input && input.target && input.target.files) {
        files = input.target.files; // <input type=file> change 이벤트
      } else if (input instanceof FileList) {
        files = input;
      } else if (Array.isArray(input)) {
        files = input;
      } else if (input instanceof File) {
        files = [input];
      } else {
        files = [];
      }

      return { files: Array.from(files), mode, __fromChild };
    },

    // (2) 자식/드롭/인풋 모두 이 함수로 수렴: 병합 + 검증 + 중복제거 + 미리보기 생성
    handleSelectFiles(payload) {
      const { files: raw, mode, __fromChild } = this.normalizeFiles(payload);
      if (!raw.length) return;

      // ✅ 자식에서 이미 검증/토스트 끝낸 파일 → 그대로 붙이기만
      if (__fromChild) {
        const baseList = mode === "replace" ? [] : this.uploadedFiles.slice();
        this.uploadedFiles = baseList.concat(raw);

        for (const f of raw) {
          if (f.type?.startsWith?.("image/")) {
            this.previewURLs.push(URL.createObjectURL(f));
          } else {
            this.previewURLs.push("");
          }
        }
        this.$nextTick(this.scrollToBottom);
        return;
      }

      const validExtensions =
        /\.(pdf|txt|docx|png|jpg|jpeg|xls|xlsx|ppt|pptx)$/i;

      // 기준 상태: replace 면 초기화 후 시작
      const baseList = mode === "replace" ? [] : this.uploadedFiles.slice();
      const baseSeen = new Set(
        baseList.map((f) => `${f.name}:${f.size}:${f.lastModified || 0}`)
      );
      const currentTotal = baseList.reduce((s, f) => s + f.size, 0);

      let added = [];
      let addSize = 0;
      const toMB = (bytes) => Math.round(bytes / (1024 * 1024));

      for (const f of raw) {
        if (!validExtensions.test(f.name)) {
          this.showError(`❌ 지원 안함: ${f.name}`);
          continue;
        }
        if (f.size > this.LIMIT_PER_FILE) {
          this.showError(`❌ ${toMB(this.LIMIT_PER_FILE)}MB 초과: ${f.name}`);
          continue;
        }

        // 총 개수 제한
        if (baseList.length + added.length >= this.LIMIT_MAX_FILES) {
          this.showError(`❌ 최대 ${this.LIMIT_MAX_FILES}개 파일`);
          break;
        }
        // 총 용량 제한
        if (currentTotal + addSize + f.size > this.LIMIT_TOTAL) {
          this.showError(`❌ 총 ${toMB(this.LIMIT_TOTAL)}MB 초과`);
          break;
        }

        const key = `${f.name}:${f.size}:${f.lastModified || 0}`;
        if (baseSeen.has(key)) continue; // 중복 제거

        added.push(f);
        addSize += f.size;
        baseSeen.add(key);
      }

      if (!added.length) return;

      // 상태 반영
      this.uploadedFiles = baseList.concat(added);

      // 미리보기(URL) 동기화
      for (const f of added) {
        if (f.type?.startsWith?.("image/")) {
          const url = URL.createObjectURL(f);
          this.previewURLs.push(url);
        } else {
          this.previewURLs.push("");
        }
      }

      this.$nextTick(this.scrollToBottom);
    },

    colorizeStatus(root) {
      const skipTags = new Set([
        "CODE",
        "PRE",
        "A",
        "SCRIPT",
        "STYLE",
        "TEXTAREA",
      ]);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (skipTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (!/충분|부족/.test(node.nodeValue))
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const targets = [];
      while (walker.nextNode()) targets.push(walker.currentNode);

      for (const tn of targets) {
        const frag = document.createDocumentFragment();
        const parts = tn.nodeValue.split(/(충분|부족)/g);
        for (const p of parts) {
          if (p === "충분") {
            const span = document.createElement("span");
            span.className = "enough";
            span.textContent = p;
            frag.appendChild(span);
          } else if (p === "부족") {
            const span = document.createElement("span");
            span.className = "lack";
            span.textContent = p;
            frag.appendChild(span);
          } else if (p) {
            frag.appendChild(document.createTextNode(p));
          }
        }
        tn.parentNode.replaceChild(frag, tn);
      }
    },
    onAnalysisSend(payload) {
      const m =
        payload && typeof payload.memo === "string" ? payload.memo.trim() : "";
      if (m) this.userInput = m; // ✅ 먼저 userInput 채우고
      this.showAnalysisSheet = false;
      this.sendMessage(); // ✅ 그 다음 전송
    },
    onProposalSend(payload) {
      const m =
        payload && typeof payload.memo === "string" ? payload.memo.trim() : "";
      if (m) this.userInput = m; // ✅ 먼저 userInput 채우고
      this.ShowProposalSheet = false;
      this.sendMessage(); // ✅ 그 다음 전송
    },
    onQnaSend(payload) {
      const m =
        payload && typeof payload.memo === "string" ? payload.memo.trim() : "";
      if (m) this.userInput = m;
      this.showQnaSheet = false;
      this.sendMessage();
    },
    onInitChipClick(p) {
      const title = (p?.title || "").trim();
      this.lastClickedChipTitle = title;
      if (title === "보장분석") {
        this.showAnalysisSheet = true;
        return;
      }

      if (title === "제안서작성") {
        this.ShowProposalSheet = true; // P 대문자 → data 정의도 동일하게
        return;
      }

      if (title === "고객질문답변") {
        this.showQnaSheet = true;
        return;
      }
      if (title === "안내문작성") {
        this.showNoticeSheet = true;
        return;
      }
      // ✅ 추가: 예상수수료 → 보너스 시트 오픈
      if (title === "예상수수료") {
        this.showBonusSheet = true;
        return;
      }
      if (title === "상담스크립트") {
        this.showConsultScript = true;
        return;
      }
      if (title === "교육자료") {
        // ✅ 추가
        this.showEduMaterial = true;
        return;
      }
      if (title === "마케팅콘텐츠") {
        // ✅ 추가
        this.showMarketingContent = true;
        return;
      }
      if (title === "스케줄작성") {
        // ✅ 추가
        this.showConsultSchedule = true;
        return;
      }
      if (title === "고객공략법") {
        this.showCustomerStrategy = true;
        return;
      }
      if (title === "보험금확인") {
        this.showClaimCheck = true;
        return;
      }
      this.applySuggestion(`${p.title} ${p.desc}`, { send: true });
    },
    resetToInitPrompts() {
      this.suggestedPrompts = []; // 후속 칩 제거
      this.isAwaitingFollowups = false;
      this.initExpanded = false;
      this.forceInitPrompts = true; // 🔹 초기 질문 모드 강제
      this.$nextTick(this.scrollToBottom);
    },
    togglePicker() {
      this.pickerOpen = !this.pickerOpen;
    },
    closePicker() {
      this.pickerOpen = false;
    },
    emojiIcon(title) {
      const map = {
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
      };
      return map[title] || "🧩";
    },
    noop() {}, // 이벤트 핸들러 자리 채우기
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
        .filter((v) => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean);

      // 중복 제거
      out = [...new Set(out)];

      if (out.length >= 3 && out.length <= 6) {
        this.suggestedPrompts = out;
      } else {
        throw new Error("3~6개 JSON 배열 아님");
      }
    },
    toggleInitExpand() {
      this.initExpanded = !this.initExpanded;
    },
    // 업로드 선택 메뉴에서 호출 (문서/이미지)
    openPicker(kind = "docs") {
      this.pickerOpen = false;
      if (kind === "images") this.$refs.fileInputImages?.click();
      else this.$refs.fileInputDocs?.click();
    },

    // 숨김 input에서 파일 선택이 끝나면 기존 handleFileUpload 재활용
    onPickedFiles(e) {
      try {
        this.handleSelectFiles(e);
      } catch (err) {
        console.error("파일 업로드 중 오류 발생:", err);
      } finally {
        if (e && e.target) e.target.value = "";
      }
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) {
          setTimeout(() => {
            container.scrollTop = container.scrollHeight;
          }, 40);
        }
      });
    },
    /**
     * GPT 응답 문자열 → (1) ```html``` 블록은 그대로 sanitize해서 삽입
     *                 → (2) 나머지는 Markdown-it으로 렌더(표 포함) 후 sanitize
     */
    safeFormat(text) {
      if (!text) return "";

      // 0) 개행/공백 정리
      text = String(text).replace(/\r\n?/g, "\n");
      // 지나친 빈 줄은 1줄로 축소(표 경계 보강 전에 과도한 개행 제거)
      text = text.replace(/\n{3,}/g, "\n\n");

      // 1) 표 경계 보강: "표 마지막 행" 다음 줄이 표가 아니면 빈 줄 1개 강제 삽입
      // 1-1) GFM 파이프 테이블(|로 시작하는 행들)
      //      - 마지막 행(다음 줄이 | 로 시작하지 않는 경우)을 발견하면 그 뒤에 빈 줄 추가
      text = text.replace(/(\n\|[^\n]*\n)(?!\|)/g, "$1\n");

      // 1-2) TSV 스타일(탭으로 구분된 연속 행들)도 같은 방식으로 분리
      //      - 마지막 TSV 행(다음 줄이 탭 포함 행이 아님) 뒤에 빈 줄 추가
      text = text.replace(/(\n[^\n]*\t[^\n]*\n)(?![^\n]*\t)/g, "$1\n");

      text = text.replace(/(\n\|?\s*:?-{3,}.*\|\s*\n)(?!\|)/g, "$1\n");

      // 1-4) 표 다음에 바로 특수 불릿(🔹, ✅ 등)이 오면 확실히 분리
      text = text.replace(/(\n\|[^\n]*\n)(?=\s*(?:🔹|✅))/g, "$1\n");

      // 2) 선/후행 공백 및 과도한 빈 줄 정리(최종)
      text = text.trim().replace(/\n{3,}/g, "\n\n");

      // 3) Sanitizer
      const sanitizeAll = (html) =>
        DOMPurify.sanitize(html, {
          ALLOWED_TAGS: [
            "div",
            "p",
            "br",
            "strong",
            "b",
            "em",
            "u",
            "span",
            "ul",
            "ol",
            "li",
            "blockquote",
            "code",
            "pre",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
            "caption",
            "col",
            "colgroup",
            "hr",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "a",
          ],
          ALLOWED_ATTR: [
            "class",
            "rowspan",
            "colspan",
            "align",
            "width",
            "href",
            "title",
            "target",
            "rel",
          ],
        });

      // 4) ```html ... ``` 블록은 원시 HTML로 살리고, 나머지는 Markdown-it 렌더
      const re = /```html([\s\S]*?)```/gi;
      let out = "";
      let last = 0;
      let m;

      while ((m = re.exec(text)) !== null) {
        const before = text.slice(last, m.index);
        if (before) {
          const mdHtml = this._md.render(before);
          out += `<div class="md-block">${mdHtml}</div>`;
        }
        const rawHtml = (m[1] || "").trim();
        const safeHtml = sanitizeAll(rawHtml);
        out += `<div class="html-block">${safeHtml}</div>`;
        last = re.lastIndex;
      }

      const tail = text.slice(last);
      if (tail) {
        const mdHtml = this._md.render(tail);
        out += `<div class="md-block">${mdHtml}</div>`;
      }

      // 5) 출력 말단의 불필요한 <br>/공백 제거 + 최종 살균
      out = out.replace(/(<br\s*\/?>|\s)+$/i, "");
      out = out.replace(
        /(<table[\s\S]*?<\/table>)/gi,
        '<div class="table-scroll">$1</div>'
      );
      return sanitizeAll(out);
    },
    autoResize(e) {
      const el = e?.target || this.$refs.chatInput;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    },

    // ------ 키 입력 ------
    onCompositionStart() {
      this.isComposing = true;
    },
    onCompositionEnd() {
      this.isComposing = false;
    },
    onKeydown(e) {
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );
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
      if (name.match(/\.(pptx?|ppsx?)$/i)) return "📙";
      return "📄";
    },
    async handleFileUpload(e) {
      // 하위 호환(다른 경로에서 호출한다면)
      this.handleSelectFiles(e);
      if (e && e.target) e.target.value = "";
    },
    removeFile(index) {
      const url = this.previewURLs[index];
      if (url) URL.revokeObjectURL(url);
      this.previewURLs.splice(index, 1);
      this.uploadedFiles.splice(index, 1);
      this.$nextTick(this.scrollToBottom);
    },
    clearAllPreviews() {
      this.previewURLs.forEach((u) => u && URL.revokeObjectURL(u));
      this.previewURLs = [];
      this.uploadedFiles = [];
      this.$nextTick(this.scrollToBottom);
    },

    async buildAttachmentPayloadForMessage() {
      const result = [];
      for (let i = 0; i < this.uploadedFiles.length; i++) {
        const f = this.uploadedFiles[i];
        if (f.type.startsWith("image/")) {
          const dataUrl = await this.readFileAsDataURL(f);
          result.push({ kind: "image", src: dataUrl, name: f.name });
        } else {
          result.push({
            kind: "file",
            emoji: this.fileEmoji(f.name),
            name: f.name,
          });
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
    onDragEnter(e) {
      e.preventDefault();
      this.dragCounter++;
      this.isDraggingFile = true;
    },
    onDragLeave(e) {
      e.preventDefault();
      this.dragCounter--;
      if (this.dragCounter === 0) this.isDraggingFile = false;
    },
    onDragOver(e) {
      e.preventDefault();
      this.isDragOver = true;
    },
    onDrop(e) {
      e.preventDefault();
      this.dragCounter = 0;
      this.isDraggingFile = false;
      this.isDragOver = false;
      this.handleSelectFiles(e.dataTransfer?.files || []);
    },

    // ------ 설정 드로어 ------
    onSettingsClick() {
      this.openSettings();
    },
    // ✅ 태그 클릭 시 타깃 전달
    onDivisionTagClick() {
      this.openSettings("division");
    },
    //onJobTagClick() {
    //  this.openSettings('job');
    //},
    // ✅ target: 'division' | 'job' | undefined
    openSettings(target) {
      this.showSettingsModal = true;
      document.body.classList.add("lock-scroll"); // ✅ 스크롤 잠금
      document.body.style.overflow = "hidden";
      // ESC 닫기 핸들러
      this._escHandler = (e) => {
        if (e.key === "Escape") this.closeSettings();
      };
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
      document.body.style.overflow = "";
      document.body.classList.remove("lock-scroll"); // ✅ 스크롤 해제
      document.removeEventListener("keydown", this._escHandler);
    },

    // ✅ 스크롤 & 포커스
    scrollToDrawerTarget(target) {
      const drawer = this.$refs.drawer;
      if (!drawer || !target) return;

      // 타깃 엘리먼트 선택
      const el =
        target === "division"
          ? this.$refs.divisionField
          : target === "job"
          ? this.$refs.jobField
          : null;

      if (!el) return;

      // 스크롤 이동
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (_) {
        // 일부 브라우저 폴백
        const top =
          el.getBoundingClientRect().top +
          drawer.scrollTop -
          drawer.clientHeight / 2;
        drawer.scrollTo({ top, behavior: "smooth" });
      }

      // 포커스
      this.$nextTick(() => {
        if (target === "job") {
          // 입력창 포커스
          el.focus?.();
        } else if (target === "division") {
          // 선택된 라디오 또는 첫 라디오에 포커스
          const radio =
            el.querySelector("input[type=radio]:checked") ||
            el.querySelector("input[type=radio]");
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
            avatar: p.avatar || "", // ← 추가
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
        this.saveSettingsToStorage(); // 즉시 저장
      };
      reader.onerror = (err) => console.warn("avatar read error:", err);
      reader.readAsDataURL(file);
    },

    // ✅ 전화번호 하이픈 포맷터
    formatPhone(v) {
      const d = (v || "").replace(/\D/g, "").slice(0, 11);
      if (d.startsWith("02")) {
        if (d.length <= 2) return d;
        if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
        return `${d.slice(0, 2)}-${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
      } else {
        if (d.length <= 3) return d;
        if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
        return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
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

    applySuggestion(text, { send = false } = {}) {
      this.userInput = text;
      this.forceInitPrompts = false;
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
          "다른 옵션이나 대안이 있다면 알려주세요",
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
        `전화:${phoneDigits}`,
      ].filter(Boolean);
      return parts.join("-");
    },

    // ------ 전송 ------
    async sendMessage() {
      if (!this.canSend || this.isSending) return;
      this.forceInitPrompts = false; // 🔹 전송 시 초기 모드 종료
      this.isSending = true;

      this.isAwaitingFollowups = true;

      if (this.abortController) this.abortController.abort();
      this.abortController = new AbortController();

      if (!this.sessionId) this.sessionId = this.generateSessionId();

      const text = this.userInput.trim();
      const hasText = text.length > 0;
      const hasFiles = this.uploadedFiles.length > 0;
      const hasPDF = this.uploadedFiles.some((f) => /\.pdf$/i.test(f.name));
      const rawText = this.userInput.trim();

      const textForBubble = this.stripHiddenAll(rawText);
      // ✅ API에는 마커만 제거(내용은 살림)
      const textForApi = this.stripHiddenMarkers(rawText);

      // 사용자 버블(첨부+텍스트) 먼저 출력
      const attachmentsForBubble =
        await this.buildAttachmentPayloadForMessage();
      const userMsg = {
        role: "user",
        text: hasText ? textForBubble : hasFiles ? "(첨부 전송)" : "",
        attachments: attachmentsForBubble,
      };
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
      fd.append("question", hasText ? textForApi : "[FILE_UPLOAD_ONLY]");

      const categoryMeta = this.buildCategoryMetaString(); // 예: "영업-보험설계사-이름:홍길동-이메일:..."
      const parts = categoryMeta.split("-");

      // 맨 앞 값 = category
      let categoryValue = parts[0] || "";

      // 나머지 값 = job 필드에 붙여서 전달
      const jobValue = parts.slice(1).join("-");

      // ✅ 칩 클릭이 "보장분석"인 경우 category 앞에 보장분석 붙이기
      if (this.lastClickedChipTitle === "보장분석") {
        if (categoryValue) {
          categoryValue = `보장분석-${categoryValue}`;
        } else {
          categoryValue = "보장분석";
        }
      } else if (this.lastClickedChipTitle === "예상수수료") {
        if (categoryValue) {
          categoryValue = `시상분석-${categoryValue}`;
        } else {
          categoryValue = "시상분석";
        }
      } else if (this.lastClickedChipTitle === "상담스크립트") {
        if (categoryValue) {
          categoryValue = `스크립트-${categoryValue}`;
        } else {
          categoryValue = "스크립트";
        }
      } else if (this.lastClickedChipTitle === "교육자료") {
        if (categoryValue) {
          categoryValue = `교육자료-${categoryValue}`;
        } else {
          categoryValue = "교육자료";
        }
      } else if (this.lastClickedChipTitle === "마케팅콘텐츠") {
        if (categoryValue) {
          categoryValue = `마케팅콘텐츠-${categoryValue}`;
        } else {
          categoryValue = "마케팅콘텐츠";
        }
      } else if (this.lastClickedChipTitle === "스케줄작성") {
        if (categoryValue) {
          categoryValue = `스케줄작성-${categoryValue}`;
        } else {
          categoryValue = "스케줄작성";
        }
      } else if (this.lastClickedChipTitle === "고객공략법") {
        if (categoryValue) {
          categoryValue = `고객공략법-${categoryValue}`;
        } else {
          categoryValue = "고객공략법";
        }
      } else if (this.lastClickedChipTitle === "보험금확인") {
        if (categoryValue) {
          categoryValue = `보험금확인-${categoryValue}`;
        } else {
          categoryValue = "보험금확인";
        }
      }

      fd.append("category", categoryValue);
      fd.append("job", jobValue);

      // 파일 첨부
      this.uploadedFiles.forEach((f) => fd.append("files", f));

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
        loadingText: hasPDF ? "📄 PDF를 텍스트로 변환 중" : "",
      });
      this.scrollToBottom();

      // ⏳ 초 카운트 업데이트 타이머
      const timer = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        const msg = this.messages[botIndex];
        if (msg && msg.loading) {
          msg.loadingText =
            (hasPDF ? "📄 PDF를 텍스트로 변환 중" : "응답 생성 중") +
            ` ${seconds}s `; // 초 표시
          this.$forceUpdate(); // Vue 강제 렌더링
        } else {
          clearInterval(timer); // 로딩이 끝나면 타이머 정지
        }
      }, 1000);

      try {
        const res = await fetch(`${this.API_BASE}/chat/stream-file`, {
          method: "POST",
          body: fd,
          signal: this.abortController.signal,
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
            this.messages.splice(botIndex, 1, {
              role: "bot",
              text: botText,
              loading: false,
            });

            this.scrollToBottom();
          }
        }
      } catch (err) {
        const aborted = err?.name === "AbortError";
        this.messages.splice(botIndex, 1, {
          role: "bot",
          text: aborted
            ? "⏹️ 이전 요청을 취소했습니다."
            : "❌ 서버와 연결할 수 없습니다.",
          loading: false,
        });
        this.isAwaitingFollowups = false;
      } finally {
        clearInterval(timer); // 안전하게 타이머 정지
        this.isSending = false;
        const lastBot = this.messages[this.messages.length - 1]?.text || "";
        // ✅ 여기 추가: “웹페이지 만들기”에서 예약해둔 콜백이 있으면 실행
        if (typeof this.captureNextBot === "function") {
          try {
            this.captureNextBot(lastBot);
          } finally {
            this.captureNextBot = null;
          }
        }
        this.updateFollowupSuggestions({
          lastUser: hasText ? text : "",
          botText: lastBot,
        });
        this.$nextTick(() => {
          const container = this.$refs.messagesContainer;
          if (container) {
            container
              .querySelectorAll(
                ".chat-bubble.bot .md-block, .chat-bubble.bot .html-block"
              )
              .forEach((el) => this.colorizeStatus(el));
          }
        });
        this.lastClickedChipTitle = null;
      }
    },
  },
};
</script>

<style>
/* ===== Design Tokens (Vulk 톤) ===== */
:root {
  --aa-bg: #ffffff;
  --aa-text: #111827;
  --aa-muted: #6b7280;
  --aa-border: #e5e7eb;
  --aa-primary: #6366f1; /* indigo-500 */
  --aa-primary-2: #7c3aed; /* violet-600 */
  --aa-success: #10b981;
  --aa-error: #dc2626;
  --aa-radius: 12px;
  --aa-pill-radius: 999px;
  --aa-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  --siri-blue-1: #60a5fa; /* blue-400 */
  --siri-blue-2: #3b82f6; /* blue-500 */
  --siri-blue-3: #2563eb; /* blue-600 */
  /* Base UI Primary (참고) */
  --ui-primary: #3b82f6;

  /* 팔레트 ① */
  --tag-div-start: #6366f1;
  --tag-div-end: #8b5cf6; /* 구분 */
  --tag-job-start: #06b6d4;
  --tag-job-end: #10b981; /* 직업 */

  /* 공통 */
  --tag-text-on: #ffffff;
  --tag-border-div: rgba(99, 102, 241, 0.28);
  --tag-border-job: rgba(16, 185, 129, 0.28);
  --tag-gloss: 0.2; /* 0.18~0.28 사이 조절 */
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
  top: 0;
  left: 0;
  right: 0;
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
  overflow: hidden; /* ← 우측 튀어나옴 방지 */
}
.chat-logo {
  height: 32px;
  width: auto;
}
.header-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  flex: 1;
  position: relative;
}
.tag {
  font-size: 12px;
  padding: 4px 8px;
  background: #eef2ff;
  color: #3730a3;
  border-radius: var(--aa-pill-radius);
}
.settings-btn {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
}

/* ✅ 메시지 영역 */
.chat-messages {
  position: relative;
  flex: 1 1 auto;
  overflow-y: auto;
  background-color: var(--aa-bg);
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  margin-top: 56px; /* 헤더 */
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
  max-width: 90% !important;
}

/* ─────────────────────────────────────────
   1) 봇 버블/내용/마크다운 블록: 가로 스크롤 전면 차단
   ───────────────────────────────────────── */
.chat-bubble.bot,
.chat-bubble.bot .bubble-content,
.chat-bubble.bot .md-block,
.chat-bubble.bot .html-block {
  overflow-x: hidden !important; /* ← 전체 버블에 가로 스크롤 금지 */
  max-width: 100%;
  word-break: break-word;
  overflow-wrap: anywhere; /* 긴 토큰(URL 등) 강제 줄바꿈 */
}

/* 코드블록/인라인코드도 가로 스크롤 안 생기게 줄바꿈 */
.chat-bubble.bot pre,
.chat-bubble.bot code {
  white-space: pre-wrap;
  overflow-x: hidden;
  max-width: 100%;
}

/* 이미지가 버블을 넘지 않게 */
.chat-bubble.bot .bubble-content img {
  max-width: 100%;
  height: auto;
}

/* ① 봇 버블 전반: 가로 스크롤 금지 */
.chat-bubble.bot,
.chat-bubble.bot .bubble-content,
.chat-bubble.bot .md-block,
.chat-bubble.bot .html-block {
  overflow-x: hidden !important;
  max-width: 100%;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* ② 표만 스크롤: 래퍼 컨테이너 */
.chat-bubble.bot .table-scroll {
  overflow-x: auto; /* ← 가로 스크롤 허용 */
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  margin: 12px 0;
  padding: 8px; /* 카드 내부 여백 */
  background: #fff; /* 흰 배경 */
  border-radius: 8px; /* 라운드 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  scrollbar-gutter: stable both-edges; /* 스크롤바 점프 방지(대응 브라우저) */
}

/* ③ 표 자체는 내용 너비만큼 늘어나도록 */
.chat-bubble.bot .table-scroll table {
  width: max-content; /* 내용만큼 가로 확장 */
  border-collapse: collapse;
}

/* ④ 표 셀 가독성 */
.chat-bubble.bot .table-scroll th,
.chat-bubble.bot .table-scroll td {
  border: 1px solid #ddd;
  padding: 8px 10px;
  white-space: nowrap; /* 줄바꿈 금지 → 가로 스크롤 유도 */
  text-align: center;
}
.chat-bubble.bot .table-scroll th {
  background: #f9fafb;
  font-weight: 700;
}

/* ─────────────────────────────────────────
   2) 표(table)에서만 가로 스크롤 허용
   ───────────────────────────────────────── */
.chat-bubble.bot .md-block table,
.chat-bubble.bot .html-block table {
  display: block; /* 표 자체 스크롤 컨테이너 */
  width: max-content;
  max-width: none;
  overflow-x: auto !important;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;

  margin: 12px 0;
  border-collapse: collapse;

  /* 가독성 추가 스타일 */
  background: #fff; /* 흰색 배경 */
  border-radius: 8px; /* 라운드 모서리 */
  padding: 8px; /* 테두리 안쪽 여백 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 은은한 그림자 */
}

/* 표 셀 */
.chat-bubble.bot .md-block th,
.chat-bubble.bot .md-block td,
.chat-bubble.bot .html-block th,
.chat-bubble.bot .html-block td {
  border: 1px solid #ddd;
  padding: 8px 10px;
  text-align: center;
  white-space: nowrap;
}

/* 헤더 셀 스타일 */
.chat-bubble.bot .md-block th,
.chat-bubble.bot .html-block th {
  background: #f9fafb;
  font-weight: 700;
}

/* (선택) 모바일에서 스크롤바 터치 여유 */
@media (max-width: 480px) {
  .chat-bubble.bot .md-block table,
  .chat-bubble.bot .html-block table {
    padding-bottom: 2px;
  }
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
  padding: 1px 14px;
  border-radius: 12px;
  white-space: normal;
  line-height: 1.6;
  word-break: break-word;
  text-align: left;
  font-size: 15px;
}
.chat-bubble.user .bubble-content {
  background-color: #d1e9ff;
  color: #000;
  border-bottom-right-radius: 0;
  line-height: 1.6;
}
.chat-bubble.bot .bubble-content {
  background-color: #eeeeee;
  color: #000;
  border-bottom-left-radius: 0;
  line-height: 1.6;
}
.chat-bubble.user .bubble-content {
  padding: 1px 10px !important; /* 위·아래 1px, 좌우 10px */
  line-height: 1.25 !important; /* 행간 촘촘하게 */
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
  border: 1px solid var(--aa-border);
  border-radius: 8px;
  padding: 6px;
  background: #fff;
}
.bubble-attachment img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}
.file-emoji {
  font-size: 16px;
}
.file-label {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 600px;
  background: #fff;
  border: 1px solid var(--aa-border);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
}
.file-icon {
  font-size: 14px;
}
.file-name {
  max-width: 120px;
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

/* ✅ 입력창 컨테이너 */
.chat-input-container {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 600px;
  z-index: 1300;
  gap: 8px;
  display: flex;
  align-items: flex-end;
  padding: 8px 48px 8px 16px;
  box-sizing: border-box;

  background: transparent; /* 글로우/내부는 pseudo로 */
  border: none;
  border-radius: 12px;
  box-shadow: none;
}
@supports (padding: max(0px)) {
  .chat-input-container {
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }
}

/* 바깥 연한 블루 글로우 */
.chat-input-container::before {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    var(--siri-blue-1),
    var(--siri-blue-2),
    var(--siri-blue-3)
  );
  filter: blur(14px);
  opacity: 0.35; /* ← 연하게 */
  z-index: -2;
  transition: filter 0.25s ease, opacity 0.25s ease;
}

/* 내부는 완전 흰색 캡슐 */
.chat-input-container::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #ffffff; /* ← 흰색 */
  border: 1px solid rgba(59, 130, 246, 0.15); /* 아주 연한 블루 테두리 */
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 6px 16px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(59, 130, 246, 0.08);
  backdrop-filter: saturate(130%) blur(4px);
  -webkit-backdrop-filter: saturate(130%) blur(4px);
  z-index: -1;
}

/* 포커스 시 살짝만 강조 */
.chat-input-container:focus-within::before {
  opacity: 0.55;
  filter: blur(16px);
}
.chat-input-container:focus-within::after {
  border-color: rgba(59, 130, 246, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 8px 22px rgba(0, 0, 0, 0.08), 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* 드래그 오버도 연한 톤 유지 */
.chat-input-container.dragover {
  background: transparent;
  border: none;
}
.chat-input-container.dragover::before {
  opacity: 0.6;
  filter: blur(18px);
}

/* 입력창은 투명 → 내부 흰색이 보임 */
.chat-textarea {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 15px;
  padding: 8px 0;
  line-height: 1.5;
  min-height: 24px;
  max-height: 200px;
  letter-spacing: 0; /* 혹시 커스텀된 경우 초기화 */
  word-spacing: normal; /* 혹시 커스텀된 경우 초기화 */
  color: #0f172a;
  resize: none !important;
  -webkit-appearance: none;
  appearance: none;
}

.chat-input-container input,
.chat-input-container textarea {
  letter-spacing: 0px; /* 글자 간격을 기본보다 0.5px 좁힘 */
  word-spacing: -2px; /* 단어 간격을 기본보다 1px 좁힘 */
}

/* WebKit(Chrome/Edge/Safari)에서 모서리 리사이저 숨김 */
.chat-textarea::-webkit-resizer {
  display: none;
}
.chat-textarea::placeholder {
  color: #94a3b8;
  opacity: 0.95;
}

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
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.2);
}
.send-button:hover {
  background-color: #2563eb;
}
.send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

/* ✅ 드래그 오버레이 */
.drag-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(240, 248, 255, 0.6);
  backdrop-filter: blur(2px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-bg 1.5s infinite ease-in-out;
  pointer-events: none;
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

/* ✅ 에러 토스트 */
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

/* ===== 드로어 & 전환 ===== */

/* 백드롭: 우측 정렬 */
.aa-modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  background: rgba(0, 0, 0, 0.35);
  z-index: 3001;
}

/* 오른쪽 슬라이드 인 패널 */
.aa-drawer {
  width: min(520px, 92vw);
  height: 100vh;
  background: var(--aa-bg);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
  border-top-left-radius: var(--aa-radius);
  border-bottom-left-radius: var(--aa-radius);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 그라디언트 헤더 */
.drawer-header {
  background: linear-gradient(
    135deg,
    var(--aa-primary) 0%,
    var(--aa-primary-2) 100%
  );
  color: #fff;
  padding-bottom: 12px;
}
.drawer-appbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 4px 12px;
}
.drawer-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.icon-btn,
.icon-btn-spacer {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  border-radius: 10px;
  cursor: pointer;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.22);
}
.icon-btn-spacer {
  visibility: hidden;
}

.drawer-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10px 12px 12px 12px;
}
.avatar-lg {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  font-weight: 800;
  letter-spacing: 0.5px;
}
.drawer-subtitle {
  opacity: 0.95;
  margin-top: 8px;
  font-size: 13px;
}

/* 본문 */
.drawer-body {
  padding: 16px 16px 96px 16px; /* 하단 CTA 여유 */
  color: var(--aa-text);
}
.sec-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--aa-text);
  margin: 16px 0 8px 0;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

/* 입력 필드 */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-size: 13px;
  color: var(--aa-text);
  font-weight: 600;
}
.hint {
  font-size: 12px;
  color: var(--aa-muted);
}
.hint.center {
  text-align: center;
}
.pv-12 {
  padding: 12px 0;
}

.chip-title-with-icon {
  display: flex;
  align-items: center;
  gap: 4px; /* 아이콘과 텍스트 사이 간격 */
}

.chip-icon {
  font-size: 1.2em; /* 아이콘 크기 조정 */
  line-height: 1;
  margin-right: 4px; /* 아이콘과 타이틀 사이 간격 */
}

.input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--aa-border);
  border-radius: var(--aa-radius);
  padding: 10px 12px;
  box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
  transition: box-shadow 0.12s ease, border-color 0.12s ease,
    background 0.12s ease;
}
.input-wrap:focus-within {
  border-color: var(--aa-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
}
.input-wrap input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--aa-text);
}
.fi {
  font-style: normal;
  opacity: 0.8;
}

/* Pill 라디오 */
.pill-group {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 8px 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
  border-radius: var(--aa-pill-radius);
  cursor: pointer;
  user-select: none;
  transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease,
    transform 0.12s ease;
}
.pill:hover {
  transform: translateY(-1px);
}
.pill.active {
  background: rgba(99, 102, 241, 0.12);
  border-color: var(--aa-primary);
  color: #1f2a73;
}
.pill-text {
  font-size: 14px;
  font-weight: 600;
}
.vh {
  position: absolute !important;
  clip: rect(1px, 1px, 1px, 1px);
  width: 1px;
  height: 1px;
  overflow: hidden;
}

/* 하단 고정 CTA */
.drawer-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom)) 16px;
  background: linear-gradient(
    to top,
    rgba(255, 255, 255, 1),
    rgba(255, 255, 255, 0.92) 40%,
    rgba(255, 255, 255, 0)
  );
  border-top: 1px solid var(--aa-border);
  backdrop-filter: saturate(120%) blur(6px);
}
.btn {
  min-height: 44px;
  padding: 0 16px;
  border-radius: var(--aa-radius);
  border: 1px solid var(--aa-border);
  background: #fff;
  color: var(--aa-text);
  font-weight: 700;
  cursor: pointer;
}
.btn.primary {
  background: linear-gradient(
    135deg,
    var(--aa-primary) 0%,
    var(--aa-primary-2) 100%
  );
  color: #fff;
  border: none;
  box-shadow: var(--aa-shadow);
}
.btn.ghost {
  background: #fff;
}

/* 오른쪽 여백 채우는 스페이서 */
.header-spacer {
  flex: 1;
}

.header-right {
  display: flex;
  gap: 8px;
  align-self: stretch;
  align-items: flex-end;
  /* 폭 계산을 위해 축소 허용 */
  min-width: 0; /* ← 중요 */
}

/* 태그를 '시각적으로' 더 아래로 살짝 내림 */
:root {
  --tag-bottom-nudge: 6px;
} /* 필요시 4~10px 사이로 조절 */
.header-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 0; /* ← 기존 -3px 제거 */
  transform: translateY(var(--tag-bottom-nudge));
}
.settings-btn {
  align-self: center;
}

/* === Tag Base === */
/* 헤더 하단 정렬(유지) */
.header-right {
  display: flex;
  gap: 8px;
  align-self: stretch;
  align-items: flex-end;
}
.header-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 2px;
}
.settings-btn {
  align-self: center;
}

/* === Tag Base === */
.tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  padding: 6px 10px;
  border-radius: 999px;
  color: #fff;
  border: 1px solid transparent;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: saturate(140%) blur(4px);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.tag::before {
  content: none;
} /* ← 샾 제거 */
.tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14);
}
.tag > .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  opacity: 0.95;
}
.clickable {
  cursor: pointer;
}

.loading-label {
  font-size: 13px;
  margin-right: 6px;
  color: #374151; /* 회색계 톤 */
  vertical-align: middle;
}

/* 구분/직업 그라데이션 (유지) */
.tag-division {
  background: linear-gradient(135deg, var(--tag-div-start), var(--tag-div-end));
  border-color: rgba(99, 102, 241, var(--tag-border-alpha));
}
.tag-division > .dot {
  background: #ecfdf5;
}
.tag-job {
  background: linear-gradient(135deg, var(--tag-job-start), var(--tag-job-end));
  border-color: rgba(16, 185, 129, var(--tag-border-alpha));
}
.tag::after {
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, var(--tag-gloss)),
    rgba(255, 255, 255, 0)
  );
}
.tag-job > .dot {
  background: #ecfdf5;
}

/* === 헤더 아바타 버튼 === */
.header-avatar-btn {
  -webkit-appearance: none;
  appearance: none;
  padding: 0;
  line-height: 0;

  /* 보이는 링은 border 대신 바깥 그림자로 */
  border: none; /* ← 이게 표시 영역을 줄였습니다 */
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08),
    /* 얇은 외곽선 */ 0 4px 12px rgba(0, 0, 0, 0.08); /* 살짝 그림자 */

  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: inline-block; /* flex 불필요 */
  background: #fff;
}
.header-avatar-img {
  width: 100%;
  height: 100%;
  display: block; /* inline 여백 제거 */
  object-fit: cover; /* 꽉 채우되 왜곡 없음 */
  object-position: center; /* 중심 정렬 */
  border-radius: 0; /* 부모가 마스킹하므로 불필요 */
}
.header-avatar-fallback {
  font-size: 12px;
  font-weight: 800;
  color: #334155;
}

/* === 드로어 아바타(업로드 가능) === */
.avatar-lg-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  cursor: pointer;
}
.avatar-lg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.avatar-lg-fallback {
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #fff;
}

/* 접근성 대비 보정(다크) */
@media (prefers-color-scheme: dark) {
  .tag {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28);
  }
}

code {
  background: #f3f4f6;
  padding: 0 4px;
  border-radius: 6px;
}

/* ===== 전환 ===== */
.aa-slide-enter-active,
.aa-slide-leave-active {
  transition: opacity 0.2s ease;
}
.aa-slide-enter-from,
.aa-slide-leave-to {
  opacity: 0;
}
.aa-slide-enter-to,
.aa-slide-leave-from {
  opacity: 1;
}

/* 드로어 슬라이드 이동 */
.aa-slide-enter-from .aa-drawer,
.aa-slide-leave-to .aa-drawer {
  transform: translateX(100%);
}
.aa-drawer {
  transform: translateX(0);
  transition: transform 0.3s ease;
}

html,
body {
  height: 100%;
  overflow: hidden; /* ← 화면 전체 스크롤 금지 */
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
.suggested-prompts {
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
.suggested-prompts .chip {
  flex: 0 0 auto;
  border: 1px solid var(--aa-border);
  background: #fff;
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.2;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  white-space: nowrap;
}
.suggested-prompts .chip:hover {
  transform: translateY(-1px);
}
.suggested-prompts .chip:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* ✨ 최초 진입 2줄 칩: 화면에 2.5개 보이기 */
.suggested-prompts.initial .chip-2line {
  /* 2.5개 = 가용폭을 2.5로 분할. gap 보정(1.5*gap) */
  flex: 0 0 calc((100% - var(--gap) * 1.5) / 2.5);
  min-width: 0;
  white-space: normal; /* 두 줄 허용 */
  background: #ffffff; /* 밝은 회색 박스 */
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* 로딩 칩 */
.suggested-prompts .chip-loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--aa-border);
  background: #fff;
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.loading-dots {
  display: inline-flex;
  gap: 4px;
  height: 16px;
  align-items: baseline;
}
.loading-dots .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #666;
  animation: blink 1.4s infinite ease-in-out both;
}
.loading-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}
.loading-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

/* 2줄 칩 텍스트 컬러: 제목=파란계열, 설명=짙은 회색 */
.suggested-prompts.initial .chip-2line .chip-title {
  font-size: 14px;
  font-weight: 800;
  color: #2563eb; /* 파란색 계열 */
  margin-bottom: 4px;
}
.suggested-prompts.initial .chip-2line .chip-desc {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937; /* 검은 진한 회색 */
}

/* 업로드 종류 선택 메뉴 */
.picker-menu {
  position: absolute;
  left: 8px; /* + 버튼 근처 */
  bottom: 52px; /* 입력창 위로 살짝 */
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--aa-border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1301;
}
.picker-item {
  appearance: none;
  border: 1px solid var(--aa-border);
  background: #f9fafb;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.picker-item:hover {
  background: #f3f4f6;
}

/* 초기 질문 복귀 칩 스타일 */
.chip-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: #f3f4f6;
  border: 1px solid var(--aa-border);
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.chip-reset:hover {
  background: #e5e7eb;
}
.chip-reset svg {
  stroke: #2563eb; /* 파란 계열 강조 */
}

/* 초기 칩 컨테이너: 기본 1줄(가로 스크롤), 확장 시 줄바꿈 */
.suggested-prompts.initial {
  flex-wrap: nowrap;
}
.suggested-prompts.initial.expanded {
  flex-wrap: wrap; /* ✅ 2줄 이상 허용 */
  overflow-x: visible; /* 가로 스크롤 해제 */
}

/* 2줄 칩(기본 2.5개 보이기) */
.suggested-prompts.initial .chip-2line {
  flex: 0 0 calc((100% - var(--gap) * 1.5) / 2.5);
  min-width: 0;
}

/* 확장 시는 2열(=칩이 2줄 이상)로 자연스럽게 꽉 채우기 */
.suggested-prompts.initial.expanded .chip-2line {
  flex: 1 1 calc(50% - var(--gap)); /* ✅ 2열 */
}

/* 더 보기 칩 강조(점선 테두리) */
.suggested-prompts.initial .chip-more {
  border-style: dashed;
  background: #ffffff;
  border-color: #e5e7eb;
}

/* ✅ 래퍼를 '화면 높이'에 딱 맞추기 (100vh 대신) */
@supports (height: 100dvh) {
  .chat-wrapper {
    height: 100dvh;
  }
}
@supports not (height: 100dvh) {
  .chat-wrapper {
    height: 100svh;
  }
}

/* 반응형 */
@media (max-width: 768px) {
  .chat-messages {
    margin-bottom: 190px;
  }
  html,
  body {
    touch-action: manipulation;
  }
  .chat-bubble.bot {
    margin-left: 0; /* 왼쪽 여백 제거 */
    padding-left: 4px; /* 말풍선 안쪽 패딩은 최소 유지 */
  }

  .chat-bubble.bot .avatar {
    margin-right: 1px; /* 아바타와 말풍선 사이 간격 축소 */
    width: 1px; /* 아바타 크기도 모바일에 맞게 축소 */
    height: 1px;
  }
}

/* 모바일에서 살짝 더 내리고 싶다면 */
@media (max-width: 480px) {
  .header-tags {
    transform: translateY(4px);
  }
  .header-avatar-btn {
    width: 28px;
    height: 28px;
  }
  .tag {
    padding: 5px 8px;
    font-size: 11px;
  }
  .suggested-prompts.initial .chip-2line {
    flex: 0 0 calc((100% - var(--gap)) / 2.2);
  }
  .suggested-prompts.initial.expanded .chip-2line {
    flex: 1 1 calc(50% - var(--gap));
  }
}

/* 애니메이션 */
@keyframes blink {
  0%,
  80%,
  100% {
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
  10%,
  90% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
}
.enough {
  color: #2563eb; /* 파란색 */
  font-weight: 700;
}
.lack {
  color: #dc2626; /* 빨간색 */
  font-weight: 700;
}
.header-webbuilder-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.builder-actionbar {
  display: flex;
  gap: 8px;
  margin: 6px 0 0 40px;
}
.btn-mini {
  appearance: none;
  border: 1px solid var(--aa-border);
  background: #fff;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.btn-mini.ghost {
  background: #f9fafb;
}
.btn-mini.danger {
  background: #fff0f0;
  border-color: #f5c2c7;
  color: #b42318;
}

.builder-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.builder-item {
  border: 1px solid var(--aa-border);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.builder-meta {
  min-width: 0;
}
.builder-title {
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}
.builder-actions-row {
  display: flex;
  gap: 6px;
  flex: 0 0 auto;
}

.builder-nudge {
  position: fixed;
  bottom: 126px;
  left: 50%;
  transform: translateX(-50%);
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  color: #075985;
  padding: 8px 12px;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1002;
}
</style>
