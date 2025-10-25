<template>
  <transition name="pp-drop">
    <div class="pp-backdrop" :class="{'top': placement === 'top'}" @click.self="$emit('close')">
      <div class="pp-panel" role="dialog" aria-modal="true" aria-labelledby="ppTitle">
        <!-- 헤더 -->
        <header class="pp-header">
          <div class="left">
            <img v-if="payload.logoUrl" :src="payload.logoUrl" alt="로고" />
            <h3 id="ppTitle">{{ payload.title || '견적서 확인 페이지' }}</h3>
          </div>
          <button class="btn ghost" @click="$emit('close')">닫기</button>
        </header>

        <!-- 스크롤 영역 -->
        <section class="pp-scroll">
          <p class="intro">{{ payload.intro || '요청하신 견적서를 정리했습니다.' }}</p>

          <!-- 첨부파일 -->
          <section class="files" aria-label="첨부파일">
            <div v-for="(f,i) in (payload.files || [])" :key="i" class="file-row">
              <div class="file-left">
                <span class="icon">{{ iconByExt(f.name) }}</span>
                <span class="fname" :title="f.name">{{ f.name }}</span>
              </div>
              <div class="file-right">
                <a class="btn sm primary" :href="f.url" target="_blank" rel="noopener">열기</a>
                <a class="btn sm ghost" :href="f.url" :download="f.name">다운로드</a>
              </div>
            </div>
            <div v-if="!(payload.files && payload.files.length)" class="file-row">
              <div class="file-left"><span class="icon">📎</span><span class="fname">첨부된 파일이 없습니다</span></div>
            </div>
          </section>

          <!-- 본문 -->
          <section class="content" v-html="safeContent"></section>

          <div class="note">※ 실제 청약 시 보험료/보장은 변동될 수 있습니다.</div>
          <div class="cta">
            <a class="btn xl gradient" :href="telHref">☎️ 상담사에게 전화하기</a>
            <a class="btn xl outline" :href="mailHref">📧 이메일로 받기</a>
          </div>
        </section>

        <!-- ✅ 채팅: 스크롤 영역 밖, 패널 기준 절대배치 -->
        <div class="chat-dock" :class="{'open': chatOpen}">
          <!-- 미니 헤더(접힘 상태에서 보이는 버튼) -->
          <button class="chat-fab" @click="toggleChat" aria-label="채팅 열기/닫기">
            <svg viewBox="0 0 24 24" class="icon-svg"><path d="M4 4h16v11H7l-3 3V4z"/></svg>
            <span class="badge" v-if="unreadCount">{{ unreadCount }}</span>
          </button>

          <!-- 펼쳐진 채팅 박스 -->
          <div class="chat-panel" v-if="chatOpen">
            <div class="chat-header">
              <div class="title-wrap">
               <strong>상담 채팅</strong>
               <span class="presence-badge" :class="{'on': agentOnline}">
                 <span class="dot"></span>{{ agentOnline ? '상담원 온라인' : '상담원 오프라인' }}
               </span>
               <span class="presence-count">👥 {{ totalOnline }}명 접속</span>
               <span class="typing" v-if="agentTyping">상담원이 입력 중…</span>
              </div>
              <button class="xbtn" @click="toggleChat" aria-label="닫기">×</button>
             </div>

            <div class="chat-log" ref="chatLog">
              <div v-for="(m,idx) in chats" :key="idx" class="msg" :class="m.who">
                <div class="bubble">{{ m.text }}</div>
              </div>
            </div>

            <form class="chat-input" @submit.prevent="send">
              <input v-model="draft" type="text" placeholder="메시지를 입력하세요…" />
              <button class="send" type="submit">전송</button>
            </form>
          </div>
        </div>
        <!-- /chat-dock -->
      </div>
    </div>
  </transition>
</template>

<script>
import DOMPurify from 'dompurify'

export default {
  name: 'BuildPublicPage',
  props: {
    payload: { type: Object, default: () => ({}) },
    placement: { type: String, default: 'top' }
  },
  data() {
    return {
      telHref: 'tel:010-0000-0000',
      mailHref: 'mailto:cs@example.com',
      // 채팅 상태
      chatOpen: false,
      unreadCount: 0,
      chats: [
        { who: 'agent', text: '안녕하세요! 무엇을 도와드릴까요?' }
      ],
      draft: '',
      /* ===== Presence 상태 ===== */
      agentOnline: false,
      customerOnline: true,       // 이 뷰를 보고 있는 사용자는 true
      onlineUsers: 1,             // 최소 1(고객)
      agentTyping: false,
      pingTimerId: null,
      typingTimerId: null,
      presenceTimerId: null,
    }
  },
  computed: {
    safeContent() {
      const html = this.payload?.contentHtml || '<p>내용이 없습니다.</p>';
      const wrapped = html.replace(/(<table[\s\S]*?<\/table>)/gi, '<div class="table-scroll">$1</div>');
      return DOMPurify.sanitize(wrapped);
    },
    totalOnline() {
      // 상담원이 온라인이면 +1
      return this.onlineUsers + (this.agentOnline ? 1 : 0);
    }
  },
  mounted() {
    this.startPresenceMock(); // 실제 연동 시 connectSocket()로 교체
  },
  beforeUnmount() {
    this.stopPresenceMock();
  },
  methods: {
    iconByExt(name = '') {
      const n = String(name).toLowerCase();
      if (n.endsWith('.pdf')) return '📕';
      if (/\.(docx?|odt)$/.test(n)) return '📘';
      if (/\.(xlsx?|ods)$/.test(n)) return '📗';
      if (/\.(pptx?|ppsx?)$/.test(n)) return '📙';
      if (/\.(png|jpe?g|gif|webp|bmp)$/.test(n)) return '🖼';
      return '📎';
    },
    toggleChat() {
      this.chatOpen = !this.chatOpen;
      if (this.chatOpen) this.unreadCount = 0;
      this.$nextTick(() => {
        const log = this.$refs.chatLog;
        if (log) log.scrollTop = log.scrollHeight;
      });
    },
    send() {
      if (!this.draft) return;
      const msg = this.draft.trim();
      if (!msg) return;
      this.chats.push({ who: 'user', text: msg });
      this.draft = '';
      this.$nextTick(() => {
        const log = this.$refs.chatLog;
        if (log) log.scrollTop = log.scrollHeight;
      });
      // (데모) 간단한 응답
      setTimeout(() => {
        this.chats.push({ who: 'agent', text: '문의 확인했습니다. 도와드릴게요!' });
        if (!this.chatOpen) this.unreadCount++;
        this.$nextTick(() => {
          const log = this.$refs.chatLog;
          if (log) log.scrollTop = log.scrollHeight;
        });
      }, 500);
    },/* ===== Presence: 모의 하트비트 & 타이핑 ===== */
    startPresenceMock() {
      // 상담원 온라인 토글(모의)
      this.presenceTimerId = setInterval(() => {
        if (Math.random() < 0.3) this.agentOnline = !this.agentOnline;
    
        // 상담원이 온라인이면 가끔 타이핑
        if (this.agentOnline && Math.random() < 0.3) {
          this.agentTyping = true;
          clearTimeout(this.typingTimerId);
          this.typingTimerId = setTimeout(() => { this.agentTyping = false; }, 1200);
        }
      }, 5000 + Math.random() * 5000);
    
      // 고객(이 탭) 생존 핑
      this.pingTimerId = setInterval(() => {
        this.customerOnline = true;
        // 실제로는 여기서 서버에 ping(`/presence/ping?sid=...`) 전송
      }, 10000);
    },
    
    stopPresenceMock() {
      clearInterval(this.presenceTimerId); this.presenceTimerId = null;
      clearInterval(this.pingTimerId);     this.pingTimerId = null;
      clearTimeout(this.typingTimerId);    this.typingTimerId = null;
    },
  }
}
</script>

<style scoped>
/* 트랜지션 */
.pp-fade-enter-active, .pp-fade-leave-active { transition: opacity .2s ease; }
.pp-fade-enter-from, .pp-fade-leave-to { opacity: 0; }

/* 백드롭 */
.pp-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; /* 빌더(4000대)보다 확실히 큼 */
}

/* 패널 박스 */
.pp-panel {
  width: min(1080px, 96vw);
  max-height: 90vh;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
  display: flex; flex-direction: column;
  overflow: hidden;
  position: relative; /* 채팅 도킹 기준 */
}

/* 헤더 */
.pp-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}
.pp-header .left { display: flex; align-items: center; gap: 10px; }
.pp-header img { height: 28px; object-fit: contain; }
.pp-header h3 { margin: 0; font-size: 16px; font-weight: 800; }

/* 공통 버튼 */
.btn {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-weight: 800;
  cursor: pointer;
  transition: transform .06s ease, box-shadow .2s ease, filter .2s ease;
  text-decoration: none;                 /* ✅ 밑줄 제거 */
  display: inline-flex; align-items: center; justify-content: center;
}
.btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(2,6,23,.08); }
.btn:active { transform: translateY(0); }
.btn:focus-visible { outline: 3px solid rgba(37,99,235,.35); outline-offset: 2px; }
.btn.ghost { background: #fff; }
.btn.xl { min-height: 48px; padding: 0 20px; font-size: 15px; }
.btn.sm { padding: 6px 10px; font-size: 12px; border-radius: 8px; }

/* CTA 버튼 */
.btn.gradient {
  background: linear-gradient(135deg, #6366f1, #22d3ee);
  border: none;
  color: #fff;
  box-shadow: 0 10px 22px rgba(34, 211, 238, .28);
}
.btn.gradient:hover { filter: brightness(0.98); box-shadow: 0 14px 28px rgba(34, 211, 238, .32); }

.btn.outline {
  background: #fff;
  border-color: #cbd5e1;
  color: #0f172a;
}
.btn.outline:hover { background: #f8fafc; border-color: #94a3b8; }

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.btn.primary:hover { filter: brightness(.96); }

/* 스크롤 영역 */
.pp-scroll { overflow-y: auto; padding: 16px; }

/* 본문 */
.intro { color: #64748b; margin: 0 0 12px 0; }
.files { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; background: #fff; }
.file-row { display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e5e7eb; }
.file-row:last-child { border-bottom: 0; }
.file-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.icon { font-size: 20px; }
.fname { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 54vw; }

.content { margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fff; }
.table-scroll { overflow: auto; }
.content :deep(table){ border-collapse: separate; border-spacing:0; border:1px solid #94a3b8; border-radius:10px; }
.content :deep(thead th){ background:#eef2ff; padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:center; font-weight:800; }
.content :deep(tbody td){ padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:center; }

.note { margin-top: 12px; color: #64748b; font-size: 13px; }
.cta { margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap; }

/* ===== 채팅 도크 ===== */
.chat-dock {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

/* 플로팅 버튼 */
.chat-fab {
  width: 56px; height: 56px;
  border-radius: 999px;
  border: 0;
  background: linear-gradient(135deg, #ff7b1c, #ff4d00);
  color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 14px 30px rgba(255, 107, 0, .28);
  cursor: pointer;
  transition: transform .08s ease, box-shadow .2s ease;
  position: relative;
}
.chat-fab:hover { transform: translateY(-1px); box-shadow: 0 18px 36px rgba(255, 107, 0, .34); }
.chat-fab:active { transform: translateY(0); }
.chat-fab .icon-svg { width: 24px; height: 24px; fill: currentColor; }

/* FAB 배지 */
.badge {
  position: absolute;
  top: -4px; right: -4px;
  min-width: 18px; height: 18px;
  padding: 0 5px;
  background: #ef4444; color: #fff;
  font-size: 11px; font-weight: 800;
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 12px rgba(239, 68, 68, .4);
}

/* 채팅 패널 */
.chat-panel {
  width: min(400px, 90vw);
  height: 420px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 22px 44px rgba(2, 6, 23, .28);
  overflow: hidden;
  animation: chatSlideUp .18s ease;
  border: 1px solid rgba(0,0,0,.06);
}
@keyframes chatSlideUp {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

/* 채팅 헤더 */
.chat-header {
  position: relative !important; /* ✅ 전역 header 스타일 무력화 */
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}
.xbtn {
  border: 0; background: transparent;
  font-size: 22px; line-height: 1;
  color: #334155; cursor: pointer;
}

/* 채팅 로그 */
.chat-log {
  height: calc(100% - 46px - 56px);
  overflow-y: auto;
  padding: 12px;
  background: #f8fafc;
}
.msg { display: flex; margin: 6px 0; }
.msg.user { justify-content: flex-end; }
.bubble {
  max-width: 78%;
  padding: 9px 12px;
  border-radius: 14px;
  line-height: 1.45;
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(0,0,0,.06);
}
.msg.agent .bubble { background: #fff; border: 1px solid #e5e7eb; color: #0f172a; }
.msg.user  .bubble { background: #2563eb; color: #fff; }

/* 채팅 입력 */
.chat-input {
  height: 56px;
  display: flex; gap: 8px;
  align-items: center;
  padding: 8px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
.chat-input input {
  flex: 1;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 0 12px;
  font-size: 14px;
}
.chat-input .send {
  height: 40px; padding: 0 14px;
  border-radius: 10px; border: 0;
  background: #10b981;
  color: #fff; font-weight: 800;
  cursor: pointer;
}

/* 테두리/패딩 포함하여 높이 계산(깨짐 방지) */
.chat-panel, .chat-header, .chat-log, .chat-input, .chat-input * {
  box-sizing: border-box;
}

/* 채팅 패널을 컬럼 플렉스로 전환 */
.chat-panel {
  width: min(400px, 90vw);
  height: 420px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 22px 44px rgba(2, 6, 23, .28);
  border: 1px solid rgba(0,0,0,.06);
  overflow: hidden;               /* 내부 스크롤은 chat-log가 담당 */
  animation: chatSlideUp .18s ease;

  display: flex;                  /* ✅ 추가 */
  flex-direction: column;         /* ✅ 추가 */
}

/* 높이 계산식 삭제하고, 가변 영역으로 */
.chat-log {
  /* height: calc(100% - 46px - 56px);  <= 제거 */
  flex: 1 1 auto;                 /* ✅ 가변 높이 */
  min-height: 0;                  /* ✅ 플렉스 컨테이너에서 overflow 작동 */
  overflow-y: auto;
  padding: 12px;
  background: #f8fafc;
}

/* 입력창은 고정 높이 영역으로 */
.chat-input {
  flex: 0 0 auto;                 /* ✅ 고정 영역 */
  height: 56px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

@media (max-width: 560px) {
  .chat-panel { height: 62vh; width: calc(100vw - 24px); }
  .chat-log { min-height: 120px; } /* 극단적 뷰포트에서도 입력창 확보 */
}
/* 채팅 헤더 내부 배치 */
.chat-header .title-wrap {
  display: flex; align-items: center; gap: 8px; min-width: 0;
}
.presence-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 8px; border-radius: 999px;
  background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 800;
  border: 1px solid #e5e7eb;
}
.presence-badge .dot {
  width: 8px; height: 8px; border-radius: 999px; background: #94a3b8;
}
.presence-badge.on { background: #ecfeff; border-color: #99f6e4; color: #0f766e; }
.presence-badge.on .dot { background: #10b981; }

.presence-count {
  color: #475569; font-size: 12px; font-weight: 700;
}

.typing {
  margin-left: 6px;
  font-size: 12px; color: #64748b;
  position: relative; padding-left: 14px;
}
.typing::before{
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 8px; height: 8px; border-radius: 999px; background: #94a3b8; animation: blink 1s infinite;
}
@keyframes blink {
  0%,100% { opacity: .2; } 50% { opacity: 1; }
}


</style>
