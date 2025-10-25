<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true">

        <!-- 헤더 -->
        <header class="sheet-header">
          <h3>마케팅 콘텐츠 생성</h3>
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

          <!-- 채널 선택 -->
          <div class="seg-group">
            <div class="seg-label">채널 선택</div>
            <div class="seg-switch fancy">
              <button
                v-for="c in channelOptions"
                :key="c.text"
                type="button"
                class="seg fancy-btn"
                :class="{ active: selectedChannel === c.text }"
                @click="setChannel(c.text)"
              >
                {{ c.text }}
              </button>
            </div>
          </div>

          <!-- 블로그 옵션 -->
          <div v-if="selectedChannel==='블로그'" class="option-box">
            <label>블로그명</label>
            <input v-model="blogName" placeholder="예: 네이버 블로그 / 티스토리" />
            <label>주제</label>
            <input v-model="blogTopic" placeholder="예: 보험 비교, 재무 관리" />
            <label>메인 키워드</label>
            <input v-model="blogKeyword" placeholder="예: 자동차보험, 암보험" />
          </div>

          <!-- SNS 옵션 -->
          <div v-if="selectedChannel==='SNS'" class="option-box">
            <label>SNS 종류</label>
            <select v-model="snsType">
              <option>인스타그램</option>
              <option>페이스북</option>
              <option>틱톡</option>
              <option>유튜브 쇼츠</option>
            </select>

            <!-- SNS 상세 옵션 선택 -->
            <div class="seg-group">
              <div class="seg-label">SNS 콘텐츠 유형 선택</div>
              <div class="seg-switch fancy">
                <button
                  v-for="opt in snsOptionTypes"
                  :key="opt.text"
                  type="button"
                  class="seg fancy-btn"
                  :class="{ active: selectedSnsOption === opt.text }"
                  @click="setSnsOption(opt.text)"
                >
                  {{ opt.text }}
                </button>
              </div>
            </div>

            <!-- 선택된 SNS 옵션별 입력 필드 -->
            <div v-if="selectedSnsOption==='릴스주제'" class="option-box">
              <h4>② 릴스 주제</h4>
              <input v-model="snsTarget" placeholder="타깃층" />
              <input v-model="snsDirection" placeholder="계정 방향성" />
            </div>

            <div v-if="selectedSnsOption==='후킹멘트'" class="option-box">
              <h4>③ 후킹 멘트</h4>
              <input v-model="snsHookTarget" placeholder="타깃층" />
              <input v-model="snsHookTopic" placeholder="릴스 주제" />
            </div>

            <div v-if="selectedSnsOption==='추천해시태그'" class="option-box">
              <h4>④ 추천 해시태그</h4>
              <input v-model="snsTagTarget" placeholder="타깃층" />
              <input v-model="snsTagTopic" placeholder="릴스 주제" />
            </div>
          </div>

          <div v-if="selectedSnsOption==='프로필세팅'" class="option-box">
            <h4>① 프로필 세팅</h4>
            <input v-model="snsCareer" placeholder="커리어 / 장점" />
            <input v-model="snsContentDir" placeholder="콘텐츠 방향성" />
            <input v-model="snsTone" placeholder="원하는 어조" />
            <input v-model="snsLink" placeholder="링크 유도 텍스트" />
          </div>

          <!-- 사용자 메모 -->
          <div class="memo-group">
            <textarea
              v-model="userMemo"
              class="sheet-textarea"
              rows="5"
              placeholder="추가 사항 입력 (캠페인 목적, 예산, 타깃 고객 등)"
              @input="composeMemo"
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
  name: "MarketingContentSheet",
  props: { isSending: { type: Boolean, default: false } },
  emits: ["close", "send"],
  data() {
    return {
      uploadedFiles: [],
      isOver: false,
      dzPickerOpen: false,
      selectedChannel: "블로그",
      // 블로그 옵션
      blogName: "", blogTopic: "", blogKeyword: "",
      // SNS 옵션
      snsType: "인스타그램",
      selectedSnsOption: "릴스주제",
      snsCareer: "", snsContentDir: "", snsTone: "", snsLink: "",
      snsTarget: "", snsDirection: "",
      snsHookTarget: "", snsHookTopic: "",
      snsTagTarget: "", snsTagTopic: "",
      userMemo: "",
      channelOptions: [{ text: "블로그" }, { text: "SNS" }],
      snsOptionTypes: [
        { text: "릴스주제" },
        { text: "후킹멘트" },
        { text: "추천해시태그" },
        { text: "프로필세팅" }
      ],
      memo: ""
    }
  },
  methods: {
    setChannel(v){ this.selectedChannel = v; this.composeMemo(); },
    setSnsOption(v){ this.selectedSnsOption = v; this.composeMemo(); },
    buildAutoOutline(){
      const lines = [];
      lines.push("[마케팅 콘텐츠 생성 요청]");
      lines.push(`- 채널: ${this.selectedChannel}`);
      if(this.selectedChannel==="블로그"){
        if(this.blogName) lines.push(`- 블로그명: ${this.blogName}`);
        if(this.blogTopic) lines.push(`- 주제: ${this.blogTopic}`);
        if(this.blogKeyword) lines.push(`- 메인 키워드: ${this.blogKeyword}`);
      }
      if(this.selectedChannel==="SNS"){
        lines.push(`- SNS 종류: ${this.snsType}`);
        lines.push(`- 선택된 옵션: ${this.selectedSnsOption}`);
        if(this.selectedSnsOption==="프로필세팅"){
          if(this.snsCareer) lines.push(`  • 커리어: ${this.snsCareer}`);
          if(this.snsContentDir) lines.push(`  • 콘텐츠방향성: ${this.snsContentDir}`);
          if(this.snsTone) lines.push(`  • 어조: ${this.snsTone}`);
          if(this.snsLink) lines.push(`  • 링크유도: ${this.snsLink}`);
        }
        if(this.selectedSnsOption==="릴스주제"){
          if(this.snsTarget) lines.push(`  • 타깃층: ${this.snsTarget}`);
          if(this.snsDirection) lines.push(`  • 계정 방향성: ${this.snsDirection}`);
        }
        if(this.selectedSnsOption==="후킹멘트"){
          if(this.snsHookTarget||this.snsHookTopic)
            lines.push(`  • ${this.snsHookTarget} 대상, 주제: ${this.snsHookTopic}`);
        }
        if(this.selectedSnsOption==="추천해시태그"){
          if(this.snsTagTarget||this.snsTagTopic)
            lines.push(`  • ${this.snsTagTarget} 대상, 주제: ${this.snsTagTopic}`);
        }
      }
      return lines.join("\n");
    },
    composeMemo(){
      //const auto = `[[HIDDEN_START]]${this.buildAutoOutline()}[[HIDDEN_END]]`;
      const auto = this.buildAutoOutline();
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
.sheet-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:flex-end; justify-content:center; z-index:3002; }
.sheet-panel{ width:min(600px,100vw); max-height:82vh; background:#fff; border-top-left-radius:16px; border-top-right-radius:16px; display:flex; flex-direction:column; }
.sheet-header{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #E5E7EB; }
.sheet-header h3{ font-size:16px; font-weight:800; margin:0; }
.sheet-close{ border:none; background:#f3f4f6; border-radius:8px; padding:6px 8px; cursor:pointer; }
.sheet-body{ padding:16px; overflow-y:auto; flex:1 1 auto; }
.sheet-footer{ padding:12px; border-top:1px solid #E5E7EB; display:flex; justify-content:flex-end; gap:8px; background:#fff; }

/* ===== 버튼 ===== */
.btn{ padding:6px 12px; border-radius:8px; border:1px solid #E5E7EB; font-weight:700; cursor:pointer; font-size:14px; transition:all .2s ease; }
.btn.primary{ background:linear-gradient(135deg,#60A5FA,#2563EB); color:#fff; border:none; }
.btn.primary:hover{ background:linear-gradient(135deg,#3B82F6,#1D4ED8); }
.btn.ghost{ background:#fff; color:#374151; }
.btn.ghost:hover{ background:#f9fafb; }

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

/* ===== 세그먼트 버튼 ===== */
.seg-group{ margin:12px 0; }
.seg-label{ font-size:13px; font-weight:800; margin-bottom:4px; }
.seg-switch{ display:flex; flex-wrap:wrap; gap:8px; }
.seg.fancy-btn{
  padding: 10px 16px;
  border-radius: 30px;
  border: 1px solid #d1d5db;
  background: #fff;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all .2s ease;
}
.seg.fancy-btn:hover{ background:#f3f4f6; }
.seg.fancy-btn.active{
  background: linear-gradient(135deg,#60A5FA,#2563EB);
  color:#fff;
  border: none;
  box-shadow: 0 3px 6px rgba(0,0,0,.15);
}

/* ===== 메모 & 옵션 ===== */
.memo-group{ margin-top:12px; }
.sheet-textarea{ width:100%; border:1px solid #E5E7EB; border-radius:10px; padding:8px; font-size:14px; }
.option-box{ margin:12px 0; display:flex; flex-direction:column; gap:8px; padding:12px; border:1px solid #E5E7EB; border-radius:12px; background:#f9fafb; }
.option-box label{ font-weight:700; font-size:13px; }
.option-box input, .option-box select{ border:1px solid #E5E7EB; border-radius:8px; padding:6px; font-size:14px; background:#fff; }
</style>
