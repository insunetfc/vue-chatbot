<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true">
        
        <!-- 헤더 -->
        <header class="sheet-header">
          <h3>상담 스케줄 작성</h3>
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
            <div class="dz-title">여기로 방문 또는 전화 상담할 고객 리스트파일을 드래그 또는 누르세요</div>
            <div class="dz-hint">자료에는 고객정보/방문위치/관심보험 등을 입력합니다.</div>

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

          <!-- 상담 방식 -->
          <div class="seg-group">
            <div class="seg-label">상담 방식</div>
            <div class="seg-switch">
              <button v-for="c in channelOptions" :key="c.text"
                :class="{ active: selectedChannel === c.text }"
                @click="setChannel(c.text)">
                {{ c.text }}
              </button>
            </div>
          </div>

          <!-- 일정 기간 선택 -->
          <div class="option-box">
            <label>스케줄 기간</label>
            <select v-model="scheduleDuration">
              <option>1일</option>
              <option>3일</option>
              <option>5일</option>
              <option>7일</option>
            </select>
          </div>

          <!-- 상담 목표 -->
          <div class="option-box">
            <label>상담 목표</label>
            <input v-model="goalContracts" placeholder="예: 하루 5건 상담, 2건 계약" />
          </div>

          <!-- 상담 우선순위 -->
          <div class="option-box">
            <label>우선순위 고객군</label>
            <input v-model="priorityClients" placeholder="예: 자동차보험 만기 고객, 운전자보험 미보장 고객" />
          </div>

          <!-- 실행 항목 -->
          <div class="seg-group">
            <div class="seg-label">실행 항목 <span style="font-weight:400; color:#6b7280">(다중 선택)</span></div>
            <div class="seg-switch multi">
              <button v-for="t in taskOptions" :key="t.text"
                :class="{ active: selectedTasks.includes(t.text) }"
                @click="toggleTask(t.text)">
                {{ t.text }}
              </button>
            </div>
          </div>

          <!-- 메모 -->
          <div class="memo-group">
            <textarea v-model="userMemo" class="sheet-textarea" rows="5"
              placeholder="추가 사항 입력 (예: 특정 고객, 시간대, 내부 지시사항 등)"
              @input="composeMemo"></textarea>
          </div>
        </section>

        <!-- 풋터 -->
        <footer class="sheet-footer">
          <button class="btn ghost" @click="$emit('close')">취소</button>
          <button class="btn primary" :disabled="isSending" @click="handleSend">전송</button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "ConsultScheduleSheet",
  props: { isSending: { type: Boolean, default: false } },
  emits: ["close", "send"],
  data() {
    return {
      uploadedFiles: [],
      isOver: false,
      dzPickerOpen: false,
      selectedChannel: "전화",
      scheduleDuration: "3일",
      goalContracts: "",
      priorityClients: "",
      selectedTasks: ["상담 준비", "고객 통화", "후속 메시지"],
      userMemo: "",
      channelOptions: [{ text: "전화" }, { text: "방문" }],
      taskOptions: [
        { text: "상담 준비" },
        { text: "고객 통화" },
        { text: "상담 방문" },
        { text: "후속 메시지" },
        { text: "계약 체결" },
        { text: "사후 관리" }
      ],
      memo: ""
    }
  },
  methods: {
    setChannel(v){ this.selectedChannel = v; this.composeMemo(); },
    toggleTask(task){
      if(this.selectedTasks.includes(task)){
        this.selectedTasks = this.selectedTasks.filter(t => t !== task);
      } else {
        this.selectedTasks.push(task);
      }
      this.composeMemo();
    },
    buildAutoOutline(){
      const lines = [];
      lines.push("[상담 스케줄 작성 요청]");
      lines.push(`- 상담 방식: ${this.selectedChannel}`);
      lines.push(`- 스케줄 기간: ${this.scheduleDuration}`);
      if(this.goalContracts) lines.push(`- 상담 목표: ${this.goalContracts}`);
      if(this.priorityClients) lines.push(`- 우선순위 고객군: ${this.priorityClients}`);
      if(this.selectedTasks.length) lines.push(`- 실행 항목: ${this.selectedTasks.join(", ")}`);
      return lines.join("\n");
    },
    composeMemo(){
      const auto = `[[HIDDEN_START]]${this.buildAutoOutline()}[[HIDDEN_END]]`;
      const tail = (this.userMemo||"").trim();
      this.memo = auto + (tail ? `\n\n[추가 메모]\n${tail}` : "");
    },
    handleSend(){
      this.composeMemo();
      this.$emit("send", { memo: this.memo, files: this.uploadedFiles });
    },

    // 파일 관련
    openDzPicker(){ this.dzPickerOpen = true; },
    closeDzPicker(){ this.dzPickerOpen = false; },
    pickFromDz(){ this.$refs.fileInput.click(); this.closeDzPicker(); },
    onPicked(e){ this.uploadedFiles.push(...Array.from(e.target.files||[])); e.target.value=""; },
    onDrop(e){ this.isOver=false; this.uploadedFiles.push(...Array.from(e.dataTransfer.files||[])); },
    onDragEnter(){ this.isOver=true; },
    onDragLeave(){ this.isOver=false; },
    removeFile(idx){ this.uploadedFiles.splice(idx,1); },
    resolveEmoji(name=""){ 
      const lower=name.toLowerCase();
      if(lower.endsWith(".pdf")) return "📕";
      if(/\.(png|jpg|jpeg|gif|webp)$/i.test(lower)) return "🖼";
      if(lower.endsWith(".doc")||lower.endsWith(".docx")) return "📘";
      if(lower.endsWith(".xls")||lower.endsWith(".xlsx")) return "📗";
      if(lower.endsWith(".txt")) return "📄";
      return "📎";
    }
  }
}
</script>

<style scoped>
/* ===== 레이아웃 공통 ===== */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 3002;
}
.sheet-panel {
  width: min(600px, 100vw);
  max-height: 82vh;
  background: #fff;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  display: flex;
  flex-direction: column;
}
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #E5E7EB;
}
.sheet-header h3 {
  font-size: 16px;
  font-weight: 800;
  margin: 0;
}
.sheet-close {
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
}
.sheet-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1 1 auto;
}
.sheet-footer {
  padding: 12px;
  border-top: 1px solid #E5E7EB;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: #fff;
}

/* ===== 버튼 ===== */
.btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
  font-weight: 700;
  cursor: pointer;
  font-size: 14px;
  transition: all .2s ease;
}
.btn.primary {
  background: linear-gradient(135deg,#60A5FA,#2563EB);
  color: #fff;
  border: none;
}
.btn.primary:hover {
  background: linear-gradient(135deg,#3B82F6,#1D4ED8);
}
.btn.ghost {
  background: #fff;
  color: #374151;
}
.btn.ghost:hover {
  background: #f9fafb;
}

/* ===== 드롭존 ===== */
.dropzone {
  border: 2px dashed #94a3b8;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  background: #f8fafc;
  transition: border-color .15s,background .15s;
  position: relative;
  margin-bottom: 12px;
  cursor: pointer;
}
.dropzone.over {
  border-color: #3b82f6;
  background: #eef6ff;
}
.dz-icon {
  font-size: 24px;
  margin-bottom: 6px;
}
.dz-title {
  font-weight: 800;
  color: #0f172a;
}
.dz-hint {
  font-size: 12px;
  color: #64748b;
}
.dz-picker {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%,-50%);
  display: grid;
  gap: 8px;
  min-width: 220px;
  padding: 12px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(0,0,0,.14);
  z-index: 3;
  animation: dz-pop .16s ease-out;
}
.dz-pick-btn, .dz-pick-cancel {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #E5E7EB;
  background: #fff;
  cursor: pointer;
  font-weight: 700;
}
.dz-pick-btn:hover {
  background: #F3F4F6;
}
.dz-pick-cancel {
  color: #6B7280;
}
.dz-picker-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.04);
  z-index: 2;
}
@keyframes dz-pop {
  from { transform: translate(-50%,-46%); opacity: 0; }
  to   { transform: translate(-50%,-50%); opacity: 1; }
}

/* ===== 파일 리스트 ===== */
.sheet-files {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
.sheet-file {
  display: grid;
  grid-template-columns: 32px 1fr auto auto;
  gap: 8px;
  align-items: center;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.file-kind {
  width: 32px;
  text-align: center;
}
.file-size {
  font-size: 12px;
  color: #64748b;
}
.file-remove {
  border: none;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
}

/* ===== 세그먼트 버튼 ===== */
.seg-group {
  margin: 12px 0;
}
.seg-label {
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 6px;
  color: #1f2937;
}
.seg-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 버튼 기본 스타일 */
.seg-switch button {
  border: 1px solid #E5E7EB;
  border-radius: 20px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
  transition: all 0.2s ease;
}

/* hover 효과 */
.seg-switch button:hover {
  background: #f3f4f6;
  border-color: #cbd5e1;
}

/* active 효과 */
.seg-switch button.active {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  border: none;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transform: translateY(-1px);
}


/* ===== 옵션 박스 ===== */
.option-box {
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  background: #f9fafb;
}
.option-box label {
  font-weight: 700;
  font-size: 13px;
}
.option-box input,
.option-box select {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 6px;
  font-size: 14px;
  background: #fff;
}

/* ===== 메모 ===== */
.memo-group {
  margin-top: 12px;
}
.sheet-textarea {
  width: 100%;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 8px;
  font-size: 14px;
  resize: vertical;
}
</style>

