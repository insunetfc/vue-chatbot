<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true">
        
        <!-- 헤더 -->
        <header class="sheet-header">
          <h3>보험금 청구 가능 금액 확인</h3>
          <button class="sheet-close" @click="$emit('close')">✕</button>
        </header>

        <!-- 바디 -->
        <section class="sheet-body">

          <!-- 가입내역 업로드 -->
          <div class="seg-group">
            <div class="seg-label">가입내역 파일</div>
            <div
              class="dropzone"
              :class="{ over: isOverContract }"
              @click="openDzPicker('contract')"
              @dragenter.prevent="onDragEnter('contract')"
              @dragleave.prevent="onDragLeave('contract')"
              @dragover.prevent
              @drop.prevent="onDrop('contract', $event)"
            >
              <div class="dz-icon">📑</div>
              <div class="dz-title">가입설계서 또는 보험증권 업로드</div>
              <div class="dz-hint">PDF, Word, Excel, 이미지 모두 가능</div>
              <input
                ref="contractInput"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                style="display:none"
                @change="onPicked('contract', $event)"
              />

              <!-- 📁 드롭존 클릭용 미니 픽커 -->
              <div
                v-if="dzPickerOpen && dzPickerTarget === 'contract'"
                class="dz-picker"
                role="dialog"
                aria-label="파일 유형 선택"
              >
                <button class="dz-pick-btn" @click.stop="pickFromDz('contract', 'docs')">📄 문서 선택</button>
                <button class="dz-pick-btn" @click.stop="pickFromDz('contract', 'images')">🖼 이미지 선택</button>
                <button class="dz-pick-cancel" @click.stop="closeDzPicker">취소</button>
              </div>
              <div v-if="dzPickerOpen && dzPickerTarget === 'contract'" class="dz-picker-mask" @click="closeDzPicker" />
            </div>

            <div v-if="contractFile" class="sheet-file">
              <div class="file-kind">{{ resolveEmoji(contractFile.name) }}</div>
              <div class="file-name">{{ contractFile.name }}</div>
              <div class="file-size">{{ (contractFile.size / 1024 / 1024).toFixed(2) }} MB</div>
              <button class="file-remove" @click="removeFile('contract')">삭제</button>
            </div>
          </div>

          <!-- 약관 업로드 -->
          <div class="seg-group">
            <div class="seg-label">보험약관 파일</div>
            <div
              class="dropzone"
              :class="{ over: isOverTerms }"
              @click="openDzPicker('terms')"
              @dragenter.prevent="onDragEnter('terms')"
              @dragleave.prevent="onDragLeave('terms')"
              @dragover.prevent
              @drop.prevent="onDrop('terms', $event)"
            >
              <div class="dz-icon">📚</div>
              <div class="dz-title">보험약관 업로드</div>
              <div class="dz-hint">PDF 또는 Word 권장</div>
              <input
                ref="termsInput"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                style="display:none"
                @change="onPicked('terms', $event)"
              />

              <!-- 📁 드롭존 클릭용 미니 픽커 -->
              <div
                v-if="dzPickerOpen && dzPickerTarget === 'terms'"
                class="dz-picker"
                role="dialog"
                aria-label="파일 유형 선택"
              >
                <button class="dz-pick-btn" @click.stop="pickFromDz('terms', 'docs')">📄 문서 선택</button>
                <button class="dz-pick-btn" @click.stop="pickFromDz('terms', 'images')">🖼 이미지 선택</button>
                <button class="dz-pick-cancel" @click.stop="closeDzPicker">취소</button>
              </div>
              <div v-if="dzPickerOpen && dzPickerTarget === 'terms'" class="dz-picker-mask" @click="closeDzPicker" />
            </div>

            <div v-if="termsFile" class="sheet-file">
              <div class="file-kind">{{ resolveEmoji(termsFile.name) }}</div>
              <div class="file-name">{{ termsFile.name }}</div>
              <div class="file-size">{{ (termsFile.size / 1024 / 1024).toFixed(2) }} MB</div>
              <button class="file-remove" @click="removeFile('terms')">삭제</button>
            </div>
          </div>

          <!-- 사고 내용 -->
          <div class="memo-group">
            <textarea
              v-model="accidentDesc"
              class="sheet-textarea"
              rows="5"
              placeholder="예: 척추 골절로 2개월 입원 치료 후 운전자보험 청구 예정"
            ></textarea>
          </div>

        </section>

        <!-- 풋터 -->
        <footer class="sheet-footer">
          <button class="btn ghost" @click="$emit('close')">취소</button>
          <button class="btn primary" :disabled="isSending" @click="handleSend">
            확인 요청
          </button>
        </footer>

        <!-- 📣 토스트 알림 -->
        <transition name="toast-fade">
          <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
        </transition>

      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "ClaimCheckSheet",
  props: {
    isSending: { type: Boolean, default: false }
  },
  emits: ["close", "send"],
  data() {
    return {
      contractFile: null,
      termsFile: null,
      accidentDesc: "",
      isOverContract: false,
      isOverTerms: false,
      memo: "",
      toastMessage: "",
      dzPickerOpen: false,         // ✅ 미니 픽커 열림 상태
      dzPickerTarget: null         // ✅ 어떤 드롭존인지 (contract / terms)
    };
  },
  computed: {
    isReady() {
      return this.contractFile && this.termsFile && this.accidentDesc.trim().length > 0;
    }
  },
  methods: {
    // ✅ 드롭존 미니 픽커 열기
    openDzPicker(target) {
      this.dzPickerTarget = target;
      this.dzPickerOpen = true;
    },
    closeDzPicker() {
      this.dzPickerOpen = false;
      this.dzPickerTarget = null;
    },
    pickFromDz(target, type) {
      const input = target === "contract" ? this.$refs.contractInput : this.$refs.termsInput;
      if (type === "docs") input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.txt";
      if (type === "images") input.accept = "image/*";
      input.click();
      this.closeDzPicker();
    },

    pickFile(type) {
      if (type === "contract") this.$refs.contractInput.click();
      else this.$refs.termsInput.click();
    },
    onPicked(type, e) {
      const file = e.target.files[0];
      if (type === "contract") this.contractFile = file;
      else this.termsFile = file;
    },
    onDrop(type, e) {
      const file = e.dataTransfer.files[0];
      if (type === "contract") this.contractFile = file;
      else this.termsFile = file;
      if (type === "contract") this.isOverContract = false;
      else this.isOverTerms = false;
    },
    onDragEnter(type) {
      if (type === "contract") this.isOverContract = true;
      else this.isOverTerms = true;
    },
    onDragLeave(type) {
      if (type === "contract") this.isOverContract = false;
      else this.isOverTerms = false;
    },
    removeFile(type) {
      if (type === "contract") this.contractFile = null;
      else this.termsFile = null;
    },

    buildAutoScript() {
      const lines = [];
      lines.push("[보험금 청구 검토 요청]");
      if (this.accidentDesc.trim()) {
        lines.push(`- 사고 내용: ${this.accidentDesc.trim()}`);
      }
      if (this.contractFile) {
        lines.push("- 가입 내역: 첨부된 가입설계서/보험증권 참조");
      }
      if (this.termsFile) {
        lines.push("- 약관 정보: 첨부된 보험약관 참조");
      }
      lines.push("→ 첨부된 자료를 분석하여 보상 가능한 항목과 지급 가능한 보험금, 그리고 약관 근거를 표로 정리해 주세요.");
      return lines.join("\n");
    },

    composeMemo() {
      const auto = `[[HIDDEN_START]]${this.buildAutoScript()}[[HIDDEN_END]]`;
      this.memo = auto;
    },

    handleSend() {
      console.log("📌 [handleSend] 버튼 클릭됨"); // ✅ 버튼 눌림 확인
    
      if (!this.contractFile) {
        console.warn("⚠️ [handleSend] 가입설계서/보험증권 파일이 없음");
        return this.showToast("📑 가입설계서 또는 보험증권 파일을 업로드하세요.");
      }
      console.log("✅ [handleSend] 가입설계서 파일:", this.contractFile.name);
    
      if (!this.termsFile) {
        console.warn("⚠️ [handleSend] 보험약관 파일이 없음");
        return this.showToast("📚 보험약관 파일을 업로드하세요.");
      }
      console.log("✅ [handleSend] 약관 파일:", this.termsFile.name);
    
      if (this.accidentDesc.trim().length === 0) {
        console.warn("⚠️ [handleSend] 사고 내용 미입력");
        return this.showToast("✏️ 사고 내용을 입력해주세요.");
      }
      console.log("✅ [handleSend] 사고 내용:", this.accidentDesc);
    
      // 메모 조합
      this.composeMemo();
      console.log("🧠 [handleSend] 생성된 메모:", this.memo);
    
      const files = [];
      // ✅ 가입내역 파일: [가입내용] + 원래 파일명
      if (this.contractFile) {
        const renamedContract = new File(
          [this.contractFile],
          `[가입내용]${this.contractFile.name}`,
          {
            type: this.contractFile.type,
            lastModified: this.contractFile.lastModified
          }
        );
        files.push(renamedContract);
      }
    
      // ✅ 보험약관 파일: [보험약관] + 원래 파일명
      if (this.termsFile) {
        const renamedTerms = new File(
          [this.termsFile],
          `[보험약관]${this.termsFile.name}`,
          {
            type: this.termsFile.type,
            lastModified: this.termsFile.lastModified
          }
        );
        files.push(renamedTerms);
      }
    
      console.log("📤 [handleSend] emit 직전 payload:", {
        memo: this.memo,
        files: files.map(f => f.name)
      });
    
      // 부모로 이벤트 emit
      this.$emit("send", {
        memo: this.memo,
        files
      });
      console.log("🚀 [handleSend] send 이벤트 emit 완료");
    },


    showToast(msg) {
      this.toastMessage = msg;
      setTimeout(() => {
        this.toastMessage = "";
      }, 2500);
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
/* 기존 스타일 그대로 유지 */
.sheet-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:flex-end; justify-content:center; z-index:3002; }
.sheet-panel{ width:min(600px,100vw); max-height:82vh; background:#fff; border-top-left-radius:16px; border-top-right-radius:16px; display:flex; flex-direction:column; position:relative; }
.sheet-header{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #E5E7EB; }
.sheet-header h3{ font-size:16px; font-weight:800; margin:0; }
.sheet-close{ border:none; background:#f3f4f6; border-radius:8px; padding:6px 8px; cursor:pointer; }
.sheet-body{ padding:16px; overflow-y:auto; flex:1 1 auto; }
.sheet-footer{ padding:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:flex-end; gap:8px; background:#fff; }
.btn{ padding:6px 12px; border-radius:8px; border:1px solid #E5E7EB; font-weight:700; cursor:pointer; }
.btn.primary{ background:linear-gradient(135deg,#60A5FA,#2563EB); color:#fff; border:none; }
.btn.ghost{ background:#fff; }
.dropzone{ border:2px dashed #94a3b8; border-radius:12px; padding:20px; text-align:center; background:#f8fafc; margin-bottom:12px; cursor:pointer; position:relative; transition: border-color .15s, background .15s; }
.dropzone.over{ border-color:#3b82f6; background:#eef6ff; }
.dz-icon{ font-size:24px; margin-bottom:6px; }
.dz-title{ font-weight:800; color:#0f172a; }
.dz-hint{ font-size:12px; color:#64748b; }

.sheet-files{ display:grid; gap:6px; margin-bottom:12px; }
.sheet-file{ display:grid; grid-template-columns:32px 1fr auto auto; gap:8px; align-items:center; padding:6px; border:1px solid #e5e7eb; border-radius:8px; }
.file-kind{ width:32px; text-align:center; }
.file-size{ font-size:12px; color:#64748b; }
.file-remove{ border:none; background:#f3f4f6; border-radius:6px; padding:4px 8px; cursor:pointer; }
.seg-group{ margin:12px 0; }
.seg-label{ font-size:13px; font-weight:800; margin-bottom:4px; }
.memo-group{ margin-top:12px; }
.sheet-textarea{ width:100%; border:1px solid #E5E7EB; border-radius:10px; padding:8px; font-size:14px; }

/* ✅ 미니 픽커 스타일 */
.dz-picker{
  position:absolute;
  inset:50% auto auto 50%;
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

/* ✅ 토스트 */
.toast {
  position: absolute;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: #fff;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 9999;
}
.toast-fade-enter-active, .toast-fade-leave-active {
  transition: opacity .3s;
}
.toast-fade-enter, .toast-fade-leave-to {
  opacity: 0;
}
</style>
