import { createRouter, createWebHistory } from 'vue-router';
import { hasValidAccessToken, loadAuthSession } from '@/utils/authStorage';

const routes = [
  {
    path: '/',
    redirect: '/chat',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/auth/google/callback',
    name: 'GoogleCallback',
    component: () => import('@/views/login/GoogleCallback.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/Chat.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const session = loadAuthSession();
  const isAuthenticated = hasValidAccessToken(session);

  if (to.meta?.requiresAuth && !isAuthenticated) {
    const redirect = {
      name: 'Login',
      ...(to.fullPath && to.fullPath !== '/login'
        ? { query: { redirect: to.fullPath } }
        : {}),
    };
    next(redirect);
    return;
  }

  if (to.meta?.requiresGuest && isAuthenticated) {
    next({ name: 'Chat' });
    return;
  }

  next();
});

export default router;
