import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  credits: number
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)

  const isLoggedIn = computed(() => !!user.value)

  async function fetchUser() {
    if (!token.value) return

    try {
      loading.value = true
      const res = await api.get<User>('/auth/me')
      user.value = res.data
    } catch (error: unknown) {
      // Only logout on auth errors (401, 403)
      if (error instanceof Error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('403') || msg.includes('forbidden')) {
          console.log('Auth error, logging out:', error.message)
          logout()
        } else {
          // Network error etc - don't logout, keep token
          console.log('Non-auth error fetching user:', error.message)
        }
      }
    } finally {
      loading.value = false
    }
  }

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  function getApiUrl() {
    // Check build-time env var first
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL
    }
    // Auto-detect Railway production: if frontend is on railway, use backend URL
    const host = window.location.hostname
    if (host.includes('.up.railway.app')) {
      // Replace frontend hostname with backend hostname
      // mellow-dream-production-978e -> video-hub-production-528f
      return 'https://video-hub-production-528f.up.railway.app'
    }
    // Development: use relative URL (works with reverse proxy)
    return ''
  }

  function loginWithGoogle() {
    window.location.href = `${getApiUrl()}/auth/google`
  }

  function loginWithFacebook() {
    window.location.href = `${getApiUrl()}/auth/facebook`
  }

  return {
    user,
    token,
    loading,
    isLoggedIn,
    fetchUser,
    setToken,
    logout,
    loginWithGoogle,
    loginWithFacebook,
  }
})
