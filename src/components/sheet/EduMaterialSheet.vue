<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true">
        
        <!-- 헤더 -->
        <header class="sheet-header">
          <h3>교육자료 생성</h3>
          <button class="sheet-close" @click="$emit('close')">✕</button>
        </header>

        <!-- 바디 -->
        <section class="sheet-body">
          <!-- 드롭존 -->
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
            <div class="dz-title">여기로 교육자료 작성을 위한 파일을 드래그 또는 누르세요</div>
            <div class="dz-hint">여러 개의 파일을 넣을 수 있어요. 파일이 없어도 교육자료 생성은 가능합니다.</div>

            <!-- 숨겨진 파일 input -->
            <input
              ref="fileInput"
              type="file"
              multiple
              style="display:none"
              accept="
                application/pdf,
                text/plain,
                application/msword,
                application/vnd.openxmlformats-officedocument.wordprocessingml.document,
                application/vnd.ms-excel,
                application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
                image/*
              "
              @change="onPicked"
            />

            <!-- 드롭존 클릭용 미니 픽커 -->
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
            <div v-if="dzPickerOpen" class="dz-picker-mask" @click="closeDzPicker" />
          </div>

          <!-- 업로드된 파일 리스트 -->
          <div v-if="uploadedFiles.length" class="sheet-files">
            <div v-for="(file, index) in uploadedFiles" :key="index" class="sheet-file">
              <div class="file-kind">{{ resolveEmoji(file.name) }}</div>
              <div class="file-name">{{ file.name }}</div>
              <div class="file-size">{{ (file.size/1024/1024).toFixed(2) }} MB</div>
              <button class="file-remove" @click="removeFile(index)">삭제</button>
            </div>
          </div>

          <!-- 교육 유형 -->
          <div class="seg-group">
            <div class="seg-label">교육 유형</div>
            <div class="seg-switch">
              <button
                v-for="t in eduTypeOptions"
                :key="t.text"
                type="button"
                class="seg"
                :class="{ active: selectedEduType === t.text }"
                @click="setEduType(t.text)"
              >
                {{ t.text }}
              </button>
            </div>
          </div>

          <!-- 산출물 형식 -->
          <div class="seg-group">
            <div class="seg-label">산출물 형식</div>
            <div class="seg-switch">
              <button
                v-for="f in formatOptions"
                :key="f.text"
                type="button"
                class="seg"
                :class="{ active: selectedFormat === f.text }"
                @click="setFormat(f.text)"
              >
                {{ f.text }}
              </button>
            </div>
          </div>

          
          <!-- 포함할 구성요소 (다중 선택) -->
          <div class="seg-group">
            <div class="seg-label">구성요소 <span style="font-weight:400; color:#6b7280">(다중 선택)</span></div>
            <div class="seg-switch multi">
              <button
                v-for="c in sectionOptions"
                :key="c.text"
                type="button"
                class="seg"
                :class="{ active: selectedSections.includes(c.text) }"
                @click="toggleSection(c.text)"
              >
                {{ c.text }}
              </button>
            </div>
          </div>

          <!-- 교육 메모 -->
          <div class="memo-group">
            <textarea
              v-model="userMemo"
              class="sheet-textarea"
              rows="5"
              placeholder="교육에 포함할 세부 메모(대상자 수준, 내부 규정, 예시 자료 등)를 입력하세요"
              @input="composeMemo"
            ></textarea>
          </div>
        </section>

        <!-- 풋터 -->
        <footer class="sheet-footer">
          <button class="btn ghost" @click="$emit('close')">취소</button>
          <button class="btn primary" :disabled="isSending" @click="handleSend">
            전송
          </button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "EduMaterialSheet",
  props: {
    isSending: { type: Boolean, default: false }
  },
  emits: ["close", "send"],
  data() {
    return {
      // 업로드 상태
      uploadedFiles: [],
      isOver: false,
      dzPickerOpen: false,

      // 교육 설정 (기본값)
      selectedEduType: "상품교육",       // 교육 유형
      selectedFormat: "PPT",            // 산출물 형식
      selectedSections: ["학습목표","커리큘럼","실습","평가","Q&A"], // 구성요소 기본
      
      userMemo: "",

      // 옵션 정의
      eduTypeOptions: [
        { text: "상품교육" }, { text: "보장분석교육" },
        { text: "세일즈토크" }, { text: "컴플라이언스" }
      ],
      formatOptions: [
        { text: "PPT" }, { text: "PDF" }, { text: "노션" }, { text: "문서" }
      ],
      sectionOptions: [
        { text: "학습목표" }, { text: "커리큘럼" },
        { text: "사례" }, { text: "실습" },
        { text: "롤플레이" }, { text: "평가" },
        { text: "퀴즈" }, { text: "Q&A" }
      ],
      memo: ""
    };
  },
  methods: {
    // 옵션 변경
    setEduType(v){ this.selectedEduType = v; this.composeMemo(); },
    setAudience(v){ this.selectedAudience = v; this.composeMemo(); },
    setDuration(v){ this.selectedDuration = v; this.composeMemo(); },
    setFormat(v){ this.selectedFormat = v; this.composeMemo(); },

    toggleInsurance(key) {
      if (this.selectedInsurances.includes(key)) {
        this.selectedInsurances = this.selectedInsurances.filter(i => i !== key);
      } else {
        this.selectedInsurances.push(key);
      }
      this.composeMemo();
    },
    toggleSection(key) {
      if (this.selectedSections.includes(key)) {
        this.selectedSections = this.selectedSections.filter(i => i !== key);
      } else {
        this.selectedSections.push(key);
      }
      this.composeMemo();
    },
    togglePolicy(key) {
      if (this.selectedPolicies.includes(key)) {
        this.selectedPolicies = this.selectedPolicies.filter(i => i !== key);
      } else {
        this.selectedPolicies.push(key);
      }
      this.composeMemo();
    },

    // 자동 아웃라인(프롬프트) 생성
    buildAutoOutline() {
      const lines = [];
      lines.push("[교육자료 생성 요청]");
      lines.push(`- 교육 유형: ${this.selectedEduType}`);
      lines.push(`- 산출물 형식: ${this.selectedFormat}`);
      if (this.selectedSections && this.selectedSections.length) {
        lines.push(`- 포함할 구성요소: ${this.selectedSections.join(", ")}`);
      }
    
      return lines.join("\n");
    },

    // 메모 조합(숨김 프롬프트 + 보조메모)
    composeMemo() {
      //const auto = `[[HIDDEN_START]]${this.buildAutoOutline()}[[HIDDEN_END]]`;
      const auto = this.buildAutoOutline();
      const tail = (this.userMemo || "").trim();
      this.memo = auto + (tail ? `\n\n[보조 메모]\n${tail}` : "");
    },

    // 전송
    handleSend() {
      this.composeMemo();
      this.$emit("send", { memo: this.memo, files: this.uploadedFiles });
    },

    // 파일 업로드
    openDzPicker() { this.dzPickerOpen = true; },
    closeDzPicker() { this.dzPickerOpen = false; },
    pickFromDz(type) {
      if (type === "docs" || type === "images") {
        this.$refs.fileInput.click();
      }
      this.closeDzPicker();
    },
    onPicked(e) {
      const files = Array.from(e.target.files || []);
      this.uploadedFiles.push(...files);
      e.target.value = "";
    },
    onDrop(e) {
      this.isOver = false;
      const files = Array.from(e.dataTransfer.files || []);
      this.uploadedFiles.push(...files);
    },
    onDragEnter() { this.isOver = true; },
    onDragLeave() { this.isOver = false; },
    removeFile(idx) { this.uploadedFiles.splice(idx, 1); },

    resolveEmoji(name = "") {
      const lower = name.toLowerCase();
      if (lower.endsWith(".pdf")) return "📕";
      if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "📘";
      if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "📗";
      if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(lower)) return "🖼";
      if (lower.endsWith(".txt")) return "📄";
      return "📎";
    }
  }
};
</script>

<style scoped>
/* ===== 레이아웃 공통 ===== */
.sheet-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:flex-end; justify-content:center; z-index:3002; }
.sheet-panel{ width:min(600px,100vw); max-height:82vh; background:#fff; border-top-left-radius:16px; border-top-right-radius:16px; display:flex; flex-direction:column; }
.sheet-header{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #E5E7EB; }
.sheet-header h3{ font-size:16px; font-weight:800; margin:0; }
.sheet-close{ border:none; background:#f3f4f6; border-radius:8px; padding:6px 8px; cursor:pointer; }
.sheet-body{ padding:16px; overflow-y:auto; flex:1 1 auto; }
.sheet-footer{ padding:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:flex-end; gap:8px; background:#fff; }

/* ===== 버튼 ===== */
.btn{ padding:6px 12px; border-radius:8px; border:1px solid #E5E7EB; font-weight:700; cursor:pointer; }
.btn.primary{ background:linear-gradient(135deg,#60A5FA,#2563EB); color:#fff; border:none; }
.btn.ghost{ background:#fff; }

/* ===== 드롭존 ===== */
.dropzone{
  border: 2px dashed #94a3b8;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  background: #f8fafc;
  transition: border-color .15s, background .15s;
  position: relative;
  margin-bottom: 12px;
  cursor: pointer;
}
.dropzone.over{ border-color:#3b82f6; background:#eef6ff; }
.dz-icon{ font-size:24px; margin-bottom:6px; }
.dz-title{ font-weight:800; color:#0f172a; }
.dz-hint{ font-size:12px; color:#64748b; }

.dz-picker{
  position:absolute; inset:50% auto auto 50%;
  transform:translate(-50%,-50%);
  display:grid; gap:8px;
  min-width:220px; padding:12px;
  border:1px solid #E5E7EB; border-radius:12px; background:#fff;
  box-shadow:0 12px 28px rgba(0,0,0,.14); z-index:3;
  animation:dz-pop .16s ease-out;
}
.dz-pick-btn, .dz-pick-cancel{
  padding:10px 12px; border-radius:10px;
  border:1px solid #E5E7EB; background:#fff; cursor:pointer; font-weight:700;
}
.dz-pick-btn:hover{ background:#F3F4F6; }
.dz-pick-cancel{ color:#6B7280; }
.dz-picker-mask{ position:absolute; inset:0; background:rgba(0,0,0,.04); z-index:2; }
@keyframes dz-pop{ from{ transform:translate(-50%,-46%); opacity:0; } to{ transform:translate(-50%,-50%); opacity:1; } }

/* ===== 파일 리스트 ===== */
.sheet-files{ display:grid; gap:6px; margin-bottom:12px; }
.sheet-file{ display:grid; grid-template-columns:32px 1fr auto auto; gap:8px; align-items:center; padding:6px; border:1px solid #e5e7eb; border-radius:8px; }
.file-kind{ width:32px; text-align:center; }
.file-size{ font-size:12px; color:#64748b; }
.file-remove{ border:none; background:#f3f4f6; border-radius:6px; padding:4px 8px; cursor:pointer; }

/* ===== 세그먼트 ===== */
.seg-group{ margin:12px 0; }
.seg-label{ font-size:13px; font-weight:800; margin-bottom:4px; }
.seg-switch{ display:flex; flex-wrap:wrap; gap:6px; }
.seg-switch.multi { flex-wrap:wrap; }
.seg{ border:1px solid #E5E7EB; border-radius:20px; padding:6px 12px; cursor:pointer; }
.seg.active{ background:linear-gradient(135deg,#60A5FA,#2563EB); color:#fff; border:none; }

/* ===== 메모 ===== */
.memo-group{ margin-top:12px; }
.sheet-textarea{ width:100%; border:1px solid #E5E7EB; border-radius:10px; padding:8px; font-size:14px; }
</style>
