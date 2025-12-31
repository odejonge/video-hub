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
      const res = await api.get('/auth/me')
      user.value = res.data
    } catch {
      logout()
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

  function loginWithGoogle() {
    // Use relative URL - works with reverse proxy
    window.location.href = '/auth/google'
  }

  function loginWithFacebook() {
    // Use relative URL - works with reverse proxy
    window.location.href = '/auth/facebook'
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
