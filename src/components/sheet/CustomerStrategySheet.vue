<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true">
        
        <!-- 헤더 -->
        <header class="sheet-header">
          <h3>고객 공략법 생성</h3>
          <button class="sheet-close" @click="$emit('close')">✕</button>
        </header>

        <!-- 바디 -->
        <section class="sheet-body">
          <!-- 파일 업로드 -->
          <div
            class="dropzone"
            :class="{ over: isOver }"
            @dragenter.prevent="onDragEnter"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
            @click="openFilePicker"
          >
            <div class="dz-icon">📎</div>
            <div class="dz-title">여기로 고객 보장내역 분석표를 드래그 또는 클릭하여 업로드하세요</div>
            <div class="dz-hint">분석표가 없어도 공략법 생성은 가능합니다.</div>

            <input
              ref="fileInput"
              type="file"
              multiple
              style="display:none"
              accept="application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              @change="onPicked"
            />
          </div>

          <div v-if="uploadedFiles.length" class="sheet-files">
            <div v-for="(file, index) in uploadedFiles" :key="index" class="sheet-file">
              <div class="file-kind">{{ resolveEmoji(file.name) }}</div>
              <div class="file-name">{{ file.name }}</div>
              <div class="file-size">{{ (file.size/1024/1024).toFixed(2) }} MB</div>
              <button class="file-remove" @click="removeFile(index)">삭제</button>
            </div>
          </div>

          <!-- 직업 -->
          <div class="seg-group">
            <div class="seg-label">직업</div>
            <input v-model="selectedJob" type="text" class="sheet-input" placeholder="직접 입력" />
          </div>

          <!-- 성격특징 -->
          <div class="seg-group">
            <div class="seg-label">성격특징</div>
            <select v-model="selectedPersonality" class="sheet-input">
              <option v-for="p in personalityOptions" :key="p" :value="p">{{ p }}</option>
            </select>
            <input
              v-if="selectedPersonality === '기타(직접입력)'"
              v-model="customPersonality"
              type="text"
              class="sheet-input mt-2"
              placeholder="성격 특징을 직접 입력하세요"
            />
          </div>

          <!-- 보험 담당자 -->
          <div class="seg-group">
            <div class="seg-label">보험 담당자</div>
            <select v-model="selectedManager" class="sheet-input">
              <option v-for="m in managerOptions" :key="m" :value="m">{{ m }}</option>
            </select>
            <input
              v-if="selectedManager === '기타(직접입력)'"
              v-model="customManager"
              type="text"
              class="sheet-input mt-2"
              placeholder="보험 담당자를 직접 입력하세요"
            />
          </div>

          <!-- 선호 상담 시간대 -->
          <div class="seg-group">
            <div class="seg-label">선호 상담 시간대</div>
            <select v-model="selectedTime" class="sheet-input">
              <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
            <input
              v-if="selectedTime === '기타(직접입력)'"
              v-model="customTime"
              type="text"
              class="sheet-input mt-2"
              placeholder="상담 가능 시간을 직접 입력하세요"
            />
          </div>

          <!-- 선호 보험사 -->
          <div class="seg-group">
            <div class="seg-label">선호 보험사</div>
            <select v-model="selectedCompany" class="sheet-input">
              <option v-for="c in companyOptions" :key="c" :value="c">{{ c }}</option>
            </select>
            <input
              v-if="selectedCompany === '기타(직접입력)'"
              v-model="customCompany"
              type="text"
              class="sheet-input mt-2"
              placeholder="보험사를 직접 입력하세요"
            />
          </div>

          <!-- 보험 성향 (자유 입력) -->
          <div class="seg-group">
            <div class="seg-label">보험 성향</div>
            <textarea v-model="insurancePreference" rows="3" class="sheet-textarea" placeholder="기존 가입내역, 자동차/자산 현황 등을 입력하세요"></textarea>
          </div>

          <!-- 가입예정보험 -->
          <div class="seg-group">
            <div class="seg-label">가입 예정 보험 (다중 선택)</div>
            <div class="seg-switch multi">
              <button
                v-for="b in futureInsuranceOptions"
                :key="b"
                type="button"
                class="seg"
                :class="{ active: selectedFutureInsurances.includes(b) }"
                @click="toggleFutureInsurance(b)"
              >
                {{ b }}
              </button>
            </div>
            <input
              v-if="selectedFutureInsurances.includes('기타(직접입력)')"
              v-model="customFutureInsurance"
              type="text"
              class="sheet-input mt-2"
              placeholder="가입 예정 보험을 직접 입력하세요"
            />
          </div>

          <!-- 메모 -->
          <div class="memo-group">
            <textarea
              v-model="userMemo"
              class="sheet-textarea"
              rows="4"
              placeholder="추가 메모 (예: 고객 특이사항, 유의점 등)"
            ></textarea>
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
  name: "CustomerStrategySheet",
  props: {
    isSending: { type: Boolean, default: false }
  },
  emits: ["close", "send"],
  data() {
    return {
      uploadedFiles: [],
      isOver: false,

      // 입력값
      selectedJob: "",
      selectedPersonality: "무난함 (평범함)",
      selectedManager: "본인",
      selectedTime: "오전 아무 때나",
      selectedCompany: "추천보험사",
      insurancePreference: "",
      selectedFutureInsurances: [],
      userMemo: "",

      // 기타 직접입력 값
      customPersonality: "",
      customManager: "",
      customTime: "",
      customCompany: "",
      customFutureInsurance: "",

      // 옵션
      personalityOptions: [
        "친절함 (매너 좋음)", "무난함 (평범함)", "꼼꼼함 (깐깐함, 타산적임)",
        "쌀쌀함 (냉정함)", "고집쎔 (억지부림, 강압적)", "성급함",
        "신경질적임 (화를 잘 냄)", "기타(직접입력)"
      ],
      managerOptions: [
        "본인", "배우자", "자녀", "부모", "형제", "직원",
        "친척", "친구", "친지", "기타(직접입력)"
      ],
      timeOptions: [
        "오전 아무 때나", "오전 9시 이전", "오전 9~10시", "오전 10~11시", "오전 11~12시",
        "오후 아무 때나", "오후 12~1시", "오후 1~2시", "오후 2~3시", "오후 3~4시",
        "오후 4~5시", "오후 5~6시", "오후 6시 이후", "기타(직접입력)"
      ],
      companyOptions: [
        "추천보험사", "삼성, 현대, DB, KB", "중위권 + 저렴한 보험사", "저렴한 보험사",
        "삼성", "현대", "DB", "KB", "메리츠", "롯데", "한화", "흥국", "하나", "AXA", "생명보험사", "기타(직접입력)"
      ],
      futureInsuranceOptions: [
        "자동차보험", "운전자보험", "실손보험", "건강보험", "암보험", "어린이보험",
        "태아보험", "종신보험", "정기보험", "연금보험", "변액보험",
        "여행보험", "화재보험", "저축보험", "상해보험", "배상보험", "기타(직접입력)"
      ]
    };
  },
  methods: {
    toggleFutureInsurance(key) {
      if (this.selectedFutureInsurances.includes(key)) {
        this.selectedFutureInsurances = this.selectedFutureInsurances.filter(i => i !== key);
      } else {
        this.selectedFutureInsurances.push(key);
      }
    },
    buildAutoOutline() {
      const lines = [];
      lines.push("[고객 공략 전략 요청]");
      if (this.selectedJob) lines.push(`- 직업: ${this.selectedJob}`);
      if (this.selectedPersonality) lines.push(`- 성격특징: ${this.selectedPersonality}`);
      if (this.selectedManager) lines.push(`- 보험 담당자: ${this.selectedManager}`);
      if (this.selectedTime) lines.push(`- 선호 상담 시간대: ${this.selectedTime}`);
      if (this.selectedCompany) lines.push(`- 선호 보험사: ${this.selectedCompany}`);
      if (this.insurancePreference) lines.push(`- 보험 성향: ${this.insurancePreference}`);
      if (this.selectedFutureInsurances.length) {
        lines.push(`- 가입 예정 보험: ${this.selectedFutureInsurances.join(", ")}`);
      }
      return lines.join("\n");
    },
    
    composeMemo() {
      //const auto = `[[HIDDEN_START]]${this.buildAutoOutline()}[[HIDDEN_END]]`;
      const auto = this.buildAutoOutline();  
      const tail = (this.userMemo || "").trim();
      this.memo = auto + (tail ? `\n\n[추가 메모]\n${tail}` : "");
    },
    
    handleSend() {
      this.composeMemo();
      this.$emit("send", { memo: this.memo, files: this.uploadedFiles });
    },


    openFilePicker() { this.$refs.fileInput.click(); },
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
      if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "📗";
      return "📎";
    }
  }
};
</script>

<style scoped>
/* === 공통 레이아웃 === */
.sheet-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:flex-end; justify-content:center; z-index:3002; }
.sheet-panel{ width:min(600px,100vw); max-height:82vh; background:#fff; border-top-left-radius:16px; border-top-right-radius:16px; display:flex; flex-direction:column; }
.sheet-header{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #E5E7EB; }
.sheet-header h3{ font-size:16px; font-weight:800; margin:0; }
.sheet-close{ border:none; background:#f3f4f6; border-radius:8px; padding:6px 8px; cursor:pointer; }
.sheet-body{ padding:16px; overflow-y:auto; flex:1 1 auto; }
.sheet-footer{ padding:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:flex-end; gap:8px; background:#fff; }

/* === 버튼 === */
.btn{ padding:6px 12px; border-radius:8px; border:1px solid #E5E7EB; font-weight:700; cursor:pointer; }
.btn.primary{ background:linear-gradient(135deg,#60A5FA,#2563EB); color:#fff; border:none; }
.btn.ghost{ background:#fff; }

/* === 드롭존 === */
.dropzone{
  border: 2px dashed #94a3b8;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  background: #f8fafc;
  transition: border-color .15s, background .15s;
  margin-bottom: 12px;
  cursor: pointer;
}
.dropzone.over{ border-color:#3b82f6; background:#eef6ff; }
.dz-icon{ font-size:24px; margin-bottom:6px; }
.dz-title{ font-weight:800; color:#0f172a; }
.dz-hint{ font-size:12px; color:#64748b; }

/* === 파일 리스트 === */
.sheet-files{ display:grid; gap:6px; margin-bottom:12px; }
.sheet-file{ display:grid; grid-template-columns:32px 1fr auto auto; gap:8px; align-items:center; padding:6px; border:1px solid #e5e7eb; border-radius:8px; }
.file-kind{ width:32px; text-align:center; }
.file-size{ font-size:12px; color:#64748b; }
.file-remove{ border:none; background:#f3f4f6; border-radius:6px; padding:4px 8px; cursor:pointer; }

/* === 세그먼트 === */
.seg-group{ margin:12px 0; }
.seg-label{ font-size:13px; font-weight:800; margin-bottom:4px; }
.seg-switch{ display:flex; flex-wrap:wrap; gap:6px; }
.seg-switch.multi { flex-wrap:wrap; }
.seg{ border:1px solid #E5E7EB; border-radius:20px; padding:6px 12px; cursor:pointer; }
.seg.active{ background:linear-gradient(135deg,#60A5FA,#2563EB); color:#fff; border:none; }

/* === 입력박스 === */
.sheet-input{ width:100%; border:1px solid #E5E7EB; border-radius:8px; padding:8px; }
.sheet-textarea{ width:100%; border:1px solid #E5E7EB; border-radius:10px; padding:8px; font-size:14px; }
</style>
