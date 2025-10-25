<template>
  <transition name="sheet-fade">
    <div class="sheet-backdrop" @click.self="$emit('close')">
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <!-- 헤더 -->
        <header class="sheet-header">
          <h3 id="sheetTitle">예상수수료·시상분석 — 보험사/기준월별 자동계산</h3>
          <button type="button" class="sheet-close" aria-label="닫기" @click="$emit('close')">✕</button>
        </header>

        <!-- 바디 -->
        <section class="sheet-body">
          <!-- 보험사 탭 & 기준 월 -->
          <section class="block">
            <div class="insurer-tabs" role="tablist" aria-label="보험사 선택">
              <button
                v-for="b in brands"
                :key="b"
                class="insurer-tab"
                :class="{ active: form.brand === b }"
                role="tab"
                :aria-selected="form.brand === b"
                @click="selectBrand(b)"
              >
                {{ b }}
              </button>
            </div>

            <div class="grid2 mt8">
              <div class="form-row">
                <label class="label">선택된 보험사</label>
                <input class="input" type="text" :value="form.brand" disabled />
              </div>

              <!-- 달력: 라벨/박스 어디를 눌러도 열림 -->
              <div
                class="form-row month-click"
                role="button"
                tabindex="0"
                aria-label="기준 월 선택"
                @click="openMonthPicker"
                @keydown.enter.prevent="openMonthPicker"
                @keydown.space.prevent="openMonthPicker"
              >
                <label class="label" for="yearMonth">기준 월</label>
                <input
                  id="yearMonth"
                  ref="yearMonth"
                  v-model="yearMonth"
                  class="input"
                  type="month"
                  @change="onYearMonthChange"
                />
              </div>
            </div>
          </section>

          <!-- 상담원 개인 실적 입력 (⚠ 5주차가 없으면 자동 미표시) -->
          <section class="block">
            <div class="block-head">
              <h4 class="block-title">상담원 개인 실적 입력</h4>
            </div>

            <div class="grid3">
              <!-- 전월 합계(라벨은 전월 3주차 시작~말일 자동 표기) -->
              <div class="form-row">
                <label class="label">{{ augLabel }}</label>
                <input
                  class="input money"
                  :value="displayMoney(input.augAmount)"
                  @input="input.augAmount = parseMoney($event.target.value)"
                  inputmode="numeric"
                  placeholder="예) 300,000"
                />
              </div>

              <!-- 기준월 주차 입력: monthPolicy.weeks에 따라 동적 생성 -->
              <div class="form-row" v-for="w in monthPolicy.weeks" :key="'in-'+w.weekNo">
                <label class="label">{{ weekLabel(w) }}</label>
                <input
                  class="input money"
                  :value="displayMoney(weekInputs[w.weekNo])"
                  @input="weekInputs[w.weekNo] = parseMoney($event.target.value)"
                  inputmode="numeric"
                  :disabled="!w.active"
                  placeholder="예) 100,000"
                />
              </div>
            </div>
          </section>

          <!-- 자동 계산 결과 -->
          <section class="block">
            <div class="block-head">
              <h4 class="block-title">자동 계산 결과</h4>
            </div>

            <div class="grid3">
              <div class="form-row">
                <label class="label">기준월 합계(원)</label>
                <input class="input" :value="fmt(derived.septTotal)" type="text" disabled />
              </div>
              <div class="form-row">
                <label class="label">브릿지 시상금(원)</label>
                <input class="input" :value="fmt(derived.bridgeReward)" type="text" disabled />
              </div>
              <div class="form-row">
                <label class="label">주차 시상 합계(원)</label>
                <input class="input" :value="fmt(derived.weeklyReward)" type="text" disabled />
              </div>
            </div>

            <div class="grid3 mt8">
              <div class="form-row">
                <label class="label">예상 총수령액(원)</label>
                <input class="input" :value="fmt(derived.total)" type="text" disabled />
              </div>
              <div class="form-row">
                <label class="label">브릿지 달성</label>
                <input class="input" :value="derived.bridgeHit ? 'YES' : 'NO'" type="text" disabled />
              </div>
            </div>
          </section>

          <!-- 보험사별 정책 — 브릿지 규칙 (priority 제거) -->
          <section class="block">
            <div class="block-head">
              <h4 class="block-title">보험사별 정책 — 브릿지 규칙</h4>
              <div class="row-actions">
                <button class="small" @click="addBridgeRule">+ 규칙 추가</button>
                <button class="small" @click="saveBrandPolicy">저장</button>
              </div>
            </div>

            <div class="tiers">
              <div class="tier-row" v-for="(r, i) in policy.bridgeRules" :key="r.id">
                <div class="grid3">
                  <div class="form-row">
                    <label class="label">전월 최소(원)</label>
                    <input
                      class="input money"
                      :value="displayMoney(r.minAug)"
                      @input="r.minAug = parseMoney($event.target.value)"
                      inputmode="numeric"
                      placeholder="예) 300,000"
                    />
                  </div>
                  <div class="form-row">
                    <label class="label">기준월 최소(원)</label>
                    <input
                      class="input money"
                      :value="displayMoney(r.minSept)"
                      @input="r.minSept = parseMoney($event.target.value)"
                      inputmode="numeric"
                      placeholder="예) 100,000"
                    />
                  </div>
                  <div class="form-row">
                    <label class="label">브릿지 시상금(원)</label>
                    <input
                      class="input money"
                      :value="displayMoney(r.reward)"
                      @input="r.reward = parseMoney($event.target.value)"
                      inputmode="numeric"
                      placeholder="예) 600,000"
                    />
                  </div>
                </div>
                <div class="tier-actions">
                  <button class="small danger" @click="removeBridgeRule(i)">삭제</button>
                </div>
              </div>
            </div>
          </section>

          <!-- 기준월 주차 설정(자동 생성 + 수동 수정 가능) -->
          <section class="block">
            <div class="block-head">
              <h4 class="block-title">기준월 주차 설정(자동 생성됨 • 필요 시 수정)</h4>
              <div class="row-actions">
                <button class="small" @click="autoFillWeeks">주차 자동 채우기</button>
                <button class="small" @click="saveMonthPolicy">저장</button>
              </div>
            </div>

            <div class="tiers">
              <div class="tier-row" v-for="w in monthPolicy.weeks" :key="w.weekNo">
                <div class="grid4">
                  <div class="form-row">
                    <label class="label">주차</label>
                    <input class="input" type="text" :value="`${w.weekNo}주차`" disabled />
                  </div>
                  <div class="form-row">
                    <label class="label">시작일</label>
                    <input v-model="w.start" class="input" type="date" />
                  </div>
                  <div class="form-row">
                    <label class="label">종료일</label>
                    <input v-model="w.end" class="input" type="date" />
                  </div>
                  <div class="form-row">
                    <label class="label">활성화</label>
                    <select v-model="w.active" class="input">
                      <option :value="true">사용</option>
                      <option :value="false">미사용</option>
                    </select>
                  </div>
                </div>

                <!-- 주차 시상: 금액 구간별 보상 -->
                <div class="grid4 mt8">
                  <div class="form-row">
                    <label class="label">10만 이상 보상(원)</label>
                    <input
                      class="input money"
                      :value="displayMoney(w.r10)"
                      @input="w.r10 = parseMoney($event.target.value)"
                      inputmode="numeric"
                      placeholder="예) 100,000"
                    />
                  </div>
                  <div class="form-row">
                    <label class="label">20만 이상 보상(원)</label>
                    <input
                      class="input money"
                      :value="displayMoney(w.r20)"
                      @input="w.r20 = parseMoney($event.target.value)"
                      inputmode="numeric"
                      placeholder="예) 200,000"
                    />
                  </div>
                  <div class="form-row">
                    <label class="label">30만 이상 보상(원)</label>
                    <input
                      class="input money"
                      :value="displayMoney(w.r30)"
                      @input="w.r30 = parseMoney($event.target.value)"
                      inputmode="numeric"
                      placeholder="예) 300,000"
                    />
                  </div>
                  <div class="form-row">
                    <label class="label">50만 이상 보상(원)</label>
                    <input
                      class="input money"
                      :value="displayMoney(w.r50)"
                      @input="w.r50 = parseMoney($event.target.value)"
                      inputmode="numeric"
                      placeholder="예) 500,000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 메모 -->
          <section class="block">
            <div class="block-head">
              <h4 class="block-title">질문/요청 메모</h4>
            </div>
            <textarea
              v-model="memo"
              class="sheet-textarea"
              rows="3"
              placeholder="예) 2주차 보상 상향 검토, 4주차 기간 조정 필요 등"
              @input="emitPreview"
            />
          </section>
        </section>

        <!-- 토스트 -->
        <div v-if="showToastFlag" class="toast" role="status" aria-live="polite">
          {{ toastMsg }}
        </div>

        <!-- 풋터 -->
        <footer class="sheet-footer">
          <div class="sheet-cta">
            <button class="btn ghost" type="button" @click="$emit('close')">취소</button>
            <button class="btn primary" type="button" :disabled="isSending" @click="handleSend">
              시뮬레이션 요청
            </button>
          </div>
        </footer>
      </div>
    </div>
  </transition>
</template>


<script>
const LS_KEY_POLICY_PREFIX = 'bonusPlanner.brandPolicy.';        // 보험사 공통(브릿지)
const LS_KEY_POLICY_MONTH_PREFIX = 'bonusPlanner.brandMonth.';   // 보험사+기준월(주차별)

function uid(){ return crypto.randomUUID?.() || String(Math.random()); }
function pad2(n){ return String(n).padStart(2,'0'); }
function lastDayOfMonth(y, m){ return new Date(y, m, 0).getDate(); } // m:1-12
function ymd(y,m,d){ return `${y}-${pad2(m)}-${pad2(d)}`; }

export default {
  name: 'BonusPlannerSheet',
  props: {
    isSending: { type: Boolean, default: false },
    categorySuffix: { type: String, default: '' },
  },
  emits: ['close', 'send', 'memo-change'],
  data(){
    const now = new Date();
    const ymDefault = `${now.getFullYear()}-${pad2(now.getMonth()+1)}`;
    return {
      brands: ['현대','삼성','디비','KB','한화','흥국','롯데','메리츠','기타'],
      yearMonth: ymDefault,
      form: { brand: '현대' },

      // 보험사 공통 정책(브릿지) — priority 제거
      policy: {
        bridgeRules: [
          { id: uid(), minAug: 500000, minSept: 100000, reward: 1800000 },
          { id: uid(), minAug: 300000, minSept: 100000, reward:  800000 },
          { id: uid(), minAug: 200000, minSept: 100000, reward:  600000 },
          { id: uid(), minAug: 100000, minSept: 100000, reward:  200000 },
        ],
      },

      // 기준월별 주차 정책(날짜/보상)
      monthPolicy: {
        weeks: [] // {weekNo, start:'YYYY-MM-DD', end:'YYYY-MM-DD', active:true, r10,r20,r30,r50}
      },

      // 상담원 입력
      input: { augAmount: 0 },  // 전월 합계
      weekInputs: {},           // 주차 수에 맞춰 동기화

      // UI
      memo: '',
      toastMsg: '',
      showToastFlag: false,
    };
  },
  computed:{
    // 전월 구간 라벨(전월 3주차 시작 ~ 전월 말일 자동 반영)
    augLabel(){
      const r = this.calcPrevSpanRangeFromWeeks();
      return `${r.prevM}월 실적(원) [${r.prevM}/${pad2(r.prevStart)}~${r.prevM}/${pad2(r.prevEnd)}]`;
    },
    // 계산
    derived(){
      const aug = Number(this.input.augAmount||0);
      // 활성 주차만 합산
      const septTotal = (this.monthPolicy.weeks||[]).reduce((s, w)=> s + (w.active ? Number(this.weekInputs[w.weekNo]||0) : 0), 0);

      // 브릿지(우선 필드 제거: 전월 최소 minAug 큰 순으로만 정렬)
      const sorted = [...(this.policy.bridgeRules||[])].sort((a,b)=> (b.minAug||0)-(a.minAug||0));
      let bridgeReward=0, bridgeHit=false;
      for(const r of sorted){
        if(aug >= (r.minAug||0) && septTotal >= (r.minSept||0)){
          bridgeReward = Number(r.reward||0); bridgeHit = true; break;
        }
      }

      // 주차 시상(주차별 보상표 사용)
      let weeklyReward = 0;
      for(const w of this.monthPolicy.weeks){
        if(!w.active) continue;
        const amt = Number(this.weekInputs[w.weekNo]||0);
        if(amt >= 500000) weeklyReward += Number(w.r50||0);
        else if(amt >= 300000) weeklyReward += Number(w.r30||0);
        else if(amt >= 200000) weeklyReward += Number(w.r20||0);
        else if(amt >= 100000) weeklyReward += Number(w.r10||0);
      }

      const total = bridgeReward + weeklyReward;
      return { septTotal, bridgeReward, weeklyReward, total, bridgeHit };
    }
  },
  mounted(){
    this.loadBrandPolicy();
    this.ensureMonthPolicy();
  },
  methods:{
    // ===== Utils =====
    fmt(n){ return Number(n||0).toLocaleString('ko-KR'); },
    toast(msg=''){ this.toastMsg = msg; this.showToastFlag = true; clearTimeout(this._timer); this._timer=setTimeout(()=>this.showToastFlag=false, 1600); },
    emitPreview(){ this.$emit('memo-change', this.memo); },

    parseYM(ym){ const [Y,M] = (ym||'').split('-').map(v=>Number(v)); return { y:Y||new Date().getFullYear(), m:M||new Date().getMonth()+1 }; },
    cloneDate(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); },
    addDays(d, n){ const x = this.cloneDate(d); x.setDate(x.getDate()+n); return x; },

    // ===== 달/주차 생성 규칙 =====
    isWeekday(d){ const dow = d.getDay(); return dow >= 1 && dow <= 5; }, // 월~금
    countWeekdaysInRange(start, end){
      let cnt = 0;
      for (let d = this.cloneDate(start); d <= end; d = this.addDays(d, 1)) {
        if (this.isWeekday(d)) cnt++;
      }
      return cnt;
    },
    countTotalDays(start, end){
      return Math.floor((end - start) / (24*60*60*1000)) + 1;
    },

    // 월력(월~일) 기준으로 해당 월의 주차를 생성하고, 1주/마지막주 병합 규칙 적용
    buildWeeksForMonth(y, m) {
      const first = new Date(y, m - 1, 1);
      const lastDay = lastDayOfMonth(y, m);
      const last = new Date(y, m - 1, lastDay);
    
      const weeks = [];
      // ✅ 첫 주 시작: 그 달 첫 월요일 or 1일
      const firstDow = first.getDay(); // 0=일,1=월,...6=토
      const firstMonOffset = (firstDow === 0) ? 1 : (1 - firstDow);
      let curStart = new Date(y, m - 1, Math.max(1, 1 + firstMonOffset));
      if (curStart < first) curStart = this.cloneDate(first);
    
      // ✅ 주차별 구간 생성
      while (curStart <= last) {
        let curEnd = this.addDays(curStart, (7 - curStart.getDay()) % 7);
        if (curEnd > last) curEnd = this.cloneDate(last);
        weeks.push({ start: this.cloneDate(curStart), end: this.cloneDate(curEnd) });
        curStart = this.addDays(curEnd, 1);
      }
    
      // ✅ 1주차 평일(월~금) 3일 이하 → 1주차+2주차 병합
      if (weeks.length >= 2) {
        const w1 = weeks[0];
        const w1Weekdays = this.countWeekdaysInRange(w1.start, w1.end);
        if (w1Weekdays <= 3) {
          weeks[1].start = this.cloneDate(w1.start);
          weeks.splice(0, 1);
        }
      }
    
      // ✅ 마지막 주차 총일수 3일 이하 → 직전 주차에 흡수
      if (weeks.length >= 2) {
        const lastIdx = weeks.length - 1;
        const lastW = weeks[lastIdx];
        const total = this.countTotalDays(lastW.start, lastW.end);
        if (total <= 3) {
          // 이전 주차 종료일을 마지막 주차 종료일로 확장
          weeks[lastIdx - 1].end = this.cloneDate(lastW.end);
          weeks.splice(lastIdx, 1); // 마지막 주차 제거
        }
      }
    
      // ✅ 주차 객체 변환
      return weeks.map((w, i) => ({
        weekNo: i + 1,
        start: ymd(w.start.getFullYear(), w.start.getMonth() + 1, w.start.getDate()),
        end: ymd(w.end.getFullYear(), w.end.getMonth() + 1, w.end.getDate()),
        active: true,
        r10: 100000,
        r20: 200000,
        r30: 300000,
        r50: 500000,
      }));
    },


    // 전월 인정 기간 = "전월의 3주차 시작일 ~ 전월 말일" (자동)
    calcPrevSpanRangeFromWeeks(){
      const { y, m } = this.parseYM(this.yearMonth);
      const prevDate = new Date(y, m-1, 1); // 기준월의 1일
      prevDate.setMonth(prevDate.getMonth()-1); // 전월로 이동
      const py = prevDate.getFullYear();
      const pm = prevDate.getMonth()+1;

      const prevWeeks = this.buildWeeksForMonth(py, pm); // 전월 주차를 동일 규칙으로 생성
      // 3주차 시작일(없을 경우는 방어적으로 마지막 주차의 시작일 사용)
      const w3 = prevWeeks[2] || prevWeeks[prevWeeks.length-1];
      const startDay = Number(String(w3.start).slice(-2));
      const endDay   = lastDayOfMonth(py, pm); // 전월 말일

      return { prevY: py, prevM: pm, prevStart: startDay, prevEnd: endDay };
    },

    // ===== 보험사 탭 =====
    selectBrand(brand){
      this.form.brand = brand;
      this.loadBrandPolicy() || this.resetDefaultPolicy();
      this.ensureMonthPolicy(); // 보험사 변경 시 해당 월 정책도 새로 로드
    },

    // ===== 브릿지 정책(보험사 공통) 저장/로드 =====
    storageKeyBrand(){ return `${LS_KEY_POLICY_PREFIX}${(this.form.brand||'__default__')}`; },
    loadBrandPolicy(){
      try{
        const raw = localStorage.getItem(this.storageKeyBrand());
        if(!raw) return false;
        const obj = JSON.parse(raw);
        if(obj?.bridgeRules){
          this.policy.bridgeRules = (obj.bridgeRules||[]).map(r=>({
            id:r.id||uid(), minAug:+r.minAug||0, minSept:+r.minSept||0, reward:+r.reward||0
          }));
          return true;
        }
        return false;
      }catch(e){ console.error(e); return false; }
    },
    resetDefaultPolicy(){
      this.policy.bridgeRules = [
        { id: uid(), minAug: 500000, minSept: 100000, reward: 1800000 },
        { id: uid(), minAug: 300000, minSept: 100000, reward:  800000 },
        { id: uid(), minAug: 200000, minSept: 100000, reward:  600000 },
        { id: uid(), minAug: 100000, minSept: 100000, reward:  200000 },
      ];
    },
    saveBrandPolicy(){
      try{
        localStorage.setItem(this.storageKeyBrand(), JSON.stringify({ bridgeRules: this.policy.bridgeRules }));
        this.toast('브릿지 규칙 저장 완료');
      }catch(e){ console.error(e); this.toast('브릿지 규칙 저장 오류'); }
    },
    addBridgeRule(){ this.policy.bridgeRules.push({ id:uid(), minAug:0, minSept:0, reward:0 }); },
    removeBridgeRule(i){ this.policy.bridgeRules.splice(i,1); },

    // ===== 기준월별 주차 정책 저장/로드 =====
    storageKeyMonth(){ return `${LS_KEY_POLICY_MONTH_PREFIX}${(this.form.brand||'__default__')}.${this.yearMonth}`; },
    ensureMonthPolicy(){
      // ① 저장본이 있으면 불러오고
      this.loadMonthPolicy();
    
      // ② 규칙에 맞춘 주차 재계산으로 정규화(항상 실행)
      const { y, m } = this.parseYM(this.yearMonth);
      this.monthPolicy.weeks = this.reconcileWeeksWithRules(this.monthPolicy.weeks, y, m);
    
      // ③ 입력값 초기화(주차 개수 달라질 수 있으므로)
      this.weekInputs = {1:0,2:0,3:0,4:0,5:0};
    },
    reconcileWeeksWithRules(currentWeeks=[], y, m){
      // 규칙(1주 평일 ≤3일 병합, 마지막 주 ≤3일 흡수)을 반영한 ‘정답표’
      const freshWeeks = this.buildWeeksForMonth(y, m);
    
      // 기존에 입력해둔 주차별 보상(r10~r50)이 있으면 같은 인덱스에 복사
      for (let i = 0; i < freshWeeks.length; i++) {
        const src = currentWeeks[i];
        if (src) {
          freshWeeks[i].r10 = +src.r10 || freshWeeks[i].r10;
          freshWeeks[i].r20 = +src.r20 || freshWeeks[i].r20;
          freshWeeks[i].r30 = +src.r30 || freshWeeks[i].r30;
          freshWeeks[i].r50 = +src.r50 || freshWeeks[i].r50;
          freshWeeks[i].active = (typeof src.active === 'boolean') ? src.active : true;
        }
      }
      return freshWeeks;
    },
    loadMonthPolicy(){
      try{
        const raw = localStorage.getItem(this.storageKeyMonth());
        if(!raw) return false;
        const obj = JSON.parse(raw);
        if(Array.isArray(obj?.weeks) && obj.weeks.length){
          // ① 저장본 그대로 넣고(날짜 보정 최소화)
          this.monthPolicy.weeks = obj.weeks.map(w=>({
            weekNo:+w.weekNo||1,
            start: w.start,
            end: w.end,
            active: typeof w.active==='boolean' ? w.active : true,
            r10:+w.r10||100000, r20:+w.r20||200000, r30:+w.r30||300000, r50:+w.r50||500000
          }));
          return true;
        }
        return false;
      }catch(e){ console.error(e); return false; }
    },
    saveMonthPolicy(){
      try{
        localStorage.setItem(this.storageKeyMonth(), JSON.stringify({
          weeks: this.monthPolicy.weeks
        }));
        this.toast('해당 기준월의 주차 설정 저장 완료');
      }catch(e){ console.error(e); this.toast('주차 설정 저장 오류'); }
    },
    defaultWeeks(){
      const { y, m } = this.parseYM(this.yearMonth);
      return this.buildWeeksForMonth(y, m);
    },
    autoFillWeeks(){
      this.monthPolicy.weeks = this.defaultWeeks();
      this.resetWeekInputs();
      this.toast('기준월에 맞춰 주차가 자동 채워졌습니다.');
    },
    resetWeekInputs(){
      const obj = {};
      for (const w of (this.monthPolicy.weeks||[])) obj[w.weekNo] = this.weekInputs[w.weekNo] || 0;
      this.weekInputs = obj; // 5주차가 없으면 키 자체가 없음 → 입력칸 미표시
    },

    // ===== 이벤트 =====
    onYearMonthChange(){
      this.ensureMonthPolicy(); // 로드/생성 + weekInputs 동기화
    },

    // ===== 라벨 =====
    weekLabel(w){
      if (w.weekNo === 1) {
        const { y, m } = this.parseYM(this.yearMonth);
        const endDay = Math.min(7, lastDayOfMonth(y, m)); // 라벨을 1~7일로 표시(표준화)
        const s = `${pad2(m)}/01`;
        const e = `${pad2(m)}/${pad2(endDay)}`;
        return `1주차 (${s}~${e})`;
      }
      const s = w.start?.slice(5).replace('-', '/');
      const e = w.end?.slice(5).replace('-', '/');
      return `${w.weekNo}주차 (${s}~${e})`;
    },

    // ===== 달력 열기 =====
    openMonthPicker(){
      const el = this.$refs.yearMonth;
      if (!el) return;
      try {
        if (typeof el.showPicker === 'function') el.showPicker();
        else { el.focus(); el.click(); }
      } catch (_) { el.focus(); el.click(); }
    },

    // ===== 전송 =====
    handleSend(){
      let categoryValue = '시상분석-보험사정책';
      if (this.categorySuffix && this.categorySuffix.trim()) categoryValue = `시상분석-${this.categorySuffix.trim()}`;

      const payload = {
        category: categoryValue,
        question: this.memo?.trim() || '보험사/기준월별 브릿지·주차 시상 자동계산 결과 요약을 요청합니다.',
        meta: {
          brand: this.form.brand,
          yearMonth: this.yearMonth,
          policy: this.policy,            // 브릿지 규칙(보험사 공통)
          monthPolicy: this.monthPolicy,  // 기준월 주차 규칙(날짜/보상)
          input: { augAmount: this.input.augAmount, weeks: { ...this.weekInputs } },
        },
        result: this.derived
      };

      // 사람이 읽기 좋은 가시 요약(규칙/테이블은 숨김)
      const humanText = this.buildUserSummary();

      this.$emit('send', { ...payload, humanText });
    },

    // 사람이 읽기 좋은 요약 (표/규칙은 숨김)
    buildUserSummary(){
      const lines = [];
      const { brand } = this.form;
      const ym = this.yearMonth;
      const { prevM, prevStart, prevEnd } = this.calcPrevSpanRangeFromWeeks();

      lines.push(`### 시상 시뮬레이션 요청`);
      lines.push(`- 보험사: **${brand}**`);
      lines.push(`- 기준월: **${ym}**`);
      lines.push(`- 전월 인정기간: **${prevM}/${String(prevStart).padStart(2,'0')}~${prevM}/${String(prevEnd).padStart(2,'0')}**`);
      lines.push("");

      // 전월 합계
      lines.push(`**전월 합계:** ${this.fmt(this.input.augAmount)}원`);
      lines.push("");

      // 기준월 주차 입력(활성 주차만)
      lines.push(`**기준월 주차 실적(원)**`);
      for (const w of this.monthPolicy.weeks) {
        if (!w.active) continue;
        const lbl = this.weekLabel(w);
        const val = Number(this.weekInputs[w.weekNo] || 0);
        lines.push(`- ${lbl}: ${this.fmt(val)}원`);
      }
      lines.push("");

      // 계산 결과
      const d = this.derived;
      lines.push(`**자동 계산 결과**`);
      lines.push(`- 기준월 합계: **${this.fmt(d.septTotal)}원**`);
      lines.push(`- 브릿지 시상금: **${this.fmt(d.bridgeReward)}원** (${d.bridgeHit ? '달성' : '미달'})`);
      lines.push(`- 주차 시상 합계: **${this.fmt(d.weeklyReward)}원**`);
      lines.push(`- 예상 총수령액: **${this.fmt(d.total)}원**`);
      lines.push("");

      if (this.memo?.trim()){
        lines.push(`> 메모: ${this.memo.trim()}`);
        lines.push("");
      }
      return lines.join('\n');
    },
     // 화면 표시용 "1,234,567"
    displayMoney(v) {
      const n = Number(String(v).replace(/[^\d]/g, '') || 0);
      return n.toLocaleString('ko-KR');
    },
    // 모델 저장용 1234567 (숫자)
    parseMoney(str) {
      return Number(String(str || '').replace(/[^\d]/g, '')) || 0;
    },
  }
};
</script>

<style scoped>
/* ===== 바텀시트 백드롭/패널 ===== */
.sheet-backdrop{ position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: flex-end; justify-content: center; z-index: 3002; }
.sheet-panel{
  width: min(720px, 100vw);
  max-height: 82vh;
  background: #fff;
  border-top-left-radius: 16px; border-top-right-radius: 16px;
  box-shadow: 0 -10px 30px rgba(0,0,0,.18);
  display: flex; flex-direction: column; overflow: hidden;
  transform: translateY(0); animation: sheet-up .22s ease-out;
  max-height: min(94vh, calc(100vh - env(safe-area-inset-top)));
  height: auto; -webkit-overflow-scrolling: touch;
  --footer-h: 88px;
}
@keyframes sheet-up{ from{ transform: translateY(12px); opacity:.98; } to{ transform: translateY(0); opacity:1; } }

.sheet-header{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #E5E7EB; }
.sheet-header h3{ font-size:16px; font-weight:800; margin:0; }
.sheet-close{ background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; cursor:pointer; }
.sheet-close:hover{ background:#e5e7eb; }

/* 가로 넘침 방지 */
.sheet-body{
  padding:12px 16px; overflow-y:auto; overflow-x:hidden;
  flex:1 1 auto; padding-bottom:var(--footer-h, 96px);
  -webkit-overflow-scrolling:touch;
}

.block{ margin-top:12px; padding:12px; border:1px solid #E5E7EB; border-radius:12px; background:#FBFDFF; }
.block-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; position:sticky; top:0; background:#FBFDFF; padding-top:8px; margin-top:-8px; z-index:2; }
.block-title{ margin:0; font-size:14px; font-weight:800; color:#0F172A; }

.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.grid3{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
.grid4{ display:grid; grid-template-columns: 1fr 1fr 1fr auto; gap:10px; }

.mt8{ margin-top:8px; }

.form-row{ display:flex; flex-direction:column; gap:6px; min-width:0; }
.label{ font-size:12px; font-weight:800; color:#0F172A; white-space:normal; line-height:1.25; }

.input{
  border:1px solid #E5E7EB; background:#fff; padding:8px 10px; border-radius:10px; font-size:14px; outline:none; max-width:100%;
}
.input:focus{ border-color:#93C5FD; box-shadow:0 0 0 3px rgba(147,197,253,.35); }

/* 숫자 입력: 1,000,000(7자리) 맞춤 폭 */
.input[type="number"]{ width:11ch; max-width:100%; text-align:right; font-variant-numeric: tabular-nums; -moz-appearance:textfield; }
.input[type="number"]::-webkit-outer-spin-button, .input[type="number"]::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }

/* 시상 단계 */
.tiers{ display:grid; gap:10px; }
.tier-row{ border:1px dashed #E5E7EB; background:#FFFFFF; border-radius:12px; padding:10px; }
.tier-actions{ display:flex; justify-content:flex-end; }
.small{ padding: 4px 8px; border: 1px solid #E5E7EB; border-radius: 8px; background: #fff; cursor: pointer; font-size: 12px; font-weight: 700; }
.small:hover{ background:#F3F4F6; }
.small.danger{ color:#DC2626; }

/* 보험사 탭 */
.insurer-tabs{ display:flex; flex-wrap:wrap; gap:6px; }
.insurer-tab{
  padding:6px 10px; border:1px solid #E5E7EB; border-radius:999px;
  background:#fff; cursor:pointer; font-size:12px; font-weight:700; color:#0F172A;
}
.insurer-tab:hover{ background:#F3F4F6; }
.insurer-tab.active{
  background:linear-gradient(135deg, #60A5FA, #2563EB); color:#fff; border-color:transparent;
  box-shadow:0 4px 12px rgba(37,99,235,.18);
}

.toast{ position:fixed; left:50%; bottom:calc(16px + env(safe-area-inset-bottom)); transform:translateX(-50%); background:linear-gradient(135deg, #60A5FA, #2563EB); color:#fff; padding:10px 14px; border-radius:12px; font-size:13px; font-weight:700; z-index:4000; box-shadow:0 4px 16px rgba(59,130,246,.25); animation:toast-in .18s ease-out; }
@keyframes toast-in{ from{ transform:translate(-50%, 6px); opacity:0; } to{ transform:translate(-50%, 0); opacity:1; } }

.sheet-textarea{
  width:100%; max-width:100%; box-sizing:border-box; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; outline:none; resize:vertical; font-size:14px; line-height:1.5; overflow-x:hidden; white-space:pre-wrap; word-break:break-word;
}

.sheet-cta{ display:flex; gap:8px; justify-content:flex-end; }
.sheet-cta .btn{ min-height:40px; padding:0 14px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; font-weight:700; cursor:pointer; }
.sheet-cta .btn.primary{ background:linear-gradient(135deg, #60A5FA, #2563EB); color:#fff; border:none; box-shadow:0 6px 16px rgba(59,130,246,.20); }
.sheet-cta .btn.primary:disabled{ opacity:.6; cursor:not-allowed; }
.input.money {
  width: 11ch;
  max-width: 100%;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
