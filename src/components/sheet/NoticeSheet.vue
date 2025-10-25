<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <!-- 헤더 -->
        <header class="sheet-header">
          <h3 id="sheetTitle">안내문 작성 — 파일 첨부(여러개 가능)</h3>
          <button type="button" class="sheet-close" aria-label="닫기" @click="$emit('close')">✕</button>
        </header>

        <!-- 본문 -->
        <section class="sheet-body">
          <!-- 0) 파일 첨부 (제안서 시트와 동일 UI) -->
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
                application/vnd.ms-powerpoint,
                application/vnd.openxmlformats-officedocument.presentationml.presentation
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
          <div v-else class="hint" style="margin-top:8px;">
            첨부파일이 없습니다. 필요 시 드롭존을 클릭해 ‘문서 선택’ 또는 ‘이미지 선택’을 이용하세요.
          </div>

          <!-- 1) 채널 & 글자수 -->
          <div class="block">
            <div class="block-title">채널 & 글자수</div>
            <div class="pill-group" role="radiogroup" aria-label="채널 선택">
              <label
                v-for="c in channels"
                :key="c.value"
                class="pill"
                :class="{ active: channel === c.value }"
                tabindex="0"
                role="radio"
                :aria-checked="channel === c.value"
                @click="setChannel(c.value)"
                @keydown.enter.prevent="setChannel(c.value)"
                @keydown.space.prevent="setChannel(c.value)"
              >
                <input class="vh" type="radio" name="channel" :value="c.value" v-model="channel" />
                <span class="pill-text">{{ c.label }}</span>
              </label>
            </div>

            <div class="len-row">
              <template v-if="lengthMode==='exact'">
                <label class="field small">
                  <span class="label">목표 글자수</span>
                  <input class="input" type="number" min="1" :max="1000" v-model.number="charExact" />
                </label>
                <span class="hint">예: SMS 40자</span>
              </template>
              <template v-else>
                <label class="field small">
                  <span class="label">최소</span>
                  <input class="input" type="number" min="1" :max="10000" v-model.number="charMin" />
                </label>
                <label class="field small">
                  <span class="label">최대</span>
                  <input class="input" type="number" min="1" :max="10000" v-model.number="charMax" />
                </label>
                <span class="hint">예: LMS 400~500자, 카톡 100~200자</span>
              </template>
              <div class="mode-switch">
                <label class="switch">
                  <input type="checkbox" v-model="isRange" />
                  <span>범위 지정</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 2) URL 단축 + 제목 -->
          <div class="block">
            <div class="block-title-row">
              <div class="block-title">링크(제목 포함) & 단축</div>
              <div class="block-actions">
                <button class="btn-mini" type="button" @click="addLink">행 추가</button>
                <button class="btn-mini" type="button" :disabled="!links.length || isShortening" @click="shortenAll">
                  {{ isShortening ? '단축 중…' : '모두 단축' }}
                </button>
              </div>
            </div>

            <div v-if="!links.length" class="hint">링크가 없습니다. ‘행 추가’를 눌러 URL과 제목을 입력하세요. 여러 개를 붙여넣어도 됩니다.</div>

            <div class="link-table" v-else>
              <div class="link-head">
                <div class="c-title">제목</div>
                <div class="c-long">원본 URL</div>
                <div class="c-short">단축 URL</div>
                <div class="c-act">동작</div>
              </div>
              <div
                v-for="(row, idx) in links"
                :key="row.id"
                class="link-row"
              >
                <div class="c-title">
                  <input class="input" type="text" v-model.trim="row.title" placeholder="예) 상담예약 페이지" />
                </div>
                <div class="c-long">
                  <input class="input" type="text" v-model.trim="row.longUrl" placeholder="https://..." @blur="maybeAutoShorten(idx)" />
                </div>
                <div class="c-short">
                  <input class="input" type="text" v-model.trim="row.shortUrl" placeholder="단축 후 자동 입력" readonly />
                </div>
                <div class="c-act">
                  <button class="btn-mini" type="button" :disabled="!canShorten(row) || row.status==='loading'" @click="shortenOne(idx)">
                    {{ row.status==='loading' ? '단축중' : '단축' }}
                  </button>
                  <button class="btn-mini ghost" type="button" @click="removeLink(idx)">삭제</button>
                </div>
              </div>
            </div>

            <!-- 대량 붙여넣기 -->
            <details class="bulk">
              <summary>여러 URL 대량 추가</summary>
              <textarea
                class="bulk-ta"
                v-model.trim="bulkText"
                placeholder="한 줄에 하나씩 URL을 붙여넣으세요. (옵션) [제목] URL 형식도 인식합니다."
              ></textarea>
              <div class="bulk-actions">
                <button class="btn-mini" type="button" @click="parseBulk">추가</button>
                <button class="btn-mini ghost" type="button" @click="bulkText=''">지우기</button>
              </div>
            </details>
          </div>

          <!-- 3) 행동(CTA) 선택 -->
          <div class="block">
            <div class="block-title">어떤 행동을 유도할까요?</div>
            <div class="toggles">
              <button
                v-for="opt in ctaOptions"
                :key="opt"
                type="button"
                class="chip chip--toggle"
                :class="{ active: selectedCtas.has(opt) }"
                @click="toggleCta(opt)"
              >
                {{ opt }}
              </button>
            </div>
          </div>

          <!-- 4) 톤 & 옵션 (개인화 변수: 고객명 단일 입력) -->
          <div class="block">
            <div class="block-title">톤 & 옵션</div>
            <div class="row">
              <label class="field">
                <span class="label">문체(톤)</span>
                <select class="input" v-model="tone">
                  <option>정중·간결</option>
                  <option>친근·대화체</option>
                  <option>공식·안내문</option>
                  <option>세일즈·강조형</option>
                </select>
              </label>

              <!-- ✅ 개인화 변수: 고객명만 입력 -->
              <label class="field">
                <span class="label">고객명(선택)</span>
                <input class="input" type="text" v-model.trim="custName" placeholder="예) 홍길동" />
                <small class="hint">입력하지 않으면 일반 문구로 자연스럽게 대체됩니다.</small>
              </label>
            </div>

            <div class="row">
              <label class="field">
                <span class="label">필수 포함 문구(선택)</span>
                <input class="input" type="text" v-model.trim="mustInclude" placeholder="예) 무료상담, 바로 신청" />
              </label>
              <label class="field">
                <span class="label">금칙어(선택)</span>
                <input class="input" type="text" v-model.trim="bannedWords" placeholder="예) 무료증정, 100%보장" />
              </label>
            </div>

            <label class="field row">
              <span class="label">버전 수</span>
              <input class="input small" type="number" min="1" max="5" v-model.number="variants" />
              <small class="hint">요청 시 N개의 문안으로 생성</small>
            </label>
          </div>

          <!-- 5) 지시문 미리보기 -->
          <div class="block" style="display: none;">
            <div class="block-title-row">
              <div class="block-title">GPT 지시문 미리보기</div>
              <small class="hint">아래 텍스트가 부모로 전달되어 GPT 호출에 쓰입니다.</small>
            </div>
            <pre class="preview">{{ memoPreview }}</pre>
          </div>
        </section>

        <!-- 푸터 -->
        <footer class="sheet-footer">
          <button class="btn ghost" type="button" @click="$emit('close')">취소</button>
          <button
            class="btn primary"
            type="button"
            :disabled="isSending || isShortening"
            @click="emitSend"
          >
            {{ isSending || isShortening ? '준비 중…' : '조건으로 문자 생성' }}
          </button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "NoticeSheet",
  props: {
    uploadedFiles: { type: Array, default: () => [] },
    isSending: { type: Boolean, default: false },
    fileEmoji: { type: Function, required: true },
    limits: {
      type: Object,
      default: () => ({ maxFiles: 3, perFile: 50 * 1024 * 1024, total: 25 * 1024 * 1024 })
    },
    validExt: {
      type: [String, RegExp],
      default: "\\.(pdf|txt|docx|png|jpe?g|xls|xlsx|ppt|pptx)$"
    }
  },
  data() {
    return {
      // 드롭존
      isOver: false,
      dzPickerOpen: false,

      // 채널 & 길이
      channel: "LMS",
      channels: [
        { value: "SMS", label: "SMS (40자)" },
        { value: "LMS", label: "LMS (400~500자)" },
        { value: "KAKAO", label: "카카오(100~200자)" },
        { value: "CUSTOM", label: "직접 지정" },
      ],
      lengthMode: "range",
      charExact: 40,
      charMin: 400,
      charMax: 500,

      // 링크
      links: [],
      isShortening: false,
      bulkText: "",

      // CTA
      ctaOptions: ["링크접속", "상담예약", "서류제출", "결제/납입", "약관동의", "설문참여", "전화요청"],
      selectedCtas: new Set(["링크접속"]),

      // 톤 & 개인화(고객명만)
      tone: "정중·간결",
      custName: "",

      // 기타
      mustInclude: "",
      bannedWords: "",
      variants: 1,
    };
  },
  computed: {
    isRange: {
      get() { return this.lengthMode === 'range'; },
      set(v) { this.lengthMode = v ? 'range' : 'exact'; }
    },
    memoPreview() { return this.buildMemo(); }
  },
  watch: {
    channel: {
      immediate: true,
      handler(v) {
        if (v === "SMS") {
          this.lengthMode = "exact";
          this.charExact = 40;
        } else if (v === "LMS") {
          this.lengthMode = "range";
          this.charMin = 400; this.charMax = 500;
        } else if (v === "KAKAO") {
          this.lengthMode = "range";
          this.charMin = 100; this.charMax = 200;
        } else if (v === "CUSTOM") {
          if (this.lengthMode !== "exact" && this.lengthMode !== "range") this.lengthMode = "range";
        }
      }
    }
  },
  methods: {
    /* 드롭존/파일 */
    openDzPicker(){ this.dzPickerOpen = true; },
    closeDzPicker(){ this.dzPickerOpen = false; },
    _onEscClose(e){ if (e.key === 'Escape') this.closeDzPicker(); },
    pickFromDz(kind){ this.triggerPick(kind); this.closeDzPicker(); },
    triggerPick(kind){
      if (kind === "images") this.$refs.fileInputImages?.click();
      else this.$refs.fileInputDocs?.click();
    },
    onDragEnter(){ this.isOver = true; },
    onDragOver(){ this.isOver = true; },
    onDragLeave(){ this.isOver = false; },
    onDrop(e){
      this.isOver = false;
      const files = this.normalizeFiles(e?.dataTransfer?.files);
      this.validateAndEmit(files);
    },
    onPicked(e){
      const files = this.normalizeFiles(e?.target?.files);
      this.validateAndEmit(files);
      if (e?.target) e.target.value = "";
    },
    resolveEmoji(name = ""){
      if (typeof this.fileEmoji === "function") return this.fileEmoji(name);
      const lower = (name || "").toLowerCase();
      if (lower.endsWith(".pdf")) return "📕";
      if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "📘";
      if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "📗";
      if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(lower)) return "🖼";
      if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "📒";
      if (lower.endsWith(".txt")) return "📄";
      return "📎";
    },
    normalizeFiles(listLike){
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
    _bytesToMB(b){ return Math.round(b / (1024*1024)); },
    validateAndEmit(listLike){
      const incoming = this.normalizeFiles(listLike);
      if (!incoming.length) return;

      const maxFiles = this.limits?.maxFiles ?? Infinity;
      const perFile  = this.limits?.perFile  ?? Infinity;
      const total    = this.limits?.total    ?? Infinity;

      const validRe = this.validExt instanceof RegExp
        ? this.validExt
        : new RegExp(String(this.validExt), 'i');

      const baseList = Array.isArray(this.uploadedFiles) ? [...this.uploadedFiles] : [];
      const baseSeen = new Set(baseList.map(f => `${f.name}:${f.size}:${f.lastModified || 0}`));
      const currentTotal = baseList.reduce((s, f) => s + f.size, 0);

      const added = [];
      let addSize = 0;

      for (const f of incoming){
        if (!validRe.test(f.name)) { this.toast?.(`❌ 지원 안함: ${f.name}`); continue; }
        if (f.size > perFile)     { this.toast?.(`❌ ${this._bytesToMB(perFile)}MB 초과: ${f.name}`); continue; }
        if (baseList.length + added.length >= maxFiles) { this.toast?.(`❌ 최대 ${maxFiles}개 파일`); break; }
        if (currentTotal + addSize + f.size > total)    { this.toast?.(`❌ 총 ${this._bytesToMB(total)}MB 초과`); break; }

        const key = `${f.name}:${f.size}:${f.lastModified || 0}`;
        if (baseSeen.has(key)) continue;

        added.push(f);
        addSize += f.size;
        baseSeen.add(key);
      }
      if (added.length){
        this.$emit('select-files', { files: added, mode: 'append', __fromChild: true });
      }
    },

    /* 채널/글자수 */
    setChannel(v){ this.channel = v; },
    getLengthLine(){
      if (this.lengthMode === 'exact') return `정확히 ${this.charExact}자`;
      return `${this.charMin}~${this.charMax}자`;
    },

    /* 링크 단축 */
    addLink(){
      this.links.push({
        id: 'lnk-' + Math.random().toString(36).slice(2,9),
        title: '', longUrl: '', shortUrl: '', status: 'idle'
      });
    },
    removeLink(i){ this.links.splice(i,1); },
    canShorten(row){ return /^https?:\/\//i.test(row.longUrl || ""); },
    async shortenOne(i){
      const row = this.links[i];
      if (!row || !this.canShorten(row)) return;
      row.status = 'loading';
      try{
        const endpoint = 'https://asia-northeast1-qprice-db76b.cloudfunctions.net/shortlink?url=' + encodeURIComponent(row.longUrl.trim());
        const res = await fetch(endpoint, { method: 'GET' });
        if (!res.ok) throw new Error('단축 실패: ' + res.status);
        const text = (await res.text() || '').trim();
        let shortUrl = text;
        try {
          const j = JSON.parse(text);
          shortUrl = j.short || j.url || j.result || text;
        } catch (err) {
          console.warn("단축URL 응답이 JSON이 아님:", text, err);
        }
        if (!/^https?:\/\//i.test(shortUrl)) throw new Error('올바른 단축 URL 아님');
        row.shortUrl = shortUrl; row.status = 'ok';
      } catch(err){
        console.error(err); row.status = 'error';
      }
    },
    async shortenAll(){
      if (!this.links.length) return;
      this.isShortening = true;
      try{
        const jobs = this.links.map((_,i) => this.canShorten(this.links[i]) ? this.shortenOne(i) : Promise.resolve());
        await Promise.allSettled(jobs);
      } finally { this.isShortening = false; }
    },
    maybeAutoShorten(i){
      const row = this.links[i];
      if (this.canShorten(row) && !row.shortUrl) this.shortenOne(i);
    },

    /* CTA */
    toggleCta(opt){
      if (this.selectedCtas.has(opt)) this.selectedCtas.delete(opt);
      else this.selectedCtas.add(opt);
    },

    /* 메모 생성 & 전송 */
    buildMemo(){
      const lines = [];
      lines.push("【안내문 자동 작성 요청】");
      lines.push(`- 채널: ${this.channel}`);
      lines.push(`- 목표 길이: ${this.getLengthLine()}`);

      if (this.selectedCtas.size) lines.push(`- 행동 유도(CTA): ${Array.from(this.selectedCtas).join(", ")}`);
      if (this.tone) lines.push(`- 톤: ${this.tone}`);

      // ✅ 개인화 변수: 고객명만 사용 (입력 시에만 포함)
      if (this.custName && this.custName.trim()) {
        lines.push(`- 개인화 변수: 고객명=${this.custName.trim()}`);
      }
      lines.push("- 개인화 값이 없는 경우 일반 문구로 자연스럽게 대체하세요.");

      if (this.mustInclude) lines.push(`- 필수 포함: ${this.mustInclude}`);
      if (this.bannedWords) lines.push(`- 금칙어: ${this.bannedWords}`);
      if (this.uploadedFiles?.length){
        const filesStr = this.uploadedFiles.map(f=>f.name).join(", ");
        lines.push(`- 첨부파일: ${this.uploadedFiles.length}개 (${filesStr})`);
      }

      if (this.links.length){
        lines.push("- 링크 삽입 규칙: 본문 흐름에 자연스럽게 '제목: URL' 형태로 포함(괄호·각주 금지, 과다 삽입 금지).");
        lines.push("  링크 목록:");
        this.links.forEach((r, i)=>{
          const url = (r.shortUrl || r.longUrl || '').trim();
          if (!url) return;
          lines.push(`   ${i+1}. 제목: ${r.title || '(제목없음)'} / URL: ${url}`);
        });
      }

      lines.push("- 출력 형식:");
      lines.push("  1) 헤드라인 1줄(강조) → 2) 본문(핵심 정보) → 3) 마지막 한 줄 CTA.");
      lines.push("  4) 채널 특성 반영(이모지·특수문자 과하지 않게).");
      if (this.lengthMode==='exact'){ lines.push("  5) 글자수 엄수(오차 ±5자 이내)."); }
      else { lines.push("  5) 범위 내에서 자연스러운 길이로."); }
      if (this.variants > 1){ lines.push(`- 버전 수: ${this.variants}개 (의미 있게 서로 다르게).`); }
      lines.push("- 금지: 장황한 전개, 중복 문구, 과장·허위 표현.");
      lines.push("- 주의: 보험안내의 준법 톤 유지, 오해 소지 표현 지양.");

      return lines.join("\n");
    },
    emitSend(){
      const memo = this.buildMemo();
      this.$emit('send', { memo });
    },

    /* 선택: 토스트 훅과 호환 */
    toast(msg){ console.info(msg); }
  }
};
</script>

<style scoped>
/* === Bottom Sheet Overlay & Transition === */
.sheet-backdrop{
  position: fixed;
  inset: 0;
  z-index: 3002;
  background: rgba(0,0,0,.35);
  display: flex;
  justify-content: center;
  align-items: flex-end;
}
.sheet-panel{
  width: min(640px, 100vw);
  max-height: 88vh;
  background: #fff;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -12px 30px rgba(0,0,0,.18);
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.sheet-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:12px 16px;
  border-bottom:1px solid var(--aa-border);
}
.sheet-header h3{ font-size:16px; font-weight:700; }
.sheet-close{
  background:none; border:none; font-size:20px; cursor:pointer;
}
.sheet-body{
  flex:1;
  overflow-y:auto;
  padding:12px 16px 96px; /* footer 여백 */
}

/* 푸터 */
.sheet-footer{
  display:flex; gap:10px; justify-content:space-between; align-items:center;
  padding:10px 12px; border-top:1px solid var(--aa-border); background:#fff;
}
.btn{ min-height:40px; padding:0 14px; border-radius:10px; border:1px solid var(--aa-border); background:#fff; cursor:pointer; font-weight:700; }
.btn.primary{ background: linear-gradient(135deg, var(--aa-primary) 0%, var(--aa-primary-2) 100%); color:#fff; border:none; }
.btn.ghost{ background:#fff; }
.btn-mini{ padding:4px 8px; font-size:13px; border:1px solid var(--aa-border); border-radius:6px; cursor:pointer; background:#fff; }
.btn-mini.ghost{ background:#f9fafb; }

/* 트랜지션 */
.sheet-fade-enter-active,
.sheet-fade-leave-active{ transition: opacity .18s ease; }
.sheet-fade-enter-from,
.sheet-fade-leave-to{ opacity: 0; }
.sheet-fade-enter-active .sheet-panel,
.sheet-fade-leave-active .sheet-panel{ transition: transform .24s ease; }
.sheet-fade-enter-from .sheet-panel,
.sheet-fade-leave-to .sheet-panel{ transform: translateY(24px); }

/* 섹션 공통 */
.block { padding: 10px 12px; border-bottom: 1px solid var(--aa-border); }
.block:last-child { border-bottom: none; }
.block-title { font-weight: 800; margin-bottom: 8px; }
.block-title-row{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
.block-actions{ display:flex; gap:6px; }

/* 입력/필드 */
.field { display: flex; flex-direction: column; gap: 6px; }
.field.small { max-width: 120px; }
.label { font-size: 12px; color: #374151; }
.input { border: 1px solid var(--aa-border); border-radius: 8px; padding: 8px 10px; font-size: 14px; }
.input.small { max-width: 80px; }
.hint { font-size: 12px; color: #6b7280; }

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

/* 파일 리스트 (제안서 시트 동일) */
.sheet-files{ margin-top:12px; display:grid; gap:8px; }
.sheet-file{
  display:grid; grid-template-columns:32px 1fr auto auto;
  align-items:center; gap:8px;
  padding:8px; border:1px solid #e5e7eb; border-radius:10px; background:#fff;
}
.file-kind{ width:32px; text-align:center; }
.file-name{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.file-size{ font-size:12px; color:#64748b; }
.file-remove{ border:1px solid #e5e7eb; background:#f9fafb; border-radius:8px; padding:4px 8px; cursor:pointer; }
.file-remove:hover{ background:#f3f4f6; }

/* 길이/스위치/칩 등 */
.len-row{ display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; margin-top:6px; }
.mode-switch{ margin-left:auto; }
.switch{ display:inline-flex; align-items:center; gap:6px; cursor:pointer; }
.toggles{ display:flex; flex-wrap:wrap; gap:8px; }
.chip{ border:1px solid var(--aa-border); border-radius:999px; padding:8px 12px; background:#fff; cursor:pointer; }
.chip--toggle.active{ background:#eef2ff; border-color:#a5b4fc; }

/* 링크 테이블 */
.link-table{ border:1px solid var(--aa-border); border-radius:10px; overflow:hidden; }
.link-head, .link-row{
  display:grid; grid-template-columns: 1.2fr 2fr 1.4fr 0.8fr; gap:8px; align-items:center;
}
.link-head{ background:#f9fafb; font-weight:700; padding:8px; }
.link-row{ padding:8px; border-top:1px solid #f1f5f9; }
.c-title,.c-long,.c-short,.c-act{ display:flex; align-items:center; }
.c-act{ gap:6px; justify-content:flex-start; }

/* 대량 붙여넣기 */
.bulk{ margin-top:8px; }
.bulk-ta{ width:100%; min-height:80px; border:1px solid var(--aa-border); border-radius:10px; padding:8px; }
.bulk-actions{ display:flex; gap:6px; margin-top:6px; }

/* 미리보기 */
.preview{
  white-space:pre-wrap; background:#f8fafc; border:1px solid var(--aa-border);
  border-radius:12px; padding:10px; font-size:13px; line-height:1.5;
}

/* 유틸 */
.vh{ position:absolute!important; clip:rect(1px,1px,1px,1px); width:1px; height:1px; overflow:hidden; }
.pill{ display:inline-flex; align-items:center; padding:8px 14px; border-radius:999px; border:1px solid #E5E7EB; background:#F3F4F6; cursor:pointer; }
.pill.active{ background:rgba(99,102,241,.12); border-color:var(--aa-primary); color:#1f2a73; }
.pill-text{ font-weight:700; }
</style>
