<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <!-- 헤더 -->
        <header class="sheet-header">
          <h3 id="sheetTitle">제안서작성 — 파일 첨부(여러개 가능)</h3>
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
              <div class="dz-title">여기로 제안서를 작성할 설계서 파일을 드래그 또는 누르세요</div>
              <div class="dz-hint">여러개의 파일을 표로 비교하여 제안서를 작성 할 수 있어요</div>
            
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
                  application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
                  application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation
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
            <!-- 변경: 오른쪽 끝에 [항목 추가] 버튼 추가 -->
            <div class="presets-header">
              <h4 class="presets-title">
                제안 내용 선택 (중복 선택 가능)
                <span class="count"><strong>{{ activePresets.length }}</strong>개</span>
              </h4>
              <!-- ✅ 사용자 프리셋이 있을 때: 이전(심플) 버튼 -->
              <button
                v-if="hasUserPresets"
                type="button"
                class="small add-btn"        
                @click="toggleAddPreset"
                :aria-expanded="isAddOpen ? 'true' : 'false'"
                aria-controls="add-preset-panel"
                title="사용자 프리셋 추가"
              >
                + 내 항목 추가
              </button>
            
              <!-- ✅ 사용자 프리셋이 없을 때: 신규(가독성 강화) 버튼 -->
              <button
                v-else
                type="button"
                class="add-btn add-btn--primary"
                @click="toggleAddPreset"
                :aria-expanded="isAddOpen ? 'true' : 'false'"
                aria-controls="add-preset-panel"
                title="사용자 프리셋 추가 (⌘/Ctrl + Enter)"
              >
                <span class="add-btn__icon" aria-hidden="true">＋</span>
                <span class="add-btn__label">내 항목 추가</span>
              </button>
            </div>
            
            <!-- ▼ 추가: 항목 추가 입력 폼 -->
            <div
              v-if="isAddOpen"
              id="add-preset-panel"
              class="add-preset-panel"
              role="region"
              aria-label="사용자 프리셋 추가"
            >
              <div class="add-row">
                <label class="add-label" for="newPresetTitle">제목</label>
                <input
                  id="newPresetTitle"
                  v-model.trim="newPresetTitle"
                  class="add-input"
                  type="text"
                  maxlength="24"
                  placeholder="예) 갱신 스케줄 요약"
                  @keydown.enter.prevent="savePreset()"
                />
              </div>
              <div class="add-row">
                <label class="add-label" for="newPresetDesc">상세내용</label>
                <textarea
                  id="newPresetDesc"
                  v-model.trim="newPresetDesc"
                  class="add-textarea"
                  rows="3"
                  maxlength="500"
                  placeholder="이 프리셋이 수행할 분석 설명을 적어주세요."
                  @keydown.enter.exact.prevent="savePreset()"
                ></textarea>
              </div>
              <div class="add-actions">
                <button type="button" class="small" @click="cancelAddPreset">취소</button>
                <button type="button" class="small primary" @click="savePreset">저장</button>
              </div>
            </div>
            <!-- 출력 형식 스위치 (칩 스타일) -->
            <div class="output-switch" role="radiogroup" aria-label="출력 형식 선택">
              <button
                type="button"
                class="seg"
                :class="{ active: selectedOutput === '이메일형식' }"
                @click="setOutput('이메일형식')"
                :aria-pressed="selectedOutput === '이메일형식'"
              >
                이메일형식
              </button>
              <button
                type="button"
                class="seg"
                :class="{ active: selectedOutput === '문서형식' }"
                @click="setOutput('문서형식')"
                :aria-pressed="selectedOutput === '문서형식'"
              >
                문서형식
              </button>
              <button
                type="button"
                class="seg"
                :class="{ active: selectedOutput === '문자형식' }"
                @click="setOutput('문자형식')"
                :aria-pressed="selectedOutput === '문자형식'"
              >
                문자형식
              </button>
              <button
                type="button"
                class="seg"
                :class="{ active: selectedOutput === '카톡형식' }"
                @click="setOutput('카톡형식')"
                :aria-pressed="selectedOutput === '카톡형식'"
              >
                카톡형식
              </button>
            </div>
            <!-- 프리셋 칩(멀티 토글) -->
            <div class="preset-chips" role="listbox" aria-label="분석 프리셋(복수 선택)">
              <button
                v-for="(p, i) in visiblePresets"
                :key="i"
                class="chip"
                :class="{
                   active: isActivePreset(p),
                   focused: activeDetail === p.text,
                   'chip--alert': p._special   
                 }"
                @click="togglePreset(p)"
                @dblclick="focusDetail(p.text)"
                :aria-pressed="isActivePreset(p)"
                :title="p._user ? '사용자 추가 프리셋' : '프리셋'"
              >
                <span class="chip-text">{{ p.text }}</span>
            
                <!-- 사용자 배지 -->
                <span v-if="p._user" class="chip-tag user">사용자</span>
                <span v-if="isActivePreset(p)" class="chip-check">✔</span>
                <!-- 삭제 아이콘 -->
                <span
                  v-if="p._user"
                  class="chip-remove"
                  title="삭제"
                  @click.stop="removeUserPreset(p.text)"
                >✕</span>
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
        <!-- 토스트 -->
        <div v-if="showToastFlag" class="toast" role="status" aria-live="polite">
          {{ toastMsg }}
        </div>
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
              placeholder="[제안서 요청] 선택한 항목에 따라 자동 생성됩니다"
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
              첨부하고 제안서 요청
            </button>
          </div>
        </footer>

      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "ShowProposalSheet",
  props: {
    uploadedFiles: { type: Array, required: true },
    isSending: { type: Boolean, default: false },
    fileEmoji: { type: Function, default: null },
    initialRecent: { type: Array, default: () => [] },
    initialFavorites: { type: Array, default: () => [] },
    // ✅ 부모에서 내려주는 한도/확장자
    limits: {
      type: Object,
      default: () => ({ maxFiles: 3, perFile: 50*1024*1024, total: 25*1024*1024 })
    },
    validExt: {
      type: [String, RegExp],
      // ⚠️ String 기본값으로 바꿔서 ESLint 통과
      default: "\\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$"
    }
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
        { text: "이메일형식", desc: "고객 맞춤 이메일 제안서 자동 생성 (인사말, 요약, 권장 보장안 포함)" },
        { text: "문서형식", desc: "제안서를 Word 문서형식으로 붙여넣기 가능하도록 작성" },
        { text: "문자형식", desc: "짧은 문자메시지에 최적화된 제안 요약 생성" },   // 추가
        { text: "카톡형식", desc: "카카오톡 채팅에 최적화된 제안 메시지 형태로 작성" }, // 추가
        { text: "담당자정보추가", desc: "설계사 이름, 연락처, 소속 등 담당자 정보를 제안서 하단에 자동 삽입" },
        { text: "보장요약", desc: "핵심 보장 항목만 추려 간결하게 요약 제시" },
        { text: "예산별플랜", desc: "고객 예산에 따라 저(低)·중(中)·고(高) 보장안 비교표 생성" },
        { text: "상품추천", desc: "고객 연령/직업/가족구성에 최적화된 상품 추천" },
        { text: "비교표작성", desc: "현재 보장 대비 신규 제안 보장을 표로 비교하여 차이점 강조" },
        { text: "부족보완안", desc: "부족한 보장을 보완하는 특약/상품 제시 및 추가 비용 안내" },
        { text: "갱신안내", desc: "갱신형/비갱신형 구분과 향후 보험료 인상 가능성 설명" },
        { text: "리스크분석", desc: "고객의 연령·직업·생활 패턴에 따른 주요 리스크 분석 결과 삽입" },
        { text: "사망보장안", desc: "유가족 생활비, 대출, 장례비 등을 고려한 적정 사망보험금 제안" },
        { text: "후유장해보완", desc: "생활/직업 리스크 대비 후유장해 보장 증액 필요 여부 설명" },
        { text: "암/뇌/심장 플랜", desc: "3대 질병(암·뇌혈관·심장)에 대한 집중 보장안 제시" },
        { text: "운전자보완", desc: "교통사고 처리비용·벌금·변호사비용 등 운전자보험 필요 보장안 추가" },
        { text: "화재/재산보장", desc: "주택·상가·창고 등 화재 및 손해배상 관련 제안 추가" },
        { text: "저축성옵션", desc: "무해지/환급형 여부와 해지환급금 지급 조건, 저축성 보장안 선택 옵션 안내" }
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
      isAddOpen: false,
      newPresetTitle: "",
      newPresetDesc: "",
      toastMsg: "",
      showToastFlag: false,
      selectedOutput: "",
    };
  },
  mounted() {
    window.addEventListener('keydown', this._onEscClose);
    // 초기 합성
    this.userMemo = this.extractManual(this.memo);
    this.composeMemo();
    
    this.loadUserPresets();
    this.$nextTick(()=>{
      if(!this.hasUserPresets){
        const btn = this.$el.querySelector('.add-btn--primary');
        if(btn){
          btn.classList.add('notice-pulse');
          setTimeout(()=>btn.classList.remove('notice-pulse'), 900);
        }
      }
    });
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this._onEscClose);
  },
  computed: {
    visiblePresets() {
      const base = Array.isArray(this.presets) ? this.presets : [];
      const count = (this.uploadedFiles && this.uploadedFiles.length) || 0;
  
      const filteredBase = base.filter(
        p => !["이메일형식", "문서형식","문자형식","카톡형식"].includes(p.text)
      );
  
      if (count >= 2) {
        const specials = [
          { text: "통합비교", desc: "문서를 서로 통합적으로 비교 분석합니다.", _special: true },
          { text: "비교표",   desc: "문서를 통합적으로  비교표로 표시합니다.",   _special: true }
        ];
        return [...specials, ...filteredBase];
      }
      return filteredBase;
    },
    hasUserPresets() {
      // presets 중 _user === true 가 하나라도 있으면 true
      return Array.isArray(this.presets) && this.presets.some(p => p && p._user);
    },
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
      return !hasFiles || this.isSending;
    },
  },
  watch: {
    selectedOutput(val) {
      // 외부에서 selectedOutput을 변경해도 동작하도록 동기화
      this.activePresets = this.activePresets.filter(
        p => !["이메일형식", "문서형식","문자형식","카톡형식"].includes(p.text)
      );
      const found = this.presets.find(p => p.text === val);
      if (found) {
        this.activePresets.unshift(found);
        this.activeDetail = found.text;
        this.composeMemo();
      }
    },
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
    },
    uploadedFiles: {
      immediate: true,
      deep: true,
      handler(v) {
        const count = (v && v.length) || 0;
        if (count < 2) {
          // 특수칩 제거
          const before = this.activePresets.length;
          this.activePresets = this.activePresets.filter(p => !p._special);
          // 상세가 특수칩이었다면 닫기/이동
          if (this.activeDetail && (!this.activePresets.some(p => p.text === this.activeDetail))) {
            this.activeDetail = this.activePresets[0]?.text || null;
          }
          // 메모 갱신
          if (this.activePresets.length !== before) {
            this.composeMemo();
          }
        }
      }
    }
  },
  methods: {
    setOutput(val) {
      if (this.selectedOutput === val) return;
      this.selectedOutput = val;
  
      // 출력 타입(이메일형식/문서형식) 기존 선택 제거
      this.activePresets = this.activePresets.filter(
        p => !["이메일형식", "문서형식","문자형식","카톡형식"].includes(p.text)
      );
  
      // 새 출력 타입을 presets에서 찾아 맨 앞에 추가 (가시성↑)
      const found = this.presets.find(p => p.text === val);
      if (found) {
        this.activePresets.unshift(found);
        this.activeDetail = found.text;
      }
  
      this.composeMemo();
    },
    _bytesToMB(b){ return Math.round(b / (1024*1024)); },

    validateAndEmit(listLike){
      const incoming = this.normalizeFiles(listLike);
      if (!incoming.length) return;
  
      const maxFiles = this.limits?.maxFiles ?? Infinity;
      const perFile  = this.limits?.perFile  ?? Infinity;
      const total    = this.limits?.total    ?? Infinity;
  
      const validRe  = this.validExt instanceof RegExp
        ? this.validExt
        : new RegExp(String(this.validExt), 'i');
  
      // 현재 자식 시트가 보여주고 있는 목록 기준
      const baseList = Array.isArray(this.uploadedFiles) ? [...this.uploadedFiles] : [];
      const baseSeen = new Set(baseList.map(f => `${f.name}:${f.size}:${f.lastModified||0}`));
      const currentTotal = baseList.reduce((s,f)=>s+f.size,0);
  
      const added = [];
      let addSize = 0;
  
      for (const f of incoming) {
        if (!validRe.test(f.name)) { this.toast(`❌ 지원 안함: ${f.name}`); continue; }
        if (f.size > perFile) { this.toast(`❌ ${this._bytesToMB(perFile)}MB 초과: ${f.name}`); continue; }
  
        // 총 개수 제한
        if (baseList.length + added.length >= maxFiles) {
          this.toast(`❌ 최대 ${maxFiles}개 파일`);
          break;
        }
        // 총 용량 제한
        if (currentTotal + addSize + f.size > total) {
          this.toast(`❌ 총 ${this._bytesToMB(total)}MB 초과`);
          break;
        }
  
        const key = `${f.name}:${f.size}:${f.lastModified || 0}`;
        if (baseSeen.has(key)) continue;
  
        added.push(f);
        addSize += f.size;
        baseSeen.add(key);
      }
  
      // ✅ 통과분만 부모로 전달 + 부모 재검증 생략 신호
      if (added.length) {
        this.$emit("select-files", { files: added, mode: "append", __fromChild: true });
      }
    },
    normalizeFiles(listLike) {
      const arr = Array.from(listLike || []);
      // 유효 파일만 + 중복 제거(name-size-lastModified)
      const filtered = arr.filter(f => f && f.name);
      const seen = new Set();
      return filtered.filter(f => {
        const k = `${f.name}-${f.size}-${f.lastModified || 0}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    },
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
      if (full.includes("[제안서 작성 요청]")) return "";
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
    onPicked(e){
      const files = this.normalizeFiles(e?.target?.files);
      this.validateAndEmit(files);
      if (e?.target) e.target.value = "";
    },
    onDrop(e){
      this.isOver = false;
      const files = this.normalizeFiles(e?.dataTransfer?.files);
      this.validateAndEmit(files);
    },
    onDragEnter() { this.isOver = true; },
    
    /* ===== 선택/상세 ===== */
    isActivePreset(preset) {
      return this.activePresets.some(x => x.text === preset.text);
    },
    togglePreset(preset) {
    
      if (["이메일형식", "문서형식","문자형식","카톡형식"].includes(preset.text)) {
        this.setOutput(preset.text);
        return;
      }
    
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
        const found = this.visiblePresets.find(p => p.text === text);
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
      const presetSet = new Set(this.visiblePresets.map(p => p.text));
      const newPresets = newList.filter(t => presetSet.has(t));
      this.activePresets = newPresets
        .map(t => this.visiblePresets.find(p => p.text === t))
        .filter(Boolean);
      this.selectedOptions = newList.filter(t => !presetSet.has(t));
      if (this.activeDetail && !this.activePresets.some(p => p.text === this.activeDetail)) {
        this.activeDetail = this.activePresets[0]?.text || null;
      }
    },
    buildAutoText() {
      if (!this.selectedList.length) return "";
      const head = "[제안서 작성 요청]\n- 문서 기반 제안서 작성을 수행하세요.\n- 아래 선택 항목을 우선 반영:\n";
      const body = this.selectedList.map((t, i) => `  ${i + 1}. ${t}`).join("\n");
      return `${head}${body}`;
    },
    composeMemo() {
      const auto = this.autoMemo
        ? `[[HIDDEN_START]]${this.autoMemo}[[HIDDEN_END]]`
        : "";      // ✔ computed 사용
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
    /* ===== 사용자 프리셋 추가 UI 제어 ===== */
    toggleAddPreset() {
      this.isAddOpen = !this.isAddOpen;
      if (this.isAddOpen) {
        this.$nextTick(() => {
          const el = this.$el.querySelector('#newPresetTitle');
          el && el.focus();
        });
      }
    },
    cancelAddPreset() {
      this.isAddOpen = false;
      this.newPresetTitle = "";
      this.newPresetDesc = "";
    },
  
    /* ===== 로컬스토리지: 사용자 프리셋 load/save ===== */
    loadUserPresets() {
      try {
        const up = JSON.parse(localStorage.getItem("analysis.userPresets") || "[]");
        if (Array.isArray(up) && up.length) {
          const base = new Set(this.presets.map(p => p.text));
          const toAppend = up
            .filter(p => p && p.text && !base.has(p.text))
            .map(p => ({ ...p, _user: p._user === undefined ? true : !!p._user })); // ✅ 보정
          this.presets.push(...toAppend);
        }
      } catch(e) {
        localStorage.setItem("analysis.userPresets", "[]");
      }
    },
    saveUserPresets(list) {
      try {
        localStorage.setItem("analysis.userPresets", JSON.stringify(list));
      } catch(e) {
        // 저장 실패 무시
      }
    },
    getUserPresets() {
      try {
        const up = JSON.parse(localStorage.getItem("analysis.userPresets") || "[]");
        return Array.isArray(up) ? up : [];
      } catch(_) { return []; }
    },
  
    /* ===== 프리셋 저장 ===== */
    savePreset() {
      const title = (this.newPresetTitle || "").trim();
      const desc  = (this.newPresetDesc  || "").trim();
      if (!title) { this.toast("제목을 입력하세요."); return; }
      if (!desc)  { this.toast("상세내용을 입력하세요."); return; }
    
      const exists = this.presets.some(p => p.text === title);
      if (exists) { this.toast("이미 존재하는 제목입니다."); return; }
    
      // ✅ 사용자 플래그 포함
      const newItem = { text: title, desc, _user: true };
    
      // 즉시 반영
      this.presets.push(newItem);
    
      // 로컬스토리지 반영
      const allUser = this.getUserPresets();
      allUser.push(newItem);
      this.saveUserPresets(allUser);
    
      // UI 처리
      this.newPresetTitle = "";
      this.newPresetDesc  = "";
      this.isAddOpen = false;
      this.toast("저장되었습니다.");
    
      this.activePresets.push(newItem);
      this.activeDetail = newItem.text;
      this.composeMemo();
    },
  
    /* ===== 토스트 ===== */
    toast(msg = "") {
      this.toastMsg = msg;
      this.showToastFlag = true;
      window.clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => {
        this.showToastFlag = false;
      }, 1800);
    },
    removeUserPreset(title) {
      // presets에서 제거
      this.presets = this.presets.filter(p => p.text !== title);
  
      // activePresets에서 제거
      this.activePresets = this.activePresets.filter(p => p.text !== title);
  
      // 로컬스토리지에서도 제거
      const allUser = this.getUserPresets().filter(p => p.text !== title);
      this.saveUserPresets(allUser);
  
      this.toast("삭제되었습니다.");
  
      // 상세보기 닫기
      if (this.activeDetail === title) {
        this.activeDetail = null;
      }
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

.preset-chips{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 10px; margin-top: 12px;}
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
/* 우측 [항목 추가] 버튼 */
.add-btn{
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  height: 30px; padding: 0 8px;
  border-radius: 12px; font-weight: 800; font-size: 13px;
  cursor: pointer; user-select: none;
  transition: transform .06s ease, box-shadow .12s ease, background .12s ease;
}
.add-btn:hover{ background:#F3F4F6; }

/* 추가 폼 컨테이너 */
.add-preset-panel{
  margin-top: 10px;
  padding: 12px;
  border: 1px dashed #E5E7EB;
  border-radius: 12px;
  background: #FFFFFF;
}
.add-row{
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 8px;
  align-items: start;
  margin-bottom: 8px;
}
.add-label{
  font-size: 12px;
  font-weight: 700;
  color: #6B7280;
  padding-top: 8px;
}
.add-input,
.add-textarea{
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 8px 10px;
  outline: none;
  font-size: 14px;
}
.add-input:focus,
.add-textarea:focus{ border-color:#93C5FD; box-shadow: 0 0 0 3px rgba(147,197,253,.35); }

.add-actions{
  margin-top: 6px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.small.primary{
  background: linear-gradient(135deg, #60A5FA, #2563EB);
  color:#fff; border:none;
}

/* 토스트 */
.toast{
  position: fixed;
  left: 50%;
  bottom: calc(16px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  background: linear-gradient(135deg, #60A5FA, #2563EB); /* 밝은 블루 그라데이션 */
  color: #fff; /* 흰색 글자 */
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  z-index: 4000;
  box-shadow: 0 4px 16px rgba(37,99,235,.25); /* 파란 그림자 */
  animation: toast-in .18s ease-out;
}
@keyframes toast-in{
  from{ transform: translate(-50%, 6px); opacity: 0; }
  to  { transform: translate(-50%, 0);  opacity: 1; }
}
.chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #E5E7EB;
  background: #fff;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 12px;
  font-weight: bold;
  color: #6B7280; /* slate-500 */
  border-radius: 50%;
  cursor: pointer;
}
.chip-remove:hover {
  background: #F3F4F6;
  color: #DC2626; /* red-600 */
}
.chip-text { display:inline-block; }

.chip-tag{
  display:inline-flex; align-items:center; justify-content:center;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 11px; font-weight: 800; line-height: 1;
  border: 1px solid #E5E7EB;
  background: #F9FAFB;
  color: #374151; /* slate-700 */
}
.chip-tag.user{
  /* 약한 블루 톤 강조 */
  border-color: #BFDBFE;                /* blue-200 */
  background: linear-gradient(180deg,#EFF6FF,#FFFFFF);
  color: #1D4ED8;                        /* blue-700 */
  box-shadow: 0 1px 0 rgba(29,78,216,.08) inset;
}

/* 프라이머리 아웃라인(가독성 높음) */
.add-btn--primary{
  background: linear-gradient(#fff, #fff) padding-box,
              linear-gradient(135deg, #60A5FA, #2563EB) border-box;
  border: 2px solid transparent;
  color: #1F2937; /* gray-800, 가독성 높음 */
  box-shadow: 0 2px 10px rgba(59,130,246,.12);
}

/* 아이콘/라벨/단축키 */
.add-btn__icon{ font-size: 16px; line-height: 1; }
.add-btn__label{ letter-spacing: .2px; }
.add-btn__kbd{
  font-weight: 700; font-size: 11px; color: #2563EB;
  background: #EFF6FF; border: 1px solid #DBEAFE;
  padding: 2px 6px; border-radius: 8px;
}

/* 상태 피드백 */
.add-btn--primary:hover{ transform: translateY(-1px); box-shadow: 0 4px 14px rgba(59,130,246,.18); }
.add-btn--primary:active{ transform: translateY(0); box-shadow: 0 2px 8px rgba(59,130,246,.16); }
.add-btn--primary:focus-visible{
  outline: none;
  box-shadow: 0 0 0 3px rgba(147,197,253,.55); /* focus ring */
}

/* 열림 상태 시 강조(토글 느낌) */
[aria-expanded="true"].add-btn--primary{
  background: linear-gradient(#F8FAFF, #FFFFFF) padding-box,
              linear-gradient(135deg, #60A5FA, #2563EB) border-box;
}

/* 헤더 우측 고정 + 모바일 스티키 */
.presets-header{
  position: sticky; top: 0; background: #FBFDFF;
  padding-top: 8px; margin-top: -8px; /* 시각적 밀착 */
  z-index: 2;
}
@media (max-width: 420px){
  .add-btn{ height: 44px; padding: 0 14px; }
  .add-btn__kbd{ display:none; } /* 모바일은 단축키 숨김 */
}

/* 선택 0개일 때 첫 진입 가벼운 주의 유도 */
.presets-header .add-btn--primary.notice-pulse{
  animation: addbtn-pop .8s ease-out 1;
}
@keyframes addbtn-pop{
  0%{ transform: scale(.98); box-shadow: 0 0 0 0 rgba(59,130,246,.0); }
  50%{ transform: scale(1.02); box-shadow: 0 0 0 6px rgba(59,130,246,.12); }
  100%{ transform: scale(1); box-shadow: 0 2px 10px rgba(59,130,246,.12); }
}
.add-subcopy{ display:block; margin-top:4px; color:#6B7280; font-size:12px; font-weight:600; }

/* 신규 버튼(가독성 강화) — 이미 제안드린 스타일 */
.add-btn--primary{
  background: linear-gradient(#fff, #fff) padding-box,
              linear-gradient(135deg, #60A5FA, #2563EB) border-box;
  border: 2px solid transparent;
  box-shadow: 0 2px 10px rgba(59,130,246,.12);
}
/* 이전(심플) 버튼은 기존 .small.add-btn 유지 */
.small.add-btn{
  padding: 4px 8px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
}
/* 🔴 특수 칩(통합비교/비교표) 강조 */
.chip--alert{
  border-color: #EF4444 !important;                /* red-500 */
  box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important;
}
.chip--alert:hover{
  background: #FEF2F2;                             /* red-50 */
}
.chip--alert.active{
  box-shadow: 0 0 0 3px rgba(239,68,68,.22) !important;
}

.chip-check {
  margin-left: auto;
  font-weight: 800;
  color: #16A34A; /* green-600 */
  font-size: 14px;
}
.output-switch{
  display: inline-flex;
  align-items: center;
  gap: 0;
  border: 1px solid #E5E7EB;
  border-radius: 999px;
  background: #fff;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  margin-bottom: 10px;
}

.output-switch .seg{
  appearance: none;
  border: 0;
  background: transparent;
  padding: 6px 12px;
  font-weight: 800;
  font-size: 13px;
  color: #374151; /* slate-700 */
  border-radius: 999px;
  cursor: pointer;
}

.output-switch .seg:hover{
  background: #F3F4F6; /* hover */
}

.output-switch .seg.active{
  background: linear-gradient(135deg, #60A5FA, #2563EB);
  color: #fff;
  box-shadow: 0 4px 12px rgba(37,99,235,.20);
}
</style>
