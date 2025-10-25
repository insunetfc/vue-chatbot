<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <!-- 헤더 -->
        <header class="sheet-header">
          <h3 id="sheetTitle">보장분석 — 파일 첨부</h3>
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
              <div class="dz-title">여기로 파일을 드래그하세요</div>
              <div class="dz-hint">또는 아래 버튼으로 선택</div>
            
              <!-- ✅ 드롭존 클릭용 미니 픽커 -->
              <div
                v-if="dzPickerOpen"
                class="dz-picker"
                role="dialog"
                aria-label="파일 유형 선택"
              >
                <button class="dz-pick-btn" @click.stop="pickFromDz('docs')">📄 문서 선택</button>
                <button class="dz-pick-btn" @click.stop="pickFromDz('images')">🖼 이미지 선택</button>
                <button class="dz-pick-cancel" @click.stop="closeDzPicker">취소</button>
              </div>
            
              <!-- 메뉴 바깥 클릭 닫힘용 반투명 마스크 -->
              <div v-if="dzPickerOpen" class="dz-picker-mask" @click="closeDzPicker" />
            </div>

          <!-- 선택 버튼 -->
          <div class="sheet-actions">
            <button type="button" class="btn" @click="triggerPick('docs')">📄 문서 선택</button>
            <button type="button" class="btn" @click="triggerPick('images')">🖼 이미지 선택</button>

            <!-- 숨김 input: 문서 -->
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
            <!-- 숨김 input: 이미지 -->
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

          <!-- ====== 신규: 분석 요청 프리셋/옵션 ====== -->
          <section class="sheet-presets">
            <div class="presets-header">
              <h4 class="presets-title">
                분석 내용 선택 (중복 선택 가능)
                <span class="count"><strong>{{ activePresets.length }}</strong>개</span>
              </h4>
            </div>
            <!-- 프리셋 칩(멀티 토글) -->
            <div class="preset-chips" role="listbox" aria-label="분석 프리셋(복수 선택)">
              <button
                v-for="(p, i) in presets"
                :key="i"
                class="chip"
                :class="{ active: isActivePreset(p), focused: activeDetail === p.text }"
                @click="togglePreset(p)"              
                @dblclick="focusDetail(p.text)"       
                :aria-pressed="isActivePreset(p)"
              >
                {{ p.text }}
              </button>
            </div>
            
            <!-- 단일 상세보기: activeDetail 이 설정된 경우만 노출 -->
            <div
              v-if="activeDetailPreset"
              class="chip-desc-panel"
              role="region"
              aria-live="polite"
              aria-label="선택 항목 상세보기"
            >
              <div class="chip-desc-title">
                {{ activeDetailPreset.text }}
                <div class="spacer"></div>
                <!-- 상세 전환: 이전/다음(선택된 항목 내) -->
                <button class="small" @click="detailPrev" :disabled="!canPrev">이전</button>
                <button class="small" @click="detailNext" :disabled="!canNext">다음</button>
                <button class="chip-desc-close" @click="clearDetail" aria-label="상세 닫기">닫기</button>
              </div>
              <div class="chip-desc-body">
                {{ activeDetailPreset.desc }}
              </div>
            </div>
            
            <!-- 칩 아래 고정 설명 패널(모바일/접근성) -->
            <div v-if="descPanelPinned" class="chip-desc-panel" id="chip-desc" aria-live="polite" role="region" aria-label="프리셋 설명">
              <div class="chip-desc-title">
                <span class="chip-desc-icon" aria-hidden="true">ⓘ</span>
                {{ descPanelTitle }}
                <button class="chip-desc-close" @click="closeDescPanel" aria-label="설명 닫기">✕</button>
              </div>
              <div class="chip-desc-body">
                {{ descPanelText }}
              </div>
            </div>
          </section>
        </section>

        <!-- 풋터 -->
        <footer class="sheet-footer">
          <!-- 자동 메모: 선택한 프리셋/옵션으로 자동 생성 (읽기 전용) -->
          <div v-show="false" class="memo-group">
            <label class="memo-label">자동 메모(읽기 전용)</label>
            <textarea
              class="sheet-textarea readonly"
              :value="autoMemo"
              readonly
              aria-readonly="true"
              rows="5"
              placeholder="[분석 요청] 선택한 항목에 따라 자동 생성됩니다"
            ></textarea>
          </div>
        
          <!-- 보조 메모: 사용자가 자유롭게 입력/수정 -->
          <div class="memo-group">
            <textarea
              v-model="userMemo"
              class="sheet-textarea"
              rows="3"
              placeholder="추가 요청사항을 입력하세요"
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
              첨부하고 분석 요청
            </button>
          </div>
        </footer>

      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "ShowAnalysisSheet",
  props: {
    uploadedFiles: { type: Array, required: true },
    isSending: { type: Boolean, default: false },
    fileEmoji: { type: Function, default: null },
    initialRecent: { type: Array, default: () => [] },
    initialFavorites: { type: Array, default: () => [] },
  },
  emits: ["close", "send", "select-files", "remove-index", "memo-change", "update-favorites", "update-recent"],
  data() {
    return {
      isOver: false,
      hoverDesc: "",
      descPanelPinned: false,
      descPanelText: "",
      descPanelTitle: "",
      descOpenId: null,
      dzPickerOpen: false,
      memo: "",
      userMemo: "",   // 사용자가 편집하는 보조 메모
      presets: [
        { text: "상품표", desc: "현재 증권 기준 전체 상품표 생성" },
        { text: "담보표", desc: "현재 증권 기준 전체 담보표 생성 및 부족 항목 표시" },
        { text: "부족담보", desc: "현재 증권 기준 부족 항목 표시" },
        { text: "3대진단", desc: "진단금 위주 간결 요약" },
        { text: "갱신구분", desc: "보장별로 갱신형인지 비갱신형인지 구분하여 표기하고, 갱신 주기와 보험료 변동 가능성을 함께 안내" },
        { text: "연령직업", desc: "피보험자의 현재 연령대와 직업군의 위험등급을 반영해, 필요한 보장과 불필요한 보장을 선별하여 추천" },
        { text: "예산별안", desc: "가입자가 설정한 예산 범위에 따라 저(低)·중(中)·고(高) 보장안 3가지를 비교표 형태로 제시" },
        { text: "수술비 중복 제거", desc: "여러 특약에서 동일 수술에 대한 보장이 중복되는 경우를 찾아 하나로 정리하고, 실제 지급 가능 금액을 계산" },
        { text: "후유장해 증액 검토", desc: "질병이나 상해 후유장해 보장 한도가 현재 생활·직업 리스크에 비해 충분한지 검토하고 필요한 증액안을 제시" },
        { text: "사망 증액 검토", desc: "사망보험금 한도가 유가족 생활비, 대출 상환, 장례비 등을 고려했을 때 충분한지 검토하고 필요한 증액안을 제시" },
        { text: "갱신 스케줄", desc: "담보별 갱신 시점, 갱신 주기, 갱신 시 예상 보험료 인상률 범위를 표로 정리" },
        { text: "무해지형 확인", desc: "무해지환급형 여부와 해지환급금 지급 조건을 확인하고, 보장과 환급 간의 트레이드오프를 설명" },
        { text: "특약(면책/감액) 확인", desc: "특약별 면책기간, 감액기간 및 지급 제한 조건을 약관에서 추출하여 요약" },
        { text: "암보장 세부", desc: "일반암, 고액암, 유사암으로 구분하여 각 진단금, 수술비, 치료비 한도를 세부적으로 표시" },
        { text: "뇌/심장 세부", desc: "뇌혈관질환, 허혈성심장질환 각각에 대해 진단금·수술비·입원비를 구분해 보장 범위와 금액을 표시" },
        { text: "운전자 세부", desc: "교통사고 처리 지원금, 벌금, 변호사 선임비, 사고처리지원금 등 운전자보험의 핵심 담보별 보장 범위와 금액을 세부적으로 표시" },
        { text: "화재 세부", desc: "주택·상가·창고 등 피보험 건물에 대한 화재, 폭발, 파손 보장 한도와 손해배상, 부속물·시설물 보장 내역을 세부적으로 표시" }
      ],
      selectedPresets: [],   // (사용 안 하면 제거 가능)
      selectedOptions: [],
      recentRequests: [],
      favorites: [],
      dragIndex: null,
      overIndex: null,
      kbGrabIndex: null,
      activePresets: [],     // [{text, desc}, ...]
      openMap: {},           // (사용 안 하면 제거 가능)
      activeDetail: null,    // 상세 표시할 preset.text
    };
  },
  mounted() {
    window.addEventListener('keydown', this._onEscClose);
    // 초기 합성
    this.userMemo = this.extractManual(this.memo);
    this.composeMemo();
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this._onEscClose);
  },
  computed: {
    autoMemo() {
      return this.buildAutoText(); // 선택된 프리셋/옵션 기반 자동 포맷
    },
    selectedList() {
      return this.activePresets.map(p => p.text);
    },
    activeDetailPreset() {
      if (!this.activeDetail) return null;
      return this.activePresets.find(p => p.text === this.activeDetail) || null;
    },
    _detailIndex() {
      return this.activePresets.findIndex(p => p.text === this.activeDetail);
    },
    canPrev() { return this._detailIndex > 0; },
    canNext() { return this._detailIndex >= 0 && this._detailIndex < this.activePresets.length - 1; },
    isSendDisabled() {
      const hasFiles = this.uploadedFiles && this.uploadedFiles.length > 0;
      const hasAnyText = !!this.memo.trim();   // ✅ previewText 제거 반영
      return !(hasFiles || hasAnyText) || this.isSending;
    },
  },
  watch: {
    // 초기 주입
    initialRecent: {
      immediate: true,
      handler(v) { this.recentRequests = (v && v.length ? v : []).slice(0, 10); }
    },
    initialFavorites: {
      immediate: true,
      handler(v) { this.favorites = Array.isArray(v) ? [...v] : []; }
    },
    // ✅ 선택 변화 시 메모 자동 합성
    activePresets: {
      deep: true,
      handler() { this.composeMemo(); }
    },
    userMemo() {
      this.composeMemo();
    }
  },
  methods: {
    detailPrev() {
      const i = this._detailIndex;             // 현재 상세 칩의 인덱스
      if (i > 0) {
        this.activeDetail = this.activePresets[i - 1].text;
      }
    },
    detailNext() {
      const i = this._detailIndex;
      if (i >= 0 && i < this.activePresets.length - 1) {
        this.activeDetail = this.activePresets[i + 1].text;
      }
    },
    /* ===== 메모 합성 ===== */
    extractManual(full) {
      const mark = "[보조 메모]";
      const idx = full.indexOf(mark);
      if (idx >= 0) return full.slice(idx + mark.length).trim();
      if (full.includes("[분석 요청]")) return "";
      return full.trim();
    },

    /* ===== 드롭존/파일 ===== */
    openDzPicker() { this.dzPickerOpen = true; },
    closeDzPicker() { this.dzPickerOpen = false; },
    _onEscClose(e){ if (e.key === 'Escape') this.closeDzPicker(); },
    pickFromDz(kind){ this.triggerPick(kind); this.closeDzPicker(); },
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
    triggerPick(kind) {
      if (kind === "images") this.$refs.fileInputImages?.click();
      else this.$refs.fileInputDocs?.click();
    },
    onPicked(e) {
      const files = e?.target?.files;
      if (files && files.length) this.$emit("select-files", files);
      if (e?.target) e.target.value = "";
    },
    onDragEnter() { this.isOver = true; },
    onDrop(e) {
      this.isOver = false;
      const files = e?.dataTransfer?.files;
      if (files && files.length) this.$emit("select-files", files);
    },

    /* ===== 선택/상세 ===== */
    isActivePreset(preset) {
      return this.activePresets.some(x => x.text === preset.text);
    },
    togglePreset(preset) {
      const idx = this.activePresets.findIndex(x => x.text === preset.text);
      if (idx >= 0) {
        this.activePresets.splice(idx, 1);
        if (this.activeDetail === preset.text) {
          const next = this.activePresets[idx] || this.activePresets[idx - 1];
          this.activeDetail = next ? next.text : null;
        }
      } else {
        this.activePresets.push(preset);
        this.activeDetail = preset.text;
      }
      this.composeMemo();
    },
    focusDetail(text) {
      if (!this.activePresets.some(p => p.text === text)) {
        const found = this.presets.find(p => p.text === text);
        if (found) this.activePresets.push(found);
      }
      this.activeDetail = text;
      this.composeMemo();
    },
    clearDetail() { this.activeDetail = null; },

    /* ===== (선택) 재정렬 유틸 — 선택 리스트 UI를 쓰지 않으면 미사용 ===== */
    onDragStart(i, e) {
      this.dragIndex = i; this.overIndex = i;
      if (e?.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }
    },
    onDragOver(i) {
      this.overIndex = i;
      if (this.dragIndex !== null && this.dragIndex !== i) {
        const newList = this.moveIndex(this.selectedList, this.dragIndex, i);
        this.replaceSelectedList(newList);
        this.dragIndex = i;
      }
    },
    onDragLeave(i) { if (this.overIndex === i) this.overIndex = null; },
    onDropReorder(dropIndex) {
      if (this.dragIndex === null || dropIndex === null) return;
      if (this.dragIndex === dropIndex) return;
      const newList = this.moveIndex(this.selectedList, this.dragIndex, dropIndex);
      this.replaceSelectedList(newList);
      this.dragIndex = null; this.overIndex = null;
    },
    onDragEnd() { this.dragIndex = null; this.overIndex = null; },
    toggleKeyboardGrab(i) { this.kbGrabIndex = this.kbGrabIndex === i ? null : i; },
    keyboardMove(i, delta) {
      if (this.kbGrabIndex !== i) return;
      const to = i + delta;
      if (to < 0 || to >= this.selectedList.length) return;
      const newList = this.moveIndex(this.selectedList, i, to);
      this.replaceSelectedList(newList);
      this.kbGrabIndex = to;
    },
    moveIndex(arr, from, to) { const a = [...arr]; const item = a.splice(from, 1)[0]; a.splice(to, 0, item); return a; },
    moveUp(idx) { if (idx <= 0) return; const n = this.moveIndex(this.selectedList, idx, idx - 1); this.replaceSelectedList(n); },
    moveDown(idx) { if (idx >= this.selectedList.length - 1) return; const n = this.moveIndex(this.selectedList, idx, idx + 1); this.replaceSelectedList(n); },
    removeAt(idx) { const list = [...this.selectedList]; list.splice(idx, 1); this.replaceSelectedList(list); },

    /* ===== 메모 I/O ===== */
    handleMemoInput() {
      this.userMemo = this.extractManual(this.memo);
      this.$emit("memo-change", this.memo);
    },

    /* ===== 외부 재배치 동기화 ===== */
    replaceSelectedList(newList) {
      const presetSet = new Set(this.presets.map(p => p.text));
      const newPresets = newList.filter(t => presetSet.has(t));
      this.activePresets = newPresets
        .map(t => this.presets.find(p => p.text === t))
        .filter(Boolean);
      this.selectedOptions = newList.filter(t => !presetSet.has(t));
      if (this.activeDetail && !this.activePresets.some(p => p.text === this.activeDetail)) {
        this.activeDetail = this.activePresets[0]?.text || null;
      }
    },
    buildAutoText() {
      if (!this.selectedList.length) return "";
      const head = "[분석 요청]\n- 문서 기반 보장 분석을 수행하세요.\n- 아래 선택 항목을 우선 반영:\n";
      const body = this.selectedList.map((t, i) => `  ${i + 1}. ${t}`).join("\n");
      return `${head}${body}`;
    },
    composeMemo() {
      const auto = this.autoMemo;           // ✔ computed 사용
      const tail = this.userMemo.trim();
      if (!auto && !tail) { this.memo = ""; return; }
      this.memo = auto && tail ? `${auto}\n\n[보조 메모]\n${tail}` : (auto || tail);
      this.$emit("memo-change", this.memo);
    },
    handleUserMemoInput() {
      // v-model(userMemo) 반영 + 합성
      this.composeMemo();
    },
    handleSend() {
      // this.memo: 자동+보조 합성 결과
      this.$emit("send", { memo: this.memo, selected: this.selectedList });
    },
  }
};
</script>


<style scoped>
/* ===== 바텀시트 백드롭/패널 ===== */
.sheet-backdrop{
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 3002;
}
.sheet-panel{
  width: min(600px, 100vw);
  max-height: 82vh;
  background: #fff;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -10px 30px rgba(0,0,0,.18);
  display: flex; flex-direction: column;
  overflow: hidden;
  transform: translateY(0);
  animation: sheet-up .22s ease-out;
  /* 더 넓게: 모바일 세이프에어리어 고려 */
  max-height: min(94vh, calc(100vh - env(safe-area-inset-top)));
  height: auto;
  /* iOS 부드러운 스크롤 */
  -webkit-overflow-scrolling: touch;
  --footer-h: 88px; 
}
@keyframes sheet-up {
  from { transform: translateY(12px); opacity: .98; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* ===== 헤더/바디/풋터 ===== */
.sheet-header{
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #E5E7EB;
}
.sheet-header h3{ font-size: 16px; font-weight: 800; margin: 0; }
.sheet-close{
  background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 6px 8px; cursor: pointer;
}
.sheet-close:hover{ background: #e5e7eb; }

.sheet-body{
  padding: 12px 16px;
  overflow-y: auto;
  flex: 1 1 auto;
  /* 풋터 뒤로 내용이 숨지지 않도록 하단 여백 확보 */
  padding-bottom: var(--footer-h, 96px); /* ↓ JS가 실제 높이를 채워줌 */
  -webkit-overflow-scrolling: touch;
}

/* ===== 드롭존 ===== */
.dropzone{
  border: 2px dashed #94a3b8; border-radius: 12px;
  padding: 20px; text-align: center;
  background: #f8fafc; transition: border-color .15s, background .15s;
}
.dropzone.over{ border-color: #3b82f6; background: #eef6ff; }
.dz-icon{ font-size: 24px; margin-bottom: 6px; }
.dz-title{ font-weight: 800; color:#0f172a; }
.dz-hint{ font-size: 12px; color:#64748b; }

/* ===== 버튼 ===== */
.sheet-actions{
  margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;
}
.sheet-actions .btn{
  padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 10px;
  background: #fff; cursor: pointer; font-weight: 700;
}
.sheet-actions .btn:hover{ background:#f3f4f6; }

/* ===== 파일 리스트 ===== */
.sheet-files{ margin-top: 12px; display: grid; gap: 8px; }
.sheet-file{
  display: grid; grid-template-columns: 32px 1fr auto auto;
  align-items: center; gap: 8px;
  padding: 8px; border: 1px solid #e5e7eb; border-radius:10px; background:#fff;
}
.file-kind{ width:32px; text-align:center; }
.file-name{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.file-size{ font-size:12px; color:#64748b; }
.file-remove{
  border: 1px solid #e5e7eb; background:#f9fafb; border-radius:8px; padding:4px 8px; cursor:pointer;
}
.file-remove:hover{ background:#f3f4f6; }

/* ===== 프리셋/옵션 ===== */
.sheet-presets{
  margin-top: 16px; padding: 12px; border: 1px solid #E5E7EB; border-radius: 12px; background: #FBFDFF;
}
.presets-header{ display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
.presets-header h4{ margin:0; font-size:14px; font-weight:800; }
.right-help{ font-size:12px; color:#64748b; cursor:help; }

.preset-chips{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 10px; }
.chip{
  border:1px solid #E5E7EB; background:#fff; padding:6px 10px; border-radius:999px; cursor:pointer; font-weight:700; position:relative;
}
.chip.active{ border-color:#2563EB; box-shadow:0 0 0 3px rgba(37,99,235,.12); }
.chip .fav{ margin-left:6px; font-size:12px; opacity:.5; }
.chip .fav.on{ opacity:1; color:#F59E0B; }
.chip:hover{ background:#F9FAFB; }

.analysis-options{ display:grid; grid-template-columns:1fr; gap:6px; }
.opt-row{ display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px dashed #E5E7EB; border-radius:8px; background:#fff; }
.opt-text{ font-weight:700; }
.opt-hint{ font-size:12px; color:#6B7280; }

.selected-list{ margin-top:12px; }
.selected-list .list-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.selected-list ul{ list-style:none; padding:0; margin:0; display:grid; gap:6px; }
.selected-list li{
  display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center;
  padding:6px 8px; border:1px solid #E5E7EB; border-radius:8px; background:#fff;
}
.drag-label{ font-size:14px; color:#94A3B8; }
.row-actions{ display:flex; gap:6px; }
.small{ padding:4px 8px; border:1px solid #E5E7EB; border-radius:8px; background:#fff; cursor:pointer; font-size:12px; }
.small.ghost{ background:#fff; }
.small.danger{ border-color:#FECACA; color:#B91C1C; }

/* 미리보기 */
.preview-box{ margin-top:12px; border:1px solid #DBEAFE; background:linear-gradient(180deg, #F8FBFF, #FFFFFF); border-radius:10px; }
.preview-title{ padding:8px 10px; font-weight:800; color:#1E3A8A; border-bottom:1px solid #E5E7EB; background:#EFF6FF; }
.preview-pre{ margin:0; padding:10px; white-space:pre-wrap; font-size:13px; color:#111827; }

/* ===== 풋터 ===== */
/* 풋터 레이아웃 */
.sheet-footer{
  position: sticky;
  bottom: 0;
  z-index: 5;
  flex: 0 0 auto;
  border-top: 1px solid #E5E7EB;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  display: grid;
  gap: 10px;
  background: linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,.96));
  box-shadow: 0 -4px 16px rgba(0,0,0,.06); /* 경계 가독성 */
  /* 풋터 높이 힌트(본문 padding-bottom 산정용) */
  min-height: 72px;
  
}

/* 그룹 라벨 */
.memo-group{ display: grid; gap: 6px; }
.memo-label{ font-size:12px; color:#6B7280; font-weight:700; }

/* 텍스트영역 공통 */
.sheet-textarea{
  width: 100%;
  max-width: 100%;            /* ✔ 컨테이너 초과 방지 */
  box-sizing: border-box;     /* ✔ 패딩/보더 포함 너비 계산 */
  min-height: 48px;
  border:1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 10px;
  outline:none;
  resize: vertical;
  font-size: 14px;
  line-height: 1.5;
  overflow-x: hidden;         /* ✔ 수평 스크롤 억제 */
  white-space: pre-wrap;      /* 줄바꿈 보존 + 개행 표시 */
  word-break: break-word;     /* 긴 단어 줄바꿈 */
}

/* 읽기 전용 스타일(자동 메모) */
.sheet-textarea.readonly{
  background: #F9FAFB;
  color: #111827;
  cursor: not-allowed;
}
.sheet-cta{ display:flex; gap:8px; justify-content: flex-end; }
.sheet-cta .btn{
  min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #e5e7eb; background:#fff; font-weight:700; cursor:pointer;
}
.sheet-cta .btn.ghost{ background:#fff; }
.sheet-cta .btn.primary{
  background: linear-gradient(135deg, #60A5FA, #2563EB);
  color:#fff; border:none; box-shadow: 0 6px 16px rgba(59,130,246,.20);
}
.sheet-cta .btn.primary:disabled{ opacity:.6; cursor:not-allowed; }

/* ===== 트랜지션 ===== */
.sheet-fade-enter-active, .sheet-fade-leave-active { transition: opacity .18s ease; }
.sheet-fade-enter-from, .sheet-fade-leave-to { opacity: 0; }

/* === 칩 설명 패널(가독성 강화 버전) === */
.chip-desc-panel{
  position: relative;
  margin-top: 10px;
  padding: 0; /* 타이틀/본문 분리 패딩 */
  border: 1px solid #E5E7EB;              /* #e5e7eb */
  border-radius: 14px;                     /* 라운드 */
  background: #FFFFFF;                     /* 완전 흰 배경 */
  box-shadow: 0 8px 24px rgba(0,0,0,.08);  /* 은은한 그림자 */
  overflow: hidden;                        /* 라운드 유지 */
  animation: chip-desc-in .18s ease-out;   /* 부드러운 등장 */
  max-height: 40vh;                        /* 모바일에서 과도 확장 방지 */
}

/* 위로 살짝 뜨게 하는 작은 삼각형 포인터(선택) */
.chip-desc-panel::before{
  content: "";
  position: absolute;
  top: -6px; left: 16px;
  border-width: 6px;
  border-style: solid;
  border-color: transparent transparent #FFFFFF transparent; /* 흰색 포인터 */
  filter: drop-shadow(0 -1px 0 #E5E7EB);
}

/* 타이틀 바 – 고정(스크롤 시 남아있음) */
.chip-desc-title{
  position: sticky; top: 0;
  display: flex; align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #FFFFFF;          /* 본문과 분리될 정도로 동일색 + 하단 보더 */
  border-bottom: 1px solid #F3F4F6;
  font-weight: 800; color: #0F172A; /* slate-900 */
}

.font-base-16 {
  font-size: 16px;
}

.chip-desc-title,
.opt-text {
  font-size: 16px; /* 공통 적용 */
}

/* 타이틀 좌측 아이콘 */
.chip-desc-icon{
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 999px;
  background: #EFF6FF;          /* blue-50 */
  color: #1D4ED8;               /* blue-700 */
  font-size: 12px; line-height: 1;
}

/* 타이틀 우측 닫기 버튼 */
.chip-desc-close{
  margin-left: auto;
  border: 1px solid #E5E7EB;
  background: #FFFFFF;
  border-radius: 8px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}
.chip-desc-close:hover{ background: #F9FAFB; }

/* 본문 – 넉넉한 행간과 가독성 */
.chip-desc-body{
  padding: 12px;
  color: #111827;              /* slate-900 */
  font-size: 14px;
  line-height: 1.7;            /* 가독성 핵심 */
  overflow: auto;              /* 내용 길면 스크롤 */
}

/* 등장 애니메이션 */
@keyframes chip-desc-in{
  from { transform: translateY(6px); opacity: .0; }
  to   { transform: translateY(0);   opacity: 1; }
}

/* 모션 민감 사용자 배려 */
@media (prefers-reduced-motion: reduce){
  .chip-desc-panel{ animation: none; }
}

.chip-desc-body p{ margin: 0 0 8px; }
.chip-desc-body ul{ margin: 0; padding-left: 18px; }
.chip-desc-body li{ margin: 4px 0; }
.chip-desc-body strong{ font-weight: 800; color: #0F172A; }

/* ✅ 드롭존 내부 팝오버 */
.dropzone{ position: relative; } /* 기준 컨테이너 */
.dz-picker{
  position: absolute; inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  display: grid; gap: 8px;
  min-width: 220px;
  padding: 12px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(0,0,0,.14);
  z-index: 3;
  animation: dz-pop .16s ease-out;
}
.dz-pick-btn, .dz-pick-cancel{
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid #E5E7EB; background:#fff; cursor:pointer; font-weight:700;
}
.dz-pick-btn:hover{ background:#F3F4F6; }
.dz-pick-cancel{ color:#6B7280; }
.dz-picker-mask{
  position: absolute; inset: 0;
  background: rgba(0,0,0,.04); /* 아주 옅은 마스크 */
  z-index: 2;
}
@keyframes dz-pop{
  from { transform: translate(-50%, -46%); opacity: .0; }
  to   { transform: translate(-50%, -50%); opacity: 1; }
}

/* 드래그 가능 항목 비주얼 */
.sortable-item{
  cursor: grab;
  user-select: none;
}
.sortable-item.is-dragging{
  opacity: .6;
  cursor: grabbing;
}
.sortable-item.is-over{
  outline: 2px dashed #93C5FD;     /* blue-300 */
  outline-offset: 2px;
  background: #F0F9FF;              /* sky-50 */
}
/* 이전/다음 버튼을 .small과 동일 톤으로 */
.chip-desc-nav{
  padding: 4px 8px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}
.chip-desc-nav:hover{ background:#F3F4F6; }
.chip-desc-nav:disabled{ opacity:.5; cursor:not-allowed; }
.presets-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #0F172A;
}
.presets-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #2563EB !important; /* ← 강제 적용 */
  display: flex;
  align-items: center;
  gap: 4px;
}

.presets-title .count strong {
  font-weight: 800;
}
</style>
