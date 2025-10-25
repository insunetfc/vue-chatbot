<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <!-- 헤더 -->
        <header class="sheet-header">
          <h3 id="sheetTitle">고객질문 실시간답변 — 파일 첨부(여러개 가능)</h3>
          <button type="button" class="sheet-close" aria-label="닫기" @click="$emit('close')">✕</button>
        </header>

        <!-- 바디 -->
        <section class="sheet-body">
          <!-- 드래그&드롭 존 -->
          <div
            class="dropzone"
            :class="{ over: isOver }"
            @dragenter.prevent="onDragEnter"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
            @click="openDzPicker"
            role="button" tabindex="0"
            @keydown.enter.prevent="openDzPicker"
            @keydown.space.prevent="openDzPicker"
          >
            <div class="dz-icon">📎</div>
            <div class="dz-title">여기로 고객질문에 답할 약관/청약서/설계서를 파일을 드래그 또는 누르세요</div>
            <div class="dz-hint">여러개의 파일을 넣을 수 있고 파일이 없는 질문은 채팅창을 이용하세요</div>

            <!-- ✅ 드롭존 클릭용 미니 픽커 -->
            <div v-if="dzPickerOpen" class="dz-picker" role="dialog" aria-label="파일 유형 선택">
              <button class="dz-pick-btn" @click.stop="pickFromDz('docs')">📄 문서 선택</button>
              <button class="dz-pick-btn" @click.stop="pickFromDz('images')">🖼 이미지 선택</button>
              <button class="dz-pick-cancel" @click.stop="closeDzPicker">취소</button>
            </div>
            <div v-if="dzPickerOpen" class="dz-picker-mask" @click="closeDzPicker" />
            <input
              ref="fileInputDocs"
              type="file"
              style="display:none"
              multiple
              @change="onPicked"
              accept="
                application/pdf,
                text/plain,
                application/msword,
                application/vnd.openxmlformats-officedocument.wordprocessingml.document,
                application/vnd.ms-excel,
                application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
              "
            />
            <input
              ref="fileInputImages"
              type="file"
              style="display:none"
              multiple
              accept="image/*"
              @change="onPicked"
            />
          </div>

          <!-- 선택된 파일 목록 -->
          <div v-if="uploadedFiles && uploadedFiles.length" class="sheet-files">
            <div v-for="(file, index) in uploadedFiles" :key="index" class="sheet-file">
              <div class="file-kind">{{ resolveEmoji(file.name) }}</div>
              <div class="file-name" :title="file.name">{{ file.name }}</div>
              <div class="file-size">{{ (file.size/1024/1024).toFixed(2) }} MB</div>
              <button class="file-remove" @click="$emit('remove-index', index)" aria-label="삭제">삭제</button>
            </div>
          </div>

          <!-- ====== QnA 답변 구성(톤/길이/옵션) ====== -->
          <section class="sheet-presets">
            <div class="presets-header">
              <h4 class="presets-title">QnA 답변 설정</h4>
            </div>

            <!-- QnA 구성 스위치 -->
            <section class="qna-config" aria-label="QnA 답변 설정">
              <!-- 1) 답변 톤 -->
              <div class="seg-group" role="radiogroup" aria-label="답변 톤 선택">
                <div class="seg-label">톤</div>
                <div class="seg-switch">
                  <button
                    v-for="t in toneOptions"
                    :key="t.text"
                    type="button"
                    class="seg"
                    :class="{ active: selectedTone === t.text }"
                    @click="setTone(t.text)"
                  >
                    <div class="seg-main">{{ t.text }}</div>
                    <div class="seg-sub">{{ t.sub }}</div>
                  </button>
                </div>
                <div class="seg-help" v-if="selectedTonePrompt">{{ selectedTonePrompt }}</div>
              </div>

              <!-- 2) 답변 길이 -->
              <div class="seg-group" role="radiogroup" aria-label="답변 길이 선택">
                <div class="seg-label">길이</div>
                <div class="seg-switch">
                  <button
                    v-for="l in lengthOptions"
                    :key="l.text"
                    type="button"
                    class="seg"
                    :class="{ active: selectedLength === l.text }"
                    :aria-pressed="selectedLength === l.text"
                    @click="setLength(l.text)"
                    :title="l.desc"
                  >
                    {{ l.text }}
                  </button>
                </div>
                <div class="seg-help" v-if="selectedLengthPrompt">{{ selectedLengthPrompt }}</div>
              </div>

              <!-- 입력 패널 -->
              <div
                v-if="isAddToggleOpen"
                id="add-toggle-panel"
                class="add-preset-panel"
                role="region"
                aria-label="구성·가이드 사용자 항목 추가"
              >
                
                <div class="add-row">
                  <label class="add-label" for="newToggleTitle">제목</label>
                  <input
                    id="newToggleTitle"
                    v-model.trim="newToggleTitle"
                    class="add-input"
                    type="text"
                    maxlength="24"
                    placeholder="예) 요약먼저(강조)"
                    @keydown.enter.prevent="saveToggle()"
                  />
                </div>
                <div class="add-row">
                  <label class="add-label" for="newToggleDesc">상세내용</label>
                  <textarea
                    id="newToggleDesc"
                    v-model.trim="newToggleDesc"
                    class="add-textarea"
                    rows="3"
                    maxlength="500"
                    placeholder="이 항목(칩)의 역할/가이드를 적어주세요."
                    @keydown.enter.exact.prevent="saveToggle()"
                  ></textarea>
                </div>
                <div class="add-actions">
                  <button type="button" class="small" @click="cancelAddToggle">취소</button>
                  <button type="button" class="small primary" @click="saveToggle">저장</button>
                </div>
              </div>
              <!-- 3) 멀티 토글 -->
              <div class="toggles">
                <div
                  class="tog-group"
                  v-for="(grp, gi) in toggleGroups"
                  :key="gi"
                  :aria-label="grp.label"
                >
                  <!-- 헤더: 타이틀 + +내 항목 추가 -->
                  <div class="tog-head">
                    <div class="tog-title">{{ grp.label }}</div>
              
                    <!-- 사용자 칩 있음: 심플 버튼 -->
                    <button
                      v-if="hasUserToggles"
                      type="button"
                      class="small add-btn"
                      :ref="`addToggleBtn-${gi}`"
                      @click="toggleAddToggle(gi)"
                      :aria-expanded="isAddToggleOpenIndex === gi ? 'true' : 'false'"
                      :aria-controls="`add-toggle-panel-${gi}`"
                      title="사용자 항목 추가"
                    >
                      + 내 항목 추가
                    </button>
                  
                    <!-- 사용자 칩 없음: 프라이머리 버튼 -->
                    <button
                      v-else
                      type="button"
                      class="add-btn add-btn--primary"
                      :ref="`addToggleBtn-${gi}`"
                      @click="toggleAddToggle(gi)"
                      :aria-expanded="isAddToggleOpenIndex === gi ? 'true' : 'false'"
                      :aria-controls="`add-toggle-panel-${gi}`"
                      title="사용자 항목 추가"
                    >
                      <span class="add-btn__icon" aria-hidden="true">＋</span>
                      <span class="add-btn__label">내 항목 추가</span>
                    </button>
                  </div>
              
                  <!-- 입력 패널 -->
                  <div
                    v-if="isAddToggleOpenIndex === gi"
                    :id="`add-toggle-panel-${gi}`"
                    class="add-preset-panel"
                    role="region"
                    aria-label="구성·가이드 사용자 항목 추가"
                  >
                    <div class="add-row">
                      <label class="add-label" :for="`newToggleTitle-${gi}`">제목</label>
                      <input
                        :id="`newToggleTitle-${gi}`"
                        v-model.trim="newToggleTitle"
                        class="add-input"
                        type="text"
                        maxlength="24"
                        placeholder="예) 요약먼저(강조)"
                        @keydown.enter.prevent="saveToggle(gi)"
                      />
                    </div>
                    <div class="add-row">
                      <label class="add-label" :for="`newToggleDesc-${gi}`">상세내용</label>
                      <textarea
                        :id="`newToggleDesc-${gi}`"
                        v-model.trim="newToggleDesc"
                        class="add-textarea"
                        rows="3"
                        maxlength="500"
                        placeholder="이 항목(칩)의 역할/가이드를 적어주세요."
                        @keydown.enter.exact.prevent="saveToggle(gi)"
                      ></textarea>
                    </div>
                    <div class="add-actions">
                      <button type="button" class="small" @click="cancelAddToggle">취소</button>
                      <button type="button" class="small primary" @click="saveToggle(gi)">저장</button>
                    </div>
                  </div>
              
                  <!-- 칩 목록 -->
                  <div class="tog-chips" role="listbox" aria-multiselectable="true">
                    <button
                      v-for="item in grp.items"
                      :key="item.text"
                      class="chip chip--toggle"
                      :class="{ active: selectedToggles.has(item.text) }"
                      :aria-pressed="selectedToggles.has(item.text)"
                      @click="toggleToggle(item.text)"
                      :title="item.desc"
                    >
                      <span class="chip-text">{{ item.text }}</span>
                      <!-- 사용자 배지 및 삭제 -->
                      <span v-if="item._user" class="chip-tag user">사용자</span>
                      <span v-if="selectedToggles.has(item.text)" class="chip-check">✔</span>
                      <span
                        v-if="item._user"
                        class="chip-remove"
                        title="삭제"
                        @click.stop="removeUserToggle(item.text, gi)"
                      >✕</span>
                    </button>
                  </div>
              
                  <div class="seg-help" v-if="currentTogglePrompt">{{ currentTogglePrompt }}</div>
                </div>
              </div>
            </section>
          </section>
        </section>

        <!-- 토스트 -->
        <div v-if="showToastFlag" class="toast" role="status" aria-live="polite">
          {{ toastMsg }}
        </div>

        <!-- 풋터 -->
        <footer class="sheet-footer">
          <div v-show="false" class="memo-group">
            <label class="memo-label">자동 메모(읽기 전용)</label>
            <textarea
              class="sheet-textarea readonly"
              :value="autoMemo"
              readonly
              aria-readonly="true"
              rows="5"
              placeholder="[QnA 답변 스크립트 요청] 선택한 항목에 따라 자동 생성됩니다"
            ></textarea>
          </div>

          <div class="memo-group">
            <textarea
              v-model="userMemo"
              class="sheet-textarea"
              rows="3"
              placeholder="고객 질문을 입력하세요. 한번 입력 후에는 채팅창에 입력하면 이어서 답변이 가능해요."
              @input="handleUserMemoInput"
            ></textarea>
          </div>

          <div class="sheet-cta">
            <button class="btn ghost" type="button" @click="$emit('close')">취소</button>
            <button
              class="btn primary"
              type="button"
              :disabled="isSending || isSendDisabled"
              @click="handleSend"
            >
              첨부하고 답변 요청
            </button>
          </div>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script>
const LS_KEY = "analysis.userPresets";  
export default {
  name: "ShowAnalysisSheet",

  props: {
    uploadedFiles: { type: Array, required: true },
    isSending: { type: Boolean, default: false },
    fileEmoji: { type: Function, default: null },
    initialRecent: { type: Array, default: () => [] },
    initialFavorites: { type: Array, default: () => [] },
    limits: {
      type: Object,
      default: () => ({ maxFiles: 3, perFile: 50 * 1024 * 1024, total: 25 * 1024 * 1024 })
    },
    validExt: {
      type: [String, RegExp],
      default: "\\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$"
    }
  },
  emits: ["close", "send", "select-files", "remove-index", "memo-change", "update-favorites", "update-recent"],
  data() {
    return {
      /* 업로드/드래그 상태 */
      isOver: false,
      dzPickerOpen: false,

      /* 메모 */
      memo: "",
      userMemo: "",

      /* QnA 구성(톤/길이/토글) */
      toneOptions: [
        { text: "친근한", desc: "상담사 톤으로 부드럽고 공감 있게", sub: "초반응대" },
        { text: "전문가", desc: "보험 전문가처럼 신뢰감 있고 단정하게", sub: "상품설명" },
        { text: "간결한", desc: "불필요한 수식어 없이 핵심만", sub: "간단답변" },
        { text: "설득형", desc: "고객의 이익 강조, 콜투액션 포함", sub: "계약유도" }
      ],
      lengthOptions: [
        { text: "아주짧게", desc: "2~3문장 핵심만" },
        { text: "짧게", desc: "한 단락 요약" },
        { text: "중간", desc: "2~3단락, 목록 포함" },
        { text: "길게", desc: "상세 설명과 예시 포함" }
      ],
      toggleGroups: [
        {
          label: "구성·가이드",   // ← 한 섹션으로 통합
          items: [
            // ── 기존 '구성 옵션'
            { text: "요약먼저", desc: "첫 문장에 결론과 핵심 요약" },
            { text: "표형식", desc: "표 형식으로 작성" },
            { text: "목록형", desc: "불렛 또는 번호 목록으로 가독성 향상" },
            { text: "표준용어", desc: "보험 표준용어 사용, 약어 풀어서 설명" },
            { text: "예시포함", desc: "간단한 사례/숫자 예시 추가" },
  
            // ── 기존 '주의/가이드'
            { text: "주의사항", desc: "가입/유지/면책 등 주의사항 명시" },
            { text: "비교안내", desc: "현 보장 대비 변경점/차이점 강조" },
            { text: "다음단계", desc: "필요서류/상담예약 등 다음 행동 제시" }
          ]
        }
      ],
      selectedTone: "",
      selectedLength: "",
      selectedToggles: new Set(),
      lastToggleKey: "",    // 마지막으로 클릭한 토글 키

      /* 기타 상태 */
      toastMsg: "",
      showToastFlag: false,
      isAddToggleOpenIndex: null,  // 어떤 그룹에서 열려있는지 인덱스 저장
      newToggleTitle: "",
      newToggleDesc: "",
      pulsedOnce: false,   // ← 첫 진입 1회만
    };
  },
  mounted() {
    window.addEventListener('keydown', this._onEscClose);
    this.userMemo = this.extractManual(this.memo);
    this.loadUserToggles(); // 로컬스토리지에서 사용자 항목 불러오기
    this.composeMemo();
    
    this.$nextTick(() => {
      this.pulseAddButtonOnce();
    });
    
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this._onEscClose);
  },
  computed: {
    autoMemo() {
      return this.buildAutoText();
    },
    isSendDisabled() {
      const hasFiles = this.uploadedFiles && this.uploadedFiles.length > 0;
      return !hasFiles || this.isSending;
    },
    /* ✅ 선택된 키의 설명을 계산해 표시 */
    selectedTonePrompt() {
      const found = this.toneOptions.find(o => o.text === this.selectedTone);
      return found ? found.desc : "";
    },
    selectedLengthPrompt() {
      const found = this.lengthOptions.find(o => o.text === this.selectedLength);
      return found ? found.desc : "";
    },
    currentTogglePrompt() {
      if (!this.lastToggleKey || !this.selectedToggles.has(this.lastToggleKey)) {
        // 마지막 클릭 키가 없거나 해제된 경우: 남아있는 첫 선택 항목의 설명 사용
        const firstSelected = this.toggleGroups
          .flatMap(g => g.items)
          .find(i => this.selectedToggles.has(i.text));
        return firstSelected ? firstSelected.desc : "";
      }
      const item = this.toggleGroups.flatMap(g => g.items).find(i => i.text === this.lastToggleKey);
      return item ? item.desc : "";
    },
    hasUserToggles() {
      const items = this.toggleGroups?.[0]?.items || [];
      return items.some(i => i && i._user);
    },
  },
  watch: {
    userMemo() { this.composeMemo(); }
  },
  methods: {
    // 사용자 칩 존재 여부(전체 그룹 기준)
    anyUserToggleExists() {
      return (this.toggleGroups || []).some(grp =>
        (grp.items || []).some(i => i && i._user)
      );
    },
    // 첫 진입 1회 펄스
    pulseAddButtonOnce() {
      if (this.pulsedOnce) return;
      if (this.anyUserToggleExists()) return; // 사용자 칩이 있으면 스킵

      // 사용자 칩이 없는 첫 그룹의 버튼을 찾아 펄스
      const gi = 0; // 그룹이 1개라면 0 고정, 다수면 필요 시 findIndex 로직로 변경
      const btnRef = this.$refs[`addToggleBtn-${gi}`];

      // v-for + v-if 케이스 대응 (배열/단건 모두 처리)
      const btnEl = Array.isArray(btnRef) ? btnRef[0] : btnRef;
      if (btnEl) {
        btnEl.classList.add('notice-pulse');
        setTimeout(() => btnEl.classList.remove('notice-pulse'), 800);
        this._pulsedOnce = true;
      }
    },
    toggleAddToggle(gi) {
      this.isAddToggleOpenIndex = (this.isAddToggleOpenIndex === gi) ? null : gi;
      if (this.isAddToggleOpenIndex !== null) {
        this.$nextTick(() => {
          const el = this.$el.querySelector(`#newToggleTitle-${gi}`);
          el && el.focus();
        });
      }
    },
    cancelAddToggle() {
      this.isAddToggleOpenIndex = null;
      this.newToggleTitle = "";
      this.newToggleDesc = "";
    },
    saveToggle(gi) {
      const title = (this.newToggleTitle || "").trim();
      const desc  = (this.newToggleDesc  || "").trim();
      if (!title) { this.toast("제목을 입력하세요."); return; }
      if (!desc)  { this.toast("상세내용을 입력하세요."); return; }
  
      const group = this.toggleGroups?.[gi];
      if (!group) { this.toast("그룹을 찾을 수 없습니다."); return; }
  
      if ((group.items || []).some(i => i.text === title)) {
        this.toast("이미 존재하는 항목입니다."); return;
      }
  
      const newItem = { key: title, prompt: desc, _user: true };
      group.items.push(newItem);
  
      // 로컬스토리지 저장 (그룹별로 저장하려면 키를 그룹레이블로 분리)
      const all = this.getUserToggles();
      all.push(newItem);
      this.saveUserToggles(all);
  
      this.toast("저장되었습니다.");
      this.newToggleTitle = "";
      this.newToggleDesc = "";
      this.isAddToggleOpenIndex = null;
    },
    removeUserToggle(key, gi) {
      const group = this.toggleGroups?.[gi];
      if (!group) return;
      group.items = group.items.filter(i => i.text !== key);
  
      // 선택 해제
      if (this.selectedToggles.has(key)) {
        const s = new Set(this.selectedToggles);
        s.delete(key);
        this.selectedToggles = s;
        this.composeMemo();
      }
  
      const all = this.getUserToggles().filter(i => i.text !== key);
      this.saveUserToggles(all);
      this.toast("삭제되었습니다.");
    },
  
    // 로컬스토리지 유틸 (단일 키 사용)
    getUserToggles() {
      try {
        const raw = localStorage.getItem(LS_KEY) || "[]";
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    },
    saveUserToggles(list) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(list || []));
      } catch {
        /* ignore write errors */
      }
    },
    loadUserToggles() {
      try {
        const up = this.getUserToggles();
        if (Array.isArray(up) && up.length) {
          const baseKeys = new Set((this.toggleGroups?.[0]?.items || []).map(i => i.text));
          const toAppend = up
            .filter(i => i && i.text && !baseKeys.has(i.text))
            .map(i => ({ ...i, _user: true }));
          if (toAppend.length) this.toggleGroups[0].items.push(...toAppend);
        }
      } catch {
        /* ignore */
      }
    },
    /* QnA 톤/길이/토글 */
    setTone(key) { this.selectedTone = key; this.composeMemo(); },
    setLength(key) { this.selectedLength = key; this.composeMemo(); },
    toggleToggle(key) {
      const next = new Set(this.selectedToggles);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      this.selectedToggles = next;
      this.lastToggleKey = key;   // ✅ 마지막 클릭한 토글 기억
      this.composeMemo();
    },

    /* 자동 메모(프리셋 없이 QnA 설정만 포함) */
    buildAutoText() {
      const lines = [];
      lines.push("[QnA 답변 스크립트]");

      // 톤/길이
      if (this.selectedTone || this.selectedLength) {
        const tone = this.selectedTone ? `톤=${this.selectedTone}` : null;
        const len = this.selectedLength ? `길이=${this.selectedLength}` : null;
        lines.push(`- 스타일: ${[tone, len].filter(Boolean).join(", ")}`);
      }

      // 멀티 토글
      if (this.selectedToggles && this.selectedToggles.size) {
        const toggles = Array.from(this.selectedToggles);
        lines.push(`- 구성 옵션: ${toggles.join(", ")}`);
      }

      return lines.join("\n");
    },

    composeMemo() {
      const auto = this.autoMemo
        ? `[[HIDDEN_START]]${this.autoMemo}[[HIDDEN_END]]`
        : "";      // ✔ computed 사용
      const tail = (this.userMemo || "").trim();
      if (!auto && !tail) { this.memo = ""; return; }
      this.memo = auto && tail ? `${auto}\n\n[보조 메모]\n${tail}` : (auto || tail);
      this.$emit("memo-change", this.memo);
    },

    extractManual(full) {
      const mark = "[보조 메모]";
      const idx = full.indexOf(mark);
      if (idx >= 0) return full.slice(idx + mark.length).trim();
      return full.trim();
    },

    /* 전송 */
    handleSend() {
      this.$emit("send", { memo: this.memo, selected: [] });
    },

    /* 드롭존/파일 */
    openDzPicker() { this.dzPickerOpen = true; },
    closeDzPicker() { this.dzPickerOpen = false; },
    _onEscClose(e) { if (e.key === 'Escape') this.closeDzPicker(); },
    pickFromDz(kind) { this.triggerPick(kind); this.closeDzPicker(); },
    resolveEmoji(name = "") {
      if (typeof this.fileEmoji === "function") return this.fileEmoji(name);
      const lower = name.toLowerCase();
      if (lower.endsWith(".pdf")) return "📕";
      if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "📘";
      if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "📗";
      if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(lower)) return "🖼";
      if (lower.endsWith(".txt")) return "📄";
      return "📎";
    },
    triggerPick(kind) { if (kind === "images") this.$refs.fileInputImages?.click(); else this.$refs.fileInputDocs?.click(); },
    onPicked(e) {
      const files = this.normalizeFiles(e?.target?.files);
      this.validateAndEmit(files);
      if (e?.target) e.target.value = "";
    },
    onDrop(e) {
      this.isOver = false;
      const files = this.normalizeFiles(e?.dataTransfer?.files);
      this.validateAndEmit(files);
    },
    onDragEnter() { this.isOver = true; },

    _bytesToMB(b) { return Math.round(b / (1024 * 1024)); },
    normalizeFiles(listLike) {
      const arr = Array.from(listLike || []);
      const filtered = arr.filter(f => f && f.name);
      const seen = new Set();
      return filtered.filter(f => {
        const k = `${f.name}-${f.size}-${f.lastModified || 0}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    },
    validateAndEmit(listLike) {
      const incoming = this.normalizeFiles(listLike);
      if (!incoming.length) return;

      const maxFiles = this.limits?.maxFiles ?? Infinity;
      const perFile = this.limits?.perFile ?? Infinity;
      const total = this.limits?.total ?? Infinity;

      const validRe = this.validExt instanceof RegExp
        ? this.validExt
        : new RegExp(String(this.validExt), 'i');

      const baseList = Array.isArray(this.uploadedFiles) ? [...this.uploadedFiles] : [];
      const baseSeen = new Set(baseList.map(f => `${f.name}:${f.size}:${f.lastModified || 0}`));
      const currentTotal = baseList.reduce((s, f) => s + f.size, 0);

      const added = [];
      let addSize = 0;

      for (const f of incoming) {
        if (!validRe.test(f.name)) { this.toast(`❌ 지원 안함: ${f.name}`); continue; }
        if (f.size > perFile) { this.toast(`❌ ${this._bytesToMB(perFile)}MB 초과: ${f.name}`); continue; }
        if (baseList.length + added.length >= maxFiles) { this.toast(`❌ 최대 ${maxFiles}개 파일`); break; }
        if (currentTotal + addSize + f.size > total) { this.toast(`❌ 총 ${this._bytesToMB(total)}MB 초과`); break; }

        const key = `${f.name}:${f.size}:${f.lastModified || 0}`;
        if (baseSeen.has(key)) continue;

        added.push(f);
        addSize += f.size;
        baseSeen.add(key);
      }
      if (added.length) {
        this.$emit("select-files", { files: added, mode: "append", __fromChild: true });
      }
    },

    /* 메모 I/O */
    handleUserMemoInput() {
      this.composeMemo();
    },

    /* 토스트 */
    toast(msg = "") {
      this.toastMsg = msg;
      this.showToastFlag = true;
      window.clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => {
        this.showToastFlag = false;
      }, 1800);
    }
  }
};
</script>

<style scoped>
/* ===== 바텀시트 백드롭/패널 ===== */
.sheet-backdrop{ position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: flex-end; justify-content: center; z-index: 3002; }
.sheet-panel{
  width: min(600px, 100vw);
  max-height: 82vh;
  background: #fff;
  border-top-left-radius: 16px; border-top-right-radius: 16px;
  box-shadow: 0 -10px 30px rgba(0,0,0,.18);
  display: flex; flex-direction: column; overflow: hidden;
  transform: translateY(0); animation: sheet-up .22s ease-out;
  max-height: min(94vh, calc(100vh - env(safe-area-inset-top)));
  height: auto; -webkit-overflow-scrolling: touch;
  --footer-h: 88px;
}
@keyframes sheet-up{ from{ transform: translateY(12px); opacity:.98; } to{ transform: translateY(0); opacity:1; } }

/* ===== 헤더/바디/풋터 ===== */
.sheet-header{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #E5E7EB; }
.sheet-header h3{ font-size:16px; font-weight:800; margin:0; }
.sheet-close{ background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; cursor:pointer; }
.sheet-close:hover{ background:#e5e7eb; }
.sheet-body{ padding:12px 16px; overflow-y:auto; flex:1 1 auto; padding-bottom:var(--footer-h, 96px); -webkit-overflow-scrolling:touch; }

/* ===== 드롭존 ===== */
.dropzone{ border:2px dashed #94a3b8; border-radius:12px; padding:20px; text-align:center; background:#f8fafc; transition:border-color .15s, background .15s; position:relative; }
.dropzone.over{ border-color:#3b82f6; background:#eef6ff; }
.dz-icon{ font-size:24px; margin-bottom:6px; }
.dz-title{ font-weight:800; color:#0f172a; }
.dz-hint{ font-size:12px; color:#64748b; }

/* 미니 픽커 */
.dz-picker{ position:absolute; inset:50% auto auto 50%; transform:translate(-50%, -50%); display:grid; gap:8px; min-width:220px; padding:12px; border:1px solid #E5E7EB; border-radius:12px; background:#fff; box-shadow:0 12px 28px rgba(0,0,0,.14); z-index:3; animation:dz-pop .16s ease-out; }
.dz-pick-btn, .dz-pick-cancel{ padding:10px 12px; border-radius:10px; border:1px solid #E5E7EB; background:#fff; cursor:pointer; font-weight:700; }
.dz-pick-btn:hover{ background:#F3F4F6; }
.dz-pick-cancel{ color:#6B7280; }
.dz-picker-mask{ position:absolute; inset:0; background:rgba(0,0,0,.04); z-index:2; }
@keyframes dz-pop{ from{ transform:translate(-50%, -46%); opacity:.0; } to{ transform:translate(-50%, -50%); opacity:1; } }

/* ===== 파일 리스트 ===== */
.sheet-files{ margin-top:12px; display:grid; gap:8px; }
.sheet-file{ display:grid; grid-template-columns:32px 1fr auto auto; align-items:center; gap:8px; padding:8px; border:1px solid #e5e7eb; border-radius:10px; background:#fff; }
.file-kind{ width:32px; text-align:center; }
.file-name{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.file-size{ font-size:12px; color:#64748b; }
.file-remove{ border:1px solid #e5e7eb; background:#f9fafb; border-radius:8px; padding:4px 8px; cursor:pointer; }
.file-remove:hover{ background:#f3f4f6; }

/* ===== QnA Config ===== */
.sheet-presets{ margin-top:16px; padding:12px; border:1px solid #E5E7EB; border-radius:12px; background:#FBFDFF; }
.presets-header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; position:sticky; top:0; background:#FBFDFF; padding-top:8px; margin-top:-8px; z-index:2; }
.presets-title{ margin:0; font-size:14px; font-weight:800; color:#0F172A; }

.qna-config{ margin-top:12px; padding:12px; border:1px solid #E5E7EB; border-radius:12px; background:#FFFFFF; }
.seg-group{
  display: grid;
  grid-template-columns: 48px 1fr;  /* 라벨 폭 축소 */
  gap: 8px 10px;
  align-items: start;         /* ★ 핵심 */
  margin-bottom: 10px;
}
.seg-label{ font-size:13px; font-weight:800; color:#0F172A; }
.seg-switch{ display:inline-flex; flex-wrap:wrap; gap:6px; }
.seg-switch .seg{ appearance:none; border:1px solid #E5E7EB; background:#fff; padding:6px 10px; border-radius:999px; font-weight:800; font-size:13px; cursor:pointer; transition:background .12s ease, box-shadow .12s ease, border-color .12s ease; }
.seg-switch .seg:hover{ background:#F3F4F6; }
.seg-switch .seg.active{ background:linear-gradient(135deg, #60A5FA, #2563EB); color:#fff; border-color:transparent; box-shadow:0 4px 12px rgba(37,99,235,.20); }

/* ✅ 선택 설명 텍스트 */
.seg-help{
  grid-column: 1 / -1;        /* 라벨+스위치 전체 폭 차지 */
  margin-top: 6px;
  font-size: 12px;
  color: #6B7280;
  line-height: 1.5;
  word-break: keep-all;
}

.seg {
  display:flex; flex-direction:column; align-items:center;
  min-width:72px; padding:6px 10px;
}
.seg-main { font-weight:700; font-size:13px; }
.seg-sub { font-size:11px; color:#6B7280; margin-top:2px; }


/* 토글 */
.toggles{ margin-top:6px; display:grid; gap:10px; }
.tog-group{ border:1px dashed #E5E7EB; background:#FBFDFF; border-radius:10px; padding:10px; }
.tog-title{ font-size:13px; font-weight:800; color:#1F2937; margin-bottom:8px; }
.tog-chips{ display:flex; flex-wrap:wrap; gap:8px; }
.chip{ border:1px solid #E5E7EB; background:#fff; padding:6px 10px; border-radius:999px; cursor:pointer; font-weight:700; position:relative; display:inline-flex; align-items:center; gap:6px; }
.chip--toggle{ padding-right:12px; }
.chip--toggle.active{ border-color:#2563EB; box-shadow:0 0 0 3px rgba(37,99,235,.12); }
.chip-check{ margin-left:4px; font-weight:800; color:#16A34A; font-size:13px; }

/* 토스트 */
.toast{ position:fixed; left:50%; bottom:calc(16px + env(safe-area-inset-bottom)); transform:translateX(-50%); background:linear-gradient(135deg, #60A5FA, #2563EB); color:#fff; padding:10px 14px; border-radius:12px; font-size:13px; font-weight:700; z-index:4000; box-shadow:0 4px 16px rgba(59,130,246,.25); animation:toast-in .18s ease-out; }
@keyframes toast-in{ from{ transform:translate(-50%, 6px); opacity:0; } to{ transform:translate(-50%, 0); opacity:1; } }

/* 풋터 */
.sheet-cta{ display:flex; gap:8px; justify-content:flex-end; }
.sheet-cta .btn{ min-height:40px; padding:0 14px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; font-weight:700; cursor:pointer; }
.sheet-cta .btn.primary{ background:linear-gradient(135deg, #60A5FA, #2563EB); color:#fff; border:none; box-shadow:0 6px 16px rgba(59,130,246,.20); }
.sheet-cta .btn.primary:disabled{ opacity:.6; cursor:not-allowed; }

/* 텍스트영역 공통 */
.sheet-textarea{
  width:100%;
  max-width:100%;
  box-sizing:border-box;
  border:1px solid #e5e7eb;
  border-radius:10px;
  padding:8px 10px;
  outline:none;
  resize:vertical;
  font-size:14px;
  line-height:1.5;
  overflow-x:hidden;
  white-space:pre-wrap;
  word-break:break-word;
}
.sheet-textarea.readonly{ background:#F9FAFB; color:#111827; cursor:not-allowed; }

/* ✅ 풋터 그리드 최소폭 0 처리 */
.sheet-footer{
  position:sticky; bottom:0; z-index:5; flex:0 0 auto;
  border-top:1px solid #E5E7EB;
  padding:10px 12px calc(10px + env(safe-area-inset-bottom));
  display:grid; grid-template-columns:1fr; gap:10px;
  background:linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,.96));
  box-shadow:0 4px 16px rgba(0,0,0,.06);
  min-height:72px;
}
.sheet-footer > *{ min-width:0; }
.sheet-footer .memo-group{ min-width:0; }
.tog-head{
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:8px;
}
.add-btn{
  display:inline-flex; align-items:center; gap:8px;
  height:30px; padding:0 8px; border-radius:12px;
  border:1px solid #E5E7EB; background:#fff; font-weight:800; font-size:13px; cursor:pointer;
}
.add-btn:hover{ background:#F3F4F6; }
.add-btn--primary{
  background: linear-gradient(#fff, #fff) padding-box,
              linear-gradient(135deg, #60A5FA, #2563EB) border-box;
  border: 2px solid transparent;
  box-shadow: 0 2px 10px rgba(59,130,246,.12);
}
.add-btn__icon{ font-size:16px; line-height:1; }

.add-preset-panel{
  margin-bottom:10px; /* 칩들과 간격 */
  padding:12px; border:1px dashed #E5E7EB; border-radius:12px; background:#fff;
}
.add-row{ display:grid; grid-template-columns:64px 1fr; gap:8px; align-items:start; margin-bottom:8px; }
.add-label{ font-size:12px; font-weight:700; color:#6B7280; padding-top:8px; }
.add-input,.add-textarea{
  width:100%; box-sizing:border-box; border:1px solid #E5E7EB; border-radius:10px; padding:8px 10px; outline:none; font-size:14px;
}
.add-input:focus,.add-textarea:focus{ border-color:#93C5FD; box-shadow:0 0 0 3px rgba(147,197,253,.35); }
.add-actions{ display:flex; gap:8px; justify-content:flex-end; }
.small.primary{ background:linear-gradient(135deg,#60A5FA,#2563EB); color:#fff; border:none; }

.chip-tag.user{
  border:1px solid #BFDBFE; background:linear-gradient(180deg,#EFF6FF,#FFFFFF);
  color:#1D4ED8; font-size:11px; font-weight:800; line-height:1; padding:2px 6px; border-radius:999px;
  margin-left:6px;
}
.chip-remove{
  margin-left:2px; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center;
  font-size:12px; color:#6B7280; border-radius:50%;
}
.chip-remove:hover{ background:#F3F4F6; color:#DC2626; }
/* 액션 영역: 오른쪽 정렬 */
.add-actions{
  margin-top: 6px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;  /* ← 우측 정렬 */
}

/* 작은 캡슐 버튼 공통 */
.small{
  padding: 4px 8px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}
.small:hover{ background:#F3F4F6; }

/* 프라이머리(저장) — 샘플과 동일 그라데이션 */
.small.primary{
  background: linear-gradient(135deg, #60A5FA, #2563EB);
  color:#fff;
  border:none;
  box-shadow: 0 2px 8px rgba(59,130,246,.16);
}
.small.primary:hover{
  filter: brightness(1.03);
}
.small:disabled,
.small.primary:disabled{
  opacity:.6; cursor:not-allowed;
}

/* 첫 진입 강조 */
.notice-pulse{
  animation: addbtn-pop .8s ease-out 1;
}

@keyframes addbtn-pop{
  0%   { transform: scale(.98); box-shadow: 0 0 0 0 rgba(59,130,246,.0); }
  50%  { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(59,130,246,.12); }
  100% { transform: scale(1);    box-shadow: 0 2px 10px rgba(59,130,246,.12); }
}

</style>
