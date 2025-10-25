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
          >
            <div class="dz-icon">📎</div>
            <div class="dz-title">여기로 파일을 드래그하세요</div>
            <div class="dz-hint">또는 아래 버튼으로 선택</div>
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
        </section>

        <!-- 풋터 -->
        <footer class="sheet-footer">
          <textarea
            v-model="memo"
            class="sheet-textarea"
            rows="2"
            placeholder="메모(선택): 고객/증권번호 등 보조 정보"
            @input="$emit('memo-change', memo)"
          ></textarea>
          <div class="sheet-cta">
            <button class="btn ghost" type="button" @click="$emit('close')">취소</button>
            <button
              class="btn primary"
              type="button"
              :disabled="isSending || isSendDisabled"
              @click="$emit('send', { memo })"
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
    fileEmoji: { type: Function, default: null } // 선택: 부모의 이모지 함수 사용 가능
  },
  emits: ["close", "send", "select-files", "remove-index", "memo-change"],
  data() {
    return {
      isOver: false,
      memo: ""
    };
  },
  computed: {
    isSendDisabled() {
      // 파일 없이 메모만으로도 전송할 수 있게 하려면 조건을 바꾸세요.
      return !this.memo.trim() && !(this.uploadedFiles && this.uploadedFiles.length);
    }
  },
  methods: {
    resolveEmoji(name = "") {
      if (typeof this.fileEmoji === "function") return this.fileEmoji(name);
      // 기본 이모지 매핑
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
      if (files && files.length) {
        // 부모의 handleFileUpload와 호환되도록 FileList만 올려줌
        this.$emit("select-files", files);
      }
      // 같은 파일 재선택을 위해 value 초기화
      if (e?.target) e.target.value = "";
    },
    onDragEnter() { this.isOver = true; },
    onDragOver() { this.isOver = true; },
    onDragLeave() { this.isOver = false; },
    onDrop(e) {
      this.isOver = false;
      const files = e?.dataTransfer?.files;
      if (files && files.length) {
        this.$emit("select-files", files);
      }
    }
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
  padding: 12px 16px; overflow-y: auto; flex: 1 1 auto;
}

/* ===== 드롭존 ===== */
.dropzone{
  border: 2px dashed #94a3b8; border-radius: 12px;
  padding: 20px; text-align: center;
  background: #f8fafc; transition: border-color .15s, background .15s;
}
.dropzone.over{
  border-color: #3b82f6; background: #eef6ff;
}
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

/* ===== 풋터 ===== */
.sheet-footer{
  border-top: 1px solid #E5E7EB; padding: 10px 12px; display: grid; gap: 8px;
  background: linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,.96));
}
.sheet-textarea{
  width: 100%; min-height: 48px; border:1px solid #e5e7eb; border-radius: 10px;
  padding: 8px 10px; outline:none; resize: none; font-size: 14px;
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
</style>
