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
            <div class="grid2 mt8">
              <div class="form-row">
                <label class="label" for="baseDay">기준 일</label>
                <input
                  id="baseDay"
                  v-model="baseDay"
                  class="input"
                  type="date"
                  :min="yearMonth + '-01'"
                  :max="yearMonth + '-' + maxDayOfMonth"
                />
              </div>
            </div>
          </section>

          <!-- 상담원 개인 실적 입력 -->
          <section class="block">
            <div class="block-head">
              <h4 class="block-title">상담원 개인 실적 입력</h4>
            </div>
            <div class="grid3">
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
                <label class="label">브릿지 적용 합계(원)</label>
                <input class="input" :value="fmt(derived.septBridgeTotal)" type="text" disabled />
              </div>
              <div class="form-row">
                <label class="label">브릿지 시상금(원)</label>
                <input class="input" :value="fmt(derived.bridgeReward)" type="text" disabled />
              </div>
            </div>
            <div class="grid3 mt8">
              <div class="form-row">
                <label class="label">주차 시상 합계(원)</label>
                <input class="input" :value="fmt(derived.weeklyReward)" type="text" disabled />
              </div>
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

          <!-- 보험사별 정책 — 브릿지 규칙 -->
          <section class="block">
            <div class="block-head">
              <h4 class="block-title">보험사별 정책 — 브릿지 규칙</h4>
              <div class="row-actions">
                <button class="small" @click="addBridgeRule">+ 규칙 추가</button>
                <button class="small" @click="saveBrandPolicy">저장</button>
              </div>
            </div>

            <!-- 브릿지 적용 주차 선택 -->
            <div class="grid3 mt8">
              <label v-for="w in monthPolicy.weeks" :key="'bw-'+w.weekNo">
                <input type="checkbox" :value="w.weekNo" v-model="policy.bridgeWeeks" />
                {{ w.weekNo }}주차
              </label>
            </div>

            <div class="tiers mt8">
              <div class="tier-row" v-for="(r, i) in policy.bridgeRules" :key="r.id">
                <div class="grid3">
                  <div class="form-row">
                    <label class="label">전월 최소(원)</label>
                    <input class="input money" :value="displayMoney(r.minAug)" @input="r.minAug = parseMoney($event.target.value)" inputmode="numeric" />
                  </div>
                  <div class="form-row">
                    <label class="label">기준월 최소(원)</label>
                    <input class="input money" :value="displayMoney(r.minSept)" @input="r.minSept = parseMoney($event.target.value)" inputmode="numeric" />
                  </div>
                  <div class="form-row">
                    <label class="label">브릿지 시상금(원)</label>
                    <input class="input money" :value="displayMoney(r.reward)" @input="r.reward = parseMoney($event.target.value)" inputmode="numeric" />
                  </div>
                </div>
                <div class="tier-actions">
                  <button class="small danger" @click="removeBridgeRule(i)">삭제</button>
                </div>
              </div>
            </div>
          </section>
          
          

          <!-- 기준월 주차 설정 -->
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
          
                <!-- 💡 시상금 수정 영역 추가 -->
                <div class="grid4 mt8">
                  <div class="form-row">
                    <label class="label">10만 달성 시</label>
                    <input class="input money"
                           :value="displayMoney(w.r10)"
                           @input="w.r10 = parseMoney($event.target.value)" />
                  </div>
                  <div class="form-row">
                    <label class="label">20만 달성 시</label>
                    <input class="input money"
                           :value="displayMoney(w.r20)"
                           @input="w.r20 = parseMoney($event.target.value)" />
                  </div>
                  <div class="form-row">
                    <label class="label">30만 달성 시</label>
                    <input class="input money"
                           :value="displayMoney(w.r30)"
                           @input="w.r30 = parseMoney($event.target.value)" />
                  </div>
                  <div class="form-row">
                    <label class="label">50만 달성 시</label>
                    <input class="input money"
                           :value="displayMoney(w.r50)"
                           @input="w.r50 = parseMoney($event.target.value)" />
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
            <textarea v-model="memo" class="sheet-textarea" rows="3" @input="emitPreview" />
          </section>
        </section>

        <!-- 토스트 -->
        <div v-if="showToastFlag" class="toast">{{ toastMsg }}</div>

        <!-- 풋터 -->
        <footer class="sheet-footer">
          <div class="sheet-cta">
            <button class="btn ghost" @click="$emit('close')">취소</button>
            <button class="btn primary" :disabled="isSending" @click="handleSend">시뮬레이션 요청</button>
          </div>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script>
const LS_KEY_POLICY_PREFIX = 'bonusPlanner.brandPolicy.';
const LS_KEY_POLICY_MONTH_PREFIX = 'bonusPlanner.brandMonth.';

function uid(){ return crypto.randomUUID?.() || String(Math.random()); }
function pad2(n){ return String(n).padStart(2,'0'); }
function lastDayOfMonth(y, m){ return new Date(y, m, 0).getDate(); }
function ymd(y,m,d){ return `${y}-${pad2(m)}-${pad2(d)}`; }

export default {
  name: 'BonusPlannerSheet',
  props: { 
    isSending: { type: Boolean, default: false }, 
    categorySuffix: { type: String, default: '' } 
  },
  emits: ['close', 'send', 'memo-change'],
  data(){
    const now = new Date();
    const ymDefault = `${now.getFullYear()}-${pad2(now.getMonth()+1)}`;
    const today = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}`;
    return {
      brands: ['현대','삼성','디비','KB','한화','흥국','롯데','메리츠','기타'],
      yearMonth: ymDefault,
      baseDay: today,
      form: { brand: '현대' },
      policy: {
        bridgeRules: [
          { id: uid(), minAug: 500000, minSept: 100000, reward: 1800000 },
          { id: uid(), minAug: 300000, minSept: 100000, reward:  800000 },
          { id: uid(), minAug: 200000, minSept: 100000, reward:  600000 },
          { id: uid(), minAug: 100000, minSept: 100000, reward:  200000 },
        ],
        bridgeWeeks: [1, 2] // ✅ 브릿지 적용 주차 (기본값: 2주차)
      },
      monthPolicy: { weeks: [] },
      input: { augAmount: 0 },
      weekInputs: {},
      memo: '', 
      toastMsg: '', 
      showToastFlag: false
    };
  },
  computed:{
    augLabel(){ 
      const r = this.calcPrevSpanRangeFromWeeks(); 
      return `${r.prevM}월 실적(원) [${r.prevM}/${pad2(r.prevStart)}~${r.prevM}/${pad2(r.prevEnd)}]`; 
    },
    maxDayOfMonth(){ 
      const [y, m] = this.yearMonth.split('-').map(Number); 
      return String(new Date(y, m, 0).getDate()).padStart(2, '0'); 
    },
    derived(){
      const aug = Number(this.input.augAmount||0);
      // 전체 합계
      const septTotal = (this.monthPolicy.weeks||[]).reduce((s, w)=> 
        s + (w.active ? Number(this.weekInputs[w.weekNo]||0) : 0), 0
      );
      // 브릿지 적용 주차 합계
      const bridgeWeeks = this.policy.bridgeWeeks || [];
      const septBridgeTotal = (this.monthPolicy.weeks||[]).reduce((s, w)=> 
        bridgeWeeks.includes(w.weekNo) && w.active ? s + Number(this.weekInputs[w.weekNo]||0) : s, 
        0
      );
      // 브릿지 판정
      const sorted = [...(this.policy.bridgeRules||[])].sort((a,b)=> (b.minAug||0)-(a.minAug||0));
      let bridgeReward=0, bridgeHit=false;
      for(const r of sorted){ 
        if(aug >= r.minAug && septBridgeTotal >= r.minSept){ 
          bridgeReward=r.reward; bridgeHit=true; break; 
        } 
      }
      // 주차별 시상
      let weeklyReward=0;
      for(const w of this.monthPolicy.weeks){ 
        if(!w.active) continue; 
        const amt=Number(this.weekInputs[w.weekNo]||0);
        if(amt>=500000) weeklyReward+=Number(w.r50||0);
        else if(amt>=300000) weeklyReward+=Number(w.r30||0);
        else if(amt>=200000) weeklyReward+=Number(w.r20||0);
        else if(amt>=100000) weeklyReward+=Number(w.r10||0);
      }
      const total=bridgeReward+weeklyReward;
      return { septTotal, septBridgeTotal, bridgeReward, weeklyReward, total, bridgeHit };
    }
  },
  mounted(){ 
    this.loadBrandPolicy(); 
    this.ensureMonthPolicy(); 
  },
  methods:{
    fmt(n){ return Number(n||0).toLocaleString('ko-KR'); },
    toast(msg=''){ 
      this.toastMsg=msg; 
      this.showToastFlag=true; 
      clearTimeout(this._timer); 
      this._timer=setTimeout(()=>this.showToastFlag=false, 1600); 
    },
    emitPreview(){ this.$emit('memo-change', this.memo); },
    parseYM(ym){ 
      const [Y,M]=(ym||'').split('-').map(Number); 
      return { y:Y||new Date().getFullYear(), m:M||new Date().getMonth()+1 }; 
    },
    cloneDate(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); },
    addDays(d,n){ const x=this.cloneDate(d); x.setDate(x.getDate()+n); return x; },

    // 주차 생성
    buildWeeksForMonth(y, m){
      const first=new Date(y,m-1,1); 
      const lastDay=lastDayOfMonth(y,m); 
      const last=new Date(y,m-1,lastDay);
      const weeks=[]; 
      const firstDow=first.getDay(); 
      const firstMonOffset=(firstDow===0)?1:(1-firstDow);
      let curStart=new Date(y,m-1,Math.max(1,1+firstMonOffset)); 
      if(curStart<first) curStart=this.cloneDate(first);
      while(curStart<=last){ 
        let curEnd=this.addDays(curStart,(7-curStart.getDay())%7); 
        if(curEnd>last) curEnd=this.cloneDate(last); 
        weeks.push({start:this.cloneDate(curStart),end:this.cloneDate(curEnd)}); 
        curStart=this.addDays(curEnd,1);
      }
      // 1주차 병합 규칙
      if(weeks.length>=2){ 
        const w1=weeks[0]; 
        let cnt=0; 
        for(let d=this.cloneDate(w1.start);d<=w1.end;d=this.addDays(d,1)){ 
          if(d.getDay()>=1&&d.getDay()<=5) cnt++; 
        } 
        if(cnt<=3){ 
          weeks[1].start=this.cloneDate(w1.start); 
          weeks.splice(0,1);
        } 
      }
      // 마지막 주차 병합
      if(weeks.length>=2){ 
        const lastIdx=weeks.length-1; 
        const total=(weeks[lastIdx].end-weeks[lastIdx].start)/(86400000)+1; 
        if(total<=3){ 
          weeks[lastIdx-1].end=this.cloneDate(weeks[lastIdx].end); 
          weeks.splice(lastIdx,1);
        } 
      }
      return weeks.map((w,i)=>({
        weekNo:i+1,
        start:ymd(w.start.getFullYear(),w.start.getMonth()+1,w.start.getDate()),
        end:ymd(w.end.getFullYear(),w.end.getMonth()+1,w.end.getDate()),
        active:true,r10:100000,r20:200000,r30:300000,r50:500000
      }));
    },

    // 전월 인정 기간
    calcPrevSpanRangeFromWeeks(){ 
      const {y,m}=this.parseYM(this.yearMonth); 
      const prevDate=new Date(y,m-1,1); 
      prevDate.setMonth(prevDate.getMonth()-1); 
      const py=prevDate.getFullYear(); 
      const pm=prevDate.getMonth()+1; 
      const prevWeeks=this.buildWeeksForMonth(py,pm); 
      const w3=prevWeeks[2]||prevWeeks[prevWeeks.length-1]; 
      const startDay=Number(String(w3.start).slice(-2)); 
      const endDay=lastDayOfMonth(py,pm); 
      return { prevY:py, prevM:pm, prevStart:startDay, prevEnd:endDay}; 
    },

    // 보험사 선택
    selectBrand(b){ 
      this.form.brand=b; 
      this.loadBrandPolicy()||this.resetDefaultPolicy(); 
      this.ensureMonthPolicy(); 
    },

    // 저장/로드
    storageKeyBrand(){ return `${LS_KEY_POLICY_PREFIX}${this.form.brand||'__default__'}`; },
    loadBrandPolicy(){ 
      try{ 
        const raw=localStorage.getItem(this.storageKeyBrand()); 
        if(!raw) return false; 
        const obj=JSON.parse(raw); 
        if(obj?.bridgeRules){ 
          this.policy.bridgeRules=obj.bridgeRules.map(r=>({id:r.id||uid(),minAug:+r.minAug||0,minSept:+r.minSept||0,reward:+r.reward||0})); 
          this.policy.bridgeWeeks=obj.bridgeWeeks||[1,2]; 
          return true;
        } 
        return false; 
      }catch(e){return false;} 
    },
    resetDefaultPolicy(){ 
      this.policy.bridgeRules=[
        {id:uid(),minAug:500000,minSept:100000,reward:1800000},
        {id:uid(),minAug:300000,minSept:100000,reward:800000},
        {id:uid(),minAug:200000,minSept:100000,reward:600000},
        {id:uid(),minAug:100000,minSept:100000,reward:200000}
      ]; 
      this.policy.bridgeWeeks=[1,2]; 
    },
    saveBrandPolicy(){ 
      localStorage.setItem(this.storageKeyBrand(), JSON.stringify({ bridgeRules:this.policy.bridgeRules, bridgeWeeks:this.policy.bridgeWeeks })); 
      this.toast('브릿지 규칙 저장 완료'); 
    },
    addBridgeRule(){ this.policy.bridgeRules.push({ id:uid(), minAug:0, minSept:0, reward:0 }); },
    removeBridgeRule(i){ this.policy.bridgeRules.splice(i,1); },

    // 기준월 주차 정책
    storageKeyMonth(){ return `${LS_KEY_POLICY_MONTH_PREFIX}${this.form.brand||'__default__'}.${this.yearMonth}`; },
    ensureMonthPolicy(){ 
      this.loadMonthPolicy(); 
      const {y,m}=this.parseYM(this.yearMonth); 
      this.monthPolicy.weeks=this.reconcileWeeksWithRules(this.monthPolicy.weeks,y,m); 
      this.weekInputs={1:0,2:0,3:0,4:0,5:0}; 
    },
    reconcileWeeksWithRules(cur=[],y,m){ 
      const fresh=this.buildWeeksForMonth(y,m); 
      for(let i=0;i<fresh.length;i++){ 
        const src=cur[i]; 
        if(src){ 
          fresh[i].r10=+src.r10||fresh[i].r10; 
          fresh[i].r20=+src.r20||fresh[i].r20; 
          fresh[i].r30=+src.r30||fresh[i].r30; 
          fresh[i].r50=+src.r50||fresh[i].r50; 
          fresh[i].active=typeof src.active==='boolean'?src.active:true; 
        } 
      } 
      return fresh; 
    },
    loadMonthPolicy(){ 
      try{ 
        const raw=localStorage.getItem(this.storageKeyMonth()); 
        if(!raw) return false; 
        const obj=JSON.parse(raw); 
        if(Array.isArray(obj?.weeks)&&obj.weeks.length){ 
          this.monthPolicy.weeks=obj.weeks.map(w=>({
            weekNo:+w.weekNo||1,start:w.start,end:w.end,
            active:typeof w.active==='boolean'?w.active:true,
            r10:+w.r10||100000,r20:+w.r20||200000,
            r30:+w.r30||300000,r50:+w.r50||500000
          })); 
          return true;
        } 
        return false; 
      }catch(e){return false;} 
    },
    saveMonthPolicy(){ 
      localStorage.setItem(this.storageKeyMonth(), JSON.stringify({ weeks:this.monthPolicy.weeks })); 
      this.toast('해당 기준월의 주차 설정 저장 완료'); 
    },
    defaultWeeks(){ const {y,m}=this.parseYM(this.yearMonth); return this.buildWeeksForMonth(y,m); },
    autoFillWeeks(){ this.monthPolicy.weeks=this.defaultWeeks(); this.resetWeekInputs(); this.toast('기준월에 맞춰 주차가 자동 채워졌습니다.'); },
    resetWeekInputs(){ const obj={}; for(const w of this.monthPolicy.weeks) obj[w.weekNo]=this.weekInputs[w.weekNo]||0; this.weekInputs=obj; },

    // 기타
    onYearMonthChange(){ this.ensureMonthPolicy(); },
    weekLabel(w){ const s=w.start?.slice(5).replace('-', '/'); const e=w.end?.slice(5).replace('-', '/'); return `${w.weekNo}주차 (${s}~${e})`; },
    openMonthPicker(){ const el=this.$refs.yearMonth; if(!el) return; try{ if(typeof el.showPicker==='function') el.showPicker(); else { el.focus(); el.click(); } }catch(_){ el.focus(); el.click(); } },

    // 전송
    handleSend(){ 
      const payload={ 
        category:`시상분석-${this.categorySuffix||'보험사정책'}`, 
        question:this.memo?.trim()||'보험사/기준월별 브릿지·주차 시상 자동계산 결과 요약을 요청합니다.', 
        meta:{ brand:this.form.brand, yearMonth:this.yearMonth, baseDay:this.baseDay, policy:this.policy, monthPolicy:this.monthPolicy, input:{ augAmount:this.input.augAmount, weeks:{...this.weekInputs} } }, 
        result:this.derived,
        humanText:this.buildUserSummary()
      }; 
      this.$emit('send', payload); 
    },

    // 사람이 읽기 좋은 요약
    buildUserSummary(){
      const lines = [];
      const { brand } = this.form;
      const ym = this.yearMonth;
      const { prevM, prevStart, prevEnd } = this.calcPrevSpanRangeFromWeeks();
      const base = new Date(this.baseDay);
      const baseWeek = (this.monthPolicy.weeks || []).find(w => {
        const start = new Date(w.start);
        const end = new Date(w.end);
        return base >= start && base <= end;
      });
      const baseWeekLabel = baseWeek ? `${baseWeek.weekNo}주차` : "해당 없음";
      
      lines.push(`### 시상 시뮬레이션 요청`);
      lines.push(`- 보험사: **${brand}**`);
      lines.push(`- 기준월: **${ym}**`);
      lines.push(`- 기준일: **${this.baseDay} (${baseWeekLabel})**`);
      lines.push(`- 전월 인정기간: **${prevM}/${String(prevStart).padStart(2,'0')}~${prevM}/${String(prevEnd).padStart(2,'0')}**`);
      lines.push("");
      lines.push(`**전월 합계:** ${this.fmt(this.input.augAmount)}원`);
      lines.push("");
      lines.push(`**기준월 주차 실적(원)**`);
      for (const w of this.monthPolicy.weeks) {
        if (!w.active) continue;
        const lbl = this.weekLabel(w);
        const val = Number(this.weekInputs[w.weekNo] || 0);
        lines.push(`- ${lbl}: ${this.fmt(val)}원`);
      }
      lines.push("");
      const d = this.derived;
      lines.push(`**자동 계산 결과**`);
      lines.push(`- 기준월 실적 합계: **${this.fmt(d.septTotal)}원**`);
      lines.push(`- 브릿지 적용 합계(선택 주차): **${this.fmt(d.septBridgeTotal)}원**`);
      lines.push(`- 브릿지 시상금: **${this.fmt(d.bridgeReward)}원** (${d.bridgeHit ? '달성' : '미달'})`);
      lines.push(`- 주차 시상 합계: **${this.fmt(d.weeklyReward)}원**`);
      lines.push(`- 예상 총수령액: **${this.fmt(d.total)}원**`);
      lines.push("");
      lines.push(`**브릿지 규칙**`);
      const lastWeek = (this.policy.bridgeWeeks || []).slice(-1)[0];
      for (const r of this.policy.bridgeRules) {
        lines.push(`- 전월 합계 ${this.fmt(r.minAug)}원 이상 & ${ (this.policy.bridgeWeeks||[]).map(w=>`${w}주차`).join(', ') } 주차 실적합계 ${this.fmt(r.minSept)}원 이상 → ${lastWeek} 주차에 시상금 합계 지급 ${this.fmt(r.reward)}원`);
      }
      lines.push(`- 브릿지 기준월 적용 주차: ${ (this.policy.bridgeWeeks||[]).map(w=>`${w}주차`).join(', ') }`);
      lines.push("");
      lines.push(`**주차별 시상 규칙**`);
      for (const w of this.monthPolicy.weeks) {
        lines.push(
          `- ${w.weekNo}주차 (${w.start}~${w.end}) ${w.active ? '사용' : '미사용'}: ` +
          `${w.weekNo} 주차 실적 100,000원 달성시 시상금 ${this.fmt(w.r10)}원,실적 200,000원 달성시 시상금 ${this.fmt(w.r20)}원,실적 300,000원 달성시 시상금 ${this.fmt(w.r30)}원,실적 500,000원 달성시 시상금 ${this.fmt(w.r50)}원`
        );
      }
      lines.push("");
      if (this.memo?.trim()){
        lines.push(`> 메모: ${this.memo.trim()}`);
        lines.push("");
      }
      return lines.join('\n');
    },

    displayMoney(v){ const n=Number(String(v).replace(/[^\d]/g,'' )||0); return n.toLocaleString('ko-KR'); },
    parseMoney(str){ return Number(String(str||'').replace(/[^\d]/g,''))||0; }
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
