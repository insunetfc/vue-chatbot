import { createRouter, createWebHistory } from 'vue-router'
import BuildPublicPage from '@/pages/BuildPublicPage.vue' // 경로는 프로젝트 구조에 맞게

const routes = [
  // ...기존 라우트
  {
    path: '/preview',
    name: 'Preview',
    component: BuildPublicPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
