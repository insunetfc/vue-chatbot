<template>
  <transition name="wb-fade">
    <div class="wb-backdrop" @click.self="$emit('close')">
      <div class="wb-panel" role="dialog" aria-modal="true" aria-labelledby="wbTitle">
        <!-- 헤더 -->
        <header class="wb-header">
          <h3 id="wbTitle">웹페이지 빌더</h3>
          <div class="wb-actions">
            <button class="btn ghost" @click="$emit('close')">닫기</button>
            <button class="btn" :disabled="busy" @click="openPreviewPanel">미리보기</button>
            <button class="btn" :disabled="busy" @click="emitSave">저장</button>
            <button class="btn deploy" :disabled="busy" @click="emitDeploy">배포하기</button>
          </div>
        </header>

        <!-- 본문 (좌: 첨부, 우: 에디터) -->
        <section class="wb-body">
          <!-- 좌: 첨부파일 -->
          <aside class="wb-aside">
            <h4>첨부파일</h4>

            <div v-if="fileCards.length" class="file-list">
              <div v-for="(f, i) in fileCards" :key="i" class="file-card">
                <div class="thumb" v-if="f.isImg && f.previewUrl">
                  <img :src="f.previewUrl" :alt="f.name" />
                </div>
                <div class="thumb blank" v-else>{{ f.icon }}</div>

                <div class="meta">
                  <div class="name" :title="f.name">{{ f.name }}</div>
                  <div class="size">{{ f.sizeText }}</div>
                  <div class="actions">
                    <button
                      class="mini"
                      title="새 탭에서 열기"
                      @click="openInNewTab(i)"
                      :disabled="!f.canOpen"
                    >
                      새 탭에서 열기
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p v-else class="muted">첨부된 파일이 없습니다.</p>
          </aside>

          <!-- 우: TipTap 에디터 -->
          <main class="wb-main">
            <label class="wb-label">본문 (수정 가능)</label>

            <div class="wb-toolbar">
              <button class="tbtn" @click="editor.chain().focus().toggleBold().run()" :class="{on: editor?.isActive('bold')}">굵게</button>
              <button class="tbtn" @click="editor.chain().focus().toggleItalic().run()" :class="{on: editor?.isActive('italic')}">기울임</button>
              <button class="tbtn" @click="editor.chain().focus().toggleBulletList().run()" :class="{on: editor?.isActive('bulletList')}">• 리스트</button>
              <button class="tbtn" @click="editor.chain().focus().toggleOrderedList().run()" :class="{on: editor?.isActive('orderedList')}">1. 리스트</button>
              <button class="tbtn" @click="editor.chain().focus().insertTable({rows:3, cols:4, withHeaderRow:true}).run()">표 삽입</button>
            </div>

            <EditorContent :editor="editor" class="wb-editor" />
          </main>
        </section>
      </div>

      <!-- ✅ 토스트 -->
      <transition name="toast-fade">
        <div v-if="toast.visible" class="wb-toast" role="status" aria-live="polite">
          {{ toast.message }}
        </div>
      </transition>

       <teleport to="body">
        <!-- 디버그 배지(보이면 v-if 정상): 필요없으면 삭제 -->
        <div v-if="showPreview" style="position:fixed;top:8px;right:8px;z-index:100000;background:#111;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px">
          PREVIEW=ON
        </div>
      
        <BuildPublicPage
          v-if="showPreview"
          :payload="previewPayload"
          placement="top"
          @close="closePreview"
        />
      </teleport>
    </div>
  </transition>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import BuildPublicPage from '@/components/builder/BuildPublicPage.vue'

import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

function debounce(fn, ms = 800) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => {
      try { fn(...args) } catch (err) { console.error('Debounced function error:', err) }
    }, ms)
  }
}

export default {
  name: 'WebBuilder',
  components: { EditorContent, BuildPublicPage },
  props: {
    files: { type: Array, default: () => [] },     // File[] 또는 {name,size,type,url}[]
    initialContent: { type: String, default: '' }, // raw/MD/HTML
    sessionId: { type: String, default: '' }       // 부모 세션 id(선택)
  },
  emits: ['close', 'save', 'deploy', 'update-session'],
  data() {
    return {
      editor: null,
      busy: false,
      revokables: [],
      thumbUrlsMap: {},
      openUrlsMap: {},
      mdParser: null,
      autoSaveDebounced: null,
      toast: { visible: false, message: '' },
      toastTimer: null,
      // 미리보기 패널 상태
      showPreview: false,
      previewPayload: {},
    }
  },
  computed: {
    fileCards() {
      const list = Array.isArray(this.files) ? this.files : []
      return list.map((f, idx) => {
        const name = f?.name || '(이름 없음)'
        const type = f?.type || ''
        const size = f?.size || 0
        const isImg = typeof type === 'string'
          ? type.startsWith('image/')
          : (typeof f?.url === 'string' && /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.url))
        const canOpen = this.canOpenFile(f)
        return {
          name,
          sizeText: this.formatSize(size),
          isImg,
          previewUrl: isImg ? (this.thumbUrlsMap[idx] || this.snapshotUrl(f) || null) : null,
          icon: this.emojiFor(name),
          canOpen
        }
      })
    }
  },
  created() {
    try {
      this.mdParser = new MarkdownIt({ html: false, linkify: true, breaks: true }).enable(['table'])
    } catch (err) {
      console.error('MarkdownIt 초기화 오류:', err)
      this.mdParser = new MarkdownIt()
    }
  },
  mounted() {
    // 1) 초기 본문은 props로 받은 initialContent를 1순위로 사용
    let base = (this.initialContent && String(this.initialContent).trim())
      ? this.initialContent
      : (this.loadLocal()?.html || '');
  
    let initialHTML = '';
    try {
      initialHTML = this.safeFormat(base);
    } catch (err) {
      console.error('safeFormat 초기 변환 오류:', err);
      initialHTML = DOMPurify.sanitize(String(base || ''));
    }
  
    // 2) 에디터 생성
    try {
      this.editor = new Editor({
        content: initialHTML,
        extensions: [
          StarterKit.configure({
            heading: { levels: [1, 2, 3, 4, 5, 6] },
            bulletList: { keepMarks: true },
            orderedList: { keepMarks: true }
          }),
          Placeholder.configure({ placeholder: '여기에 제안서 본문이 들어갑니다...' }),
          Link.configure({ openOnClick: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
          Table.configure({ resizable: false }),
          TableRow, TableHeader, TableCell
        ],
        onUpdate: () => {
          try { this.autoSaveDebounced && this.autoSaveDebounced() } catch (err) {
            console.error('자동 저장 트리거 오류:', err)
          }
        }
      })
    } catch (err) {
      console.error('TipTap Editor 초기화 실패:', err)
    }
  
    // 3) 자동 저장(부모 통지 + 로컬 영속)
    try {
      this.autoSaveDebounced = debounce(() => {
        try {
          const html = this.editor?.getHTML() || ''
          this.$emit('update-session', {
            sessionId: this.sessionId || '',
            content: html,
            files: this.snapshotFiles(this.files)
          })
          this.persistLocal(html)
        } catch (err) {
          console.error('update-session / persistLocal 실패:', err)
        }
      }, 1000)
    } catch (err) {
      console.error('디바운서 초기화 실패:', err)
    }
  
    // 4) 썸네일 준비
    try { this.rebuildThumbs(this.files) } catch (err) {
      console.error('썸네일 구성 실패:', err)
    }
  },
  beforeUnmount() {
    try { this.editor?.destroy() } catch (err) { console.warn('에디터 destroy 중 오류:', err) }
    try { this.revokeAll() } catch (err) { console.warn('blob URL revoke 중 오류:', err) }
    if (this.toastTimer) {
      clearTimeout(this.toastTimer)
      this.toastTimer = null
    }
  },
  watch: {
    files: {
      handler(n) {
        try { this.rebuildThumbs(n) } catch (err) {
          console.error('files 변경 처리 실패:', err)
        }
      },
      immediate: false
    },
    initialContent(n) {
      try {
        const html = this.safeFormat(n)
        if (this.editor && html !== this.editor.getHTML()) {
          this.editor.commands.setContent(html, false)
        }
      } catch (err) {
        console.error('initialContent 갱신 실패:', err)
      }
    }
  },
  methods: {
    /* ===== 미리보기 패널 ===== */
    openPreviewPanel() {
      const html = this.editor?.getHTML() || '';
      this.previewPayload = {
        title: '견적서 확인 페이지',
        logoUrl: '/logo.png',
        intro: '요청하신 견적서를 정리했습니다. 아래에서 열람/다운로드하세요.',
        contentHtml: html,
        files: this.snapshotFiles(this.files),
      };
      this.showPreview = true;
      document.body.classList.add('no-scroll'); // 선택: 배경 스크롤 잠금
    },
    closePreview() {
      this.showPreview = false;
      document.body.classList.remove('no-scroll');
    },

    /* ===== 로컬 영속 ===== */
    getStorageKey() {
      try {
        // sessionId가 메시지 인덱스를 반영한다면 이대로 사용
        return `wb.session.${this.sessionId || 'default'}`
      } catch (err) {
        console.error('getStorageKey 오류:', err)
        return 'wb.session.default'
      }
    },
    persistLocal(html = '') {
      try {
        const key = this.getStorageKey()
        const payload = { html: String(html || ''), ts: Date.now() }
        localStorage.setItem(key, JSON.stringify(payload))
      } catch (err) {
        console.error('persistLocal 저장 실패:', err)
      }
    },
    loadLocal() {
      try {
        const raw = localStorage.getItem(this.getStorageKey())
        if (!raw) return null
        const obj = JSON.parse(raw)
        if (obj && typeof obj.html === 'string') return obj
      } catch (err) {
        console.error('loadLocal 실패:', err)
      }
      return null
    },

    /* ===== 토스트 ===== */
    showToast(message = '') {
      try {
        this.toast.message = String(message || '')
        this.toast.visible = true
        if (this.toastTimer) clearTimeout(this.toastTimer)
        this.toastTimer = setTimeout(() => {
          this.toast.visible = false
          this.toastTimer = null
        }, 2000)
      } catch (err) {
        console.error('토스트 표시 실패:', err)
      }
    },

    /* ===== 부모 통신 ===== */
    emitSave() {
      try {
        const html = this.editor?.getHTML() || ''
        // 부모 통지
        this.$emit('update-session', {
          sessionId: this.sessionId || '',
          content: html,
          files: this.snapshotFiles(this.files)
        })
        this.$emit('save', html)
        // 내부 저장
        this.persistLocal(html)
        this.showToast('저장되었습니다 ✅')
      } catch (err) {
        console.error('emitSave 실패:', err)
        this.showToast('저장 중 오류 발생 ❌')
      }
    },
    emitDeploy() {
      try {
        const html = this.editor?.getHTML() || ''
        // 부모 통지
        this.$emit('update-session', {
          sessionId: this.sessionId || '',
          content: html,
          files: this.snapshotFiles(this.files)
        })
        this.$emit('deploy', html)
        // 내부 저장
        this.persistLocal(html)
        this.showToast('배포를 시작했어요 🚀')
      } catch (err) {
        console.error('emitDeploy 실패:', err)
        this.showToast('배포 중 오류 발생 ❌')
      }
    },

    /* ===== 파일/URL 핸들링 ===== */
    isNativeFile(f) {
      try { return typeof File === 'function' && f instanceof File }
      catch (err) { console.error('isNativeFile 오류:', err); return false }
    },
    canOpenFile(f) {
      try { return this.isNativeFile(f) || !!this.snapshotUrl(f) }
      catch (err) { console.error('canOpenFile 오류:', err); return false }
    },
    snapshotUrl(f) {
      try { if (f && typeof f.url === 'string' && f.url) return f.url }
      catch (err) { console.error('snapshotUrl 오류:', err) }
      return null
    },
    rebuildThumbs(list) {
      try {
        Object.values(this.thumbUrlsMap).forEach(u => {
          try { if (u && /^blob:/.test(u)) URL.revokeObjectURL(u) }
          catch (err) { console.warn('이전 썸네일 revoke 실패:', err) }
        })
        this.thumbUrlsMap = {}
      } catch (err) {
        console.warn('썸네일 초기화 실패:', err)
      }

      try {
        const arr = Array.isArray(list) ? list : []
        arr.forEach((f, i) => {
          try {
            if (this.isNativeFile(f) && f.type?.startsWith?.('image/')) {
              const url = URL.createObjectURL(f)
              this.thumbUrlsMap[i] = url
              this.revokables.push(url)
            }
          } catch (err) {
            console.warn('썸네일 생성 실패:', err)
          }
        })
      } catch (err) {
        console.error('rebuildThumbs 루프 실패:', err)
      }
    },
    revokeAll() {
      try {
        const toRevoke = [...this.revokables, ...Object.values(this.openUrlsMap)]
        toRevoke.forEach(u => {
          try { if (u && /^blob:/.test(u)) URL.revokeObjectURL(u) }
          catch (err) { console.warn('URL revoke 실패:', err) }
        })
        this.revokables = []
        this.openUrlsMap = {}
      } catch (err) {
        console.error('revokeAll 실패:', err)
      }
    },

    /* ===== 콘텐츠 포맷 ===== */
    safeFormat(text = '') {
      try {
        const raw = String(text ?? '')

        // 1) 간단한 HTML 감지: 태그가 있고 코드펜스가 아닌 경우
        const isLikelyHTML = /<\/?[a-z][\s\S]*>/i.test(raw) && !/```/.test(raw)

        const sanitize = (html) =>
          DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
              'div','p','br','strong','b','em','u','span','ul','ol','li','blockquote','code','pre',
              'table','thead','tbody','tr','th','td','caption','col','colgroup','hr',
              'h1','h2','h3','h4','h5','h6','a'
            ],
            ALLOWED_ATTR: ['class','rowspan','colspan','align','width','href','title','target','rel']
          })

        if (isLikelyHTML) {
          // ✅ 이미 HTML이면: 테이블 래핑 + sanitize 만 수행
          let html = raw.replace(/(<table[\s\S]*?<\/table>)/gi, '<div class="table-scroll">$1</div>')
          return sanitize(html)
        }

        // ====== 이하: 마크다운/혼합 입력 처리 ======
        let t = raw.replace(/\r\n?/g, '\n')
        t = t.replace(/\n{3,}/g, '\n\n')
        t = t.replace(/(\n\|[^\n]*\n)(?!\|)/g, '$1\n')               // 파이프 테이블 경계 보강
        t = t.replace(/(\n\|?\s*:?-{3,}.*\|\s*\n)(?!\|)/g, '$1\n')   // 헤더 라인 보강
        t = t.trim().replace(/\n{3,}/g, '\n\n')

        const re = /```html([\s\S]*?)```/gi
        let out = ''
        let last = 0
        let m
        while ((m = re.exec(t)) !== null) {
          try {
            const before = t.slice(last, m.index)
            if (before) out += `<div class="md-block">${this.mdParser.render(before)}</div>`
            const rawHtml = (m[1] || '').trim()
            out += `<div class="html-block">${sanitize(rawHtml)}</div>`
            last = re.lastIndex
          } catch (err) {
            console.warn('```html 블록 처리 실패:', err)
          }
        }
        const tail = t.slice(last)
        if (tail) out += `<div class="md-block">${this.mdParser.render(tail)}</div>`

        // 표 스크롤 래핑
        out = out.replace(/(<table[\s\S]*?<\/table>)/gi, '<div class="table-scroll">$1</div>')
        return sanitize(out)
      } catch (err) {
        console.error('safeFormat 실패, 위생 처리만 수행:', err)
        return DOMPurify.sanitize(String(text || ''))
      }
    },

    /* ===== 유틸 ===== */
    emojiFor(name = '') {
      try {
        const lower = String(name).toLowerCase()
        if (lower.endsWith('.pdf')) return '📕'
        if (/\.(docx?|odt)$/i.test(lower)) return '📘'
        if (/\.(xlsx?|ods)$/i.test(lower)) return '📗'
        if (/\.(pptx?|ppsx?)$/i.test(lower)) return '📙'
        if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(lower)) return '🖼'
        if (lower.endsWith('.txt')) return '📄'
      } catch (err) {
        console.warn('emojiFor 실패:', err)
      }
      return '📎'
    },
    formatSize(bytes = 0) {
      try {
        if (!bytes) return '0 B'
        const mb = bytes / 1024 / 1024
        if (mb >= 1) return `${mb.toFixed(2)} MB`
        const kb = bytes / 1024
        if (kb >= 1) return `${Math.round(kb)} KB`
        return `${bytes} B`
      } catch (err) {
        console.warn('formatSize 실패:', err)
        return `${bytes} B`
      }
    },

    openInNewTab(idx) {
      try {
        const list = Array.isArray(this.files) ? this.files : []
        const f = list[idx]
        const snap = this.snapshotUrl(f)
        if (snap) {
          window.open(snap, '_blank', 'noopener,noreferrer')
          return
        }
        if (!this.isNativeFile(f)) return
        let url = this.openUrlsMap[idx]
        if (!url) {
          url = URL.createObjectURL(f)
          this.openUrlsMap[idx] = url
          this.revokables.push(url)
        }
        window.open(url, '_blank', 'noopener,noreferrer')
      } catch (err) {
        console.error('openInNewTab 실패:', err)
        this.showToast('파일 열기 실패 ❌')
      }
    },

    snapshotFiles(list) {
      try {
        const arr = Array.isArray(list) ? list : []
        return arr.map((f) => ({
          name: f?.name || '',
          size: f?.size || 0,
          type: f?.type || '',
          url: this.snapshotUrl(f) || ''
        }))
      } catch (err) {
        console.error('snapshotFiles 실패:', err)
        return []
      }
    }
  }
}
</script>

<style scoped>
/* ===== 페이드 트랜지션 ===== */
:global(body.no-scroll) { overflow: hidden; }
.wb-fade-enter-active,
.wb-fade-leave-active { transition: opacity .2s ease; }
.wb-fade-enter-from,
.wb-fade-leave-to { opacity: 0; }

/* ===== 토스트 트랜지션 ===== */
.toast-fade-enter-active,
.toast-fade-leave-active { transition: opacity .25s ease, transform .25s ease; }
.toast-fade-enter-from,
.toast-fade-leave-to { opacity: 0; transform: translateY(8px); }

/* ===== 레이아웃 & 버튼 ===== */
.wb-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4000;
}
.wb-panel {
  width: min(1080px, 96vw);
  height: min(88vh, 100vh - 40px);
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.wb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}
.wb-actions { display: flex; gap: 8px; }
.btn {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-weight: 800;
  cursor: pointer;
}
.btn.ghost { background: #fff; }
/* ✅ Hermes Orange */
.btn.deploy {
  background: linear-gradient(135deg,#ff7b1c,#ff4d00);
  color: #fff;
  border: none;
  box-shadow: 0 6px 16px rgba(255,107,0,.25);
}
.btn.deploy:disabled { opacity: .6; cursor: not-allowed; }
.wb-body {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
  height: 100%;
}

/* ===== 첨부파일 ===== */
.wb-aside {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  overflow: auto;
  background: #fafcff;
}
.wb-aside h4 { margin: 0 0 8px 0; font-size: 14px; font-weight: 800; }
.file-list { display: grid; gap: 8px; }
.file-card {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 8px;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 6px;
  background: #fff;
}
.thumb {
  width: 56px;
  height: 56px;
  overflow: hidden;
  border-radius: 8px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb.blank { font-size: 20px; }
.meta .name {
  font-size: 13px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta .size { font-size: 12px; color: #64748b; }
.mini {
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}
.mini:hover { background: #f3f4f6; }

/* ===== 에디터 ===== */
.wb-main {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}
.wb-label { font-size: 12px; color: #6b7280; margin-bottom: 6px; font-weight: 700; }
.wb-toolbar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tbtn {
  font-size: 12px;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}
.tbtn.on {
  box-shadow: 0 0 0 3px rgba(37,99,235,.15);
  border-color: #2563eb;
}

/* TipTap 에디터 컨테이너 */
.wb-editor {
  flex: 1 1 auto;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  overflow: auto;
  background: #fff;
  color: #0f172a;
  line-height: 1.6;
}
.wb-editor * { text-align: left !important; }
.wb-editor a { color: #2563eb; text-decoration: underline; }

/* ===== 표 스타일 (scoped + :deep) ===== */
.wb-editor :deep(table) {
  border-collapse: separate;
  border-spacing: 0;
  width: max-content;
  max-width: 100%;
  background: #fff;
  border: 1px solid #94a3b8 !important; /* 바깥 테두리 */
  border-radius: 10px;
  overflow: hidden;
  text-align: center; /* 표 전체 가운데 정렬 */
}

/* ✅ 헤더(컬럼 제목) — 가운데 정렬 + 대비 배경 + 동일 테두리 색상 */
.wb-editor :deep(thead th) {
  background: #eef2ff;                     /* 옅은 인디고 톤 배경 */
  color: #0f172a;
  font-weight: 800;
  padding: 10px 12px;
  text-align: center;                       /* 가운데 정렬 */
  border-bottom: 1px solid #e5e7eb !important; /* 본문과 동일한 테두리 색 */
  border-right: 1px solid #e5e7eb !important;  /* 본문과 동일한 테두리 색 */
  white-space: nowrap;
}
.wb-editor :deep(thead th:last-child) { border-right: 0 !important; }

/* ✅ 본문 셀 — 헤더와 동일한 테두리 색상 */
.wb-editor :deep(tbody td) {
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb !important;
  border-right: 1px solid #e5e7eb !important;
  white-space: nowrap;
  text-align: center;
}
.wb-editor :deep(tbody td:last-child) { border-right: 0 !important; }
.wb-editor :deep(tbody tr:last-child td) { border-bottom: 0 !important; }

/* 가독성(줄무늬 + hover) */
.wb-editor :deep(tbody tr:nth-child(even) td) { background: #f9fbff; }
.wb-editor :deep(tbody tr:hover td) { background: #eef6ff; }

/* 첫 컬럼 강조(선택) */
.wb-editor :deep(tbody td:first-child) {
  background: #f8fafc;
  font-weight: 600;
}

/* ===== 토스트 ===== */
.wb-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  background: rgba(20,20,20,.92);
  color: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  box-shadow: 0 6px 18px rgba(0,0,0,.25);
  z-index: 4500;
  pointer-events: none;
}

/* ===== 반응형 ===== */
@media (max-width: 860px) {
  .wb-body { grid-template-columns: 1fr; }
}
</style>
