import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/pages/AuthCallbackPage.vue'),
    },
    {
      path: '/auth/failed',
      name: 'auth-failed',
      component: () => import('@/pages/AuthFailedPage.vue'),
    },
    {
      path: '/tags',
      name: 'tags',
      component: () => import('@/pages/TagsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tags/:tagName',
      name: 'tag-clips',
      component: () => import('@/pages/TagClipsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/clips/:id',
      name: 'clip-viewer',
      component: () => import('@/pages/ClipViewerPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/DashboardPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/collections/:id',
      name: 'collection',
      component: () => import('@/pages/CollectionPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/videos/:id',
      name: 'video-editor',
      component: () => import('@/pages/VideoEditorPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/credits',
      name: 'credits',
      component: () => import('@/pages/CreditsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/credits/success',
      name: 'credits-success',
      component: () => import('@/pages/CreditsSuccessPage.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router


