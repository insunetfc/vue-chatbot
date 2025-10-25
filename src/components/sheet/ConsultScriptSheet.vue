<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true">
        
        <!-- 헤더 -->
        <header class="sheet-header">
          <h3>상담 스크립트 생성</h3>
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
          <div class="dz-title">여기로 안내문 작성을 위한 파일을 드래그 또는 누르세요</div>
          <div class="dz-hint">여러개의 파일을 넣을 수 있어요. 파일이 없어도 안내문 생성은 가능합니다.</div>
        
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

          <!-- 상담 채널 -->
          <div class="seg-group">
            <div class="seg-label">채널</div>
            <div class="seg-switch">
              <button
                v-for="c in channelOptions"
                :key="c.text"
                type="button"
                class="seg"
                :class="{ active: selectedChannel === c.text }"
                @click="setChannel(c.text)"
              >
                {{ c.text }}
              </button>
            </div>
          </div>

          <!-- 톤 -->
          <div class="seg-group">
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
                {{ t.text }}
              </button>
            </div>
          </div>

          <!-- 추천 보험 종목 (다중 선택) -->
          <div class="seg-group">
            <div class="seg-label">추천 보험 종목</div>
            <div class="seg-switch multi">
              <button
                v-for="item in insuranceOptions"
                :key="item.text"
                type="button"
                class="seg"
                :class="{ active: selectedInsurances.includes(item.text) }"
                @click="toggleInsurance(item.text)"
              >
                {{ item.text }}
              </button>
            </div>
          </div>

          <!-- 상담사 메모 -->
          <div class="memo-group">
            <textarea
              v-model="userMemo"
              class="sheet-textarea"
              rows="4"
              placeholder="추가 상담 메모를 입력하세요"
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
  name: "ConsultScriptSheet",
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

      // 상담 설정
      selectedChannel: "전화상담",  // 디폴트: 전화
      selectedTone: "친근한",      // 디폴트: 친근한
      selectedInsurances: ["암보험"],      // 다중 선택 보험 종목
      userMemo: "",

      // 옵션 정의
      channelOptions: [
        { text: "전화상담", desc: "전화로 상담" },
        { text: "방문상담", desc: "대면 상담" }
      ],
      toneOptions: [
        { text: "친근한" }, { text: "전문가" },
        { text: "간결한" }, { text: "설득형" }
      ],
      insuranceOptions: [
        { text: "암보험" },
        { text: "실손" },
        { text: "정기/종신" },
        { text: "운전자" },
        { text: "3대질병" },
        { text: "치아" },
        { text: "어린이/태아" },
        { text: "연금" },
        { text: "여행자" },
        { text: "펫" },
        { text: "자동차" },
        { text: "주택화재" },
        { text: "화재배상" },
        { text: "상해" },
        { text: "배상책임" }
      ],

      memo: ""
    };
  },
  methods: {
    // 상담 옵션
    setChannel(key) { this.selectedChannel = key; this.composeMemo(); },
    setTone(key) { this.selectedTone = key; this.composeMemo(); },
    toggleInsurance(key) {
      if (this.selectedInsurances.includes(key)) {
        this.selectedInsurances = this.selectedInsurances.filter(i => i !== key);
      } else {
        this.selectedInsurances.push(key);
      }
      this.composeMemo();
    },

    // 자동 스크립트 생성
    buildAutoScript() {
      const lines = [];
      lines.push("[상담 스크립트]");
      if (this.selectedChannel) lines.push(`- 채널: ${this.selectedChannel}`);
      if (this.selectedTone) lines.push(`- 톤: ${this.selectedTone}`);
      if (this.selectedInsurances.length) {
        lines.push(`- 추천 보험 종목: ${this.selectedInsurances.join(", ")}`);
      }
      if (this.selectedChannel === "전화상담") {
        lines.push("- 시작 멘트: '안녕하세요 고객님, ○○보험 상담사입니다. 통화 괜찮으실까요?'");
      } else if (this.selectedChannel === "방문상담") {
        lines.push("- 시작 멘트: '안녕하세요 고객님, 직접 찾아뵙게 되어 반갑습니다.'");
      }
      return lines.join("\n");
    },

    // 메모 조합
    composeMemo() {
      const auto = `[[HIDDEN_START]]${this.buildAutoScript()}[[HIDDEN_END]]`;
      const tail = this.userMemo.trim();
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
    removeFile(idx) {
      this.uploadedFiles.splice(idx, 1);
    },
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
/* ===== 스타일 기본적으로 QnaSheet/ShowAnalysisSheet 따라감 ===== */
.sheet-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:flex-end; justify-content:center; z-index:3002; }
.sheet-panel{ width:min(600px,100vw); max-height:82vh; background:#fff; border-top-left-radius:16px; border-top-right-radius:16px; display:flex; flex-direction:column; }
.sheet-header{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #E5E7EB; }
.sheet-header h3{ font-size:16px; font-weight:800; margin:0; }
.sheet-close{ border:none; background:#f3f4f6; border-radius:8px; padding:6px 8px; cursor:pointer; }
.sheet-body{ padding:16px; overflow-y:auto; flex:1 1 auto; }
.sheet-footer{ padding:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:flex-end; gap:8px; background:#fff; }
.btn{ padding:6px 12px; border-radius:8px; border:1px solid #E5E7EB; font-weight:700; cursor:pointer; }
.btn.primary{ background:linear-gradient(135deg,#60A5FA,#2563EB); color:#fff; border:none; }
.btn.ghost{ background:#fff; }
.dropzone{ border:2px dashed #94a3b8; border-radius:12px; padding:20px; text-align:center; background:#f8fafc; margin-bottom:12px; cursor:pointer; position:relative; }
.dropzone.over{ border-color:#3b82f6; background:#eef6ff; }

/* 드롭존 (제안서 시트 동일) */
.dropzone{
  border: 2px dashed #94a3b8;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  background: #f8fafc;
  transition: border-color .15s, background .15s;
  position: relative;
}
.dropzone.over{ border-color:#3b82f6; background:#eef6ff; }
.dz-icon{ font-size:24px; margin-bottom:6px; }
.dz-title{ font-weight:800; color:#0f172a; }
.dz-hint{ font-size:12px; color:#64748b; }

/* 드롭존 내부 팝오버 */
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
.dz-picker-mask{
  position:absolute; inset:0; background:rgba(0,0,0,.04); z-index:2;
}
@keyframes dz-pop{ from{ transform:translate(-50%,-46%); opacity:0; } to{ transform:translate(-50%,-50%); opacity:1; } }

.sheet-files{ display:grid; gap:6px; margin-bottom:12px; }
.sheet-file{ display:grid; grid-template-columns:32px 1fr auto auto; gap:8px; align-items:center; padding:6px; border:1px solid #e5e7eb; border-radius:8px; }
.file-kind{ width:32px; text-align:center; }
.file-size{ font-size:12px; color:#64748b; }
.file-remove{ border:none; background:#f3f4f6; border-radius:6px; padding:4px 8px; cursor:pointer; }
.seg-group{ margin:12px 0; }
.seg-label{ font-size:13px; font-weight:800; margin-bottom:4px; }
.seg-switch{ display:flex; flex-wrap:wrap; gap:6px; }
.seg-switch.multi { flex-wrap:wrap; }
.seg{ border:1px solid #E5E7EB; border-radius:20px; padding:6px 12px; cursor:pointer; }
.seg.active{ background:linear-gradient(135deg,#60A5FA,#2563EB); color:#fff; border:none; }
.memo-group{ margin-top:12px; }
.sheet-textarea{ width:100%; border:1px solid #E5E7EB; border-radius:10px; padding:8px; font-size:14px; }
</style>
