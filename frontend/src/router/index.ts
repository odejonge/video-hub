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
      path: '/clips/:id',
      name: 'clip-viewer',
      component: () => import('@/pages/ClipViewerPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/feed',
      name: 'feed',
      component: () => import('@/pages/FeedPage.vue'),
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
      path: '/videos',
      name: 'videos',
      component: () => import('@/pages/VideosPage.vue'),
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
      path: '/credits/result',
      name: 'credits-result',
      component: () => import('@/pages/CreditsResultPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/shared/:shareToken',
      name: 'shared-collection',
      component: () => import('@/pages/SharedCollectionPage.vue'),
    },
    {
      path: '/shared/:shareToken/clips/:clipId',
      name: 'shared-clip-viewer',
      component: () => import('@/pages/SharedClipViewerPage.vue'),
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('@/pages/TermsPage.vue'),
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/pages/PrivacyPage.vue'),
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth) {
    // If we have a token but no user yet, try to fetch user first
    if (auth.token && !auth.user) {
      await auth.fetchUser()
    }

    // Now check if logged in
    if (!auth.isLoggedIn) {
      next({ name: 'home' })
      return
    }
  }

  next()
})

export default router
