<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')

  if (token) {
    auth.setToken(token)
    await auth.fetchUser()
    router.push('/dashboard')
  } else {
    router.push('/auth/failed')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center space-y-4">
      <div class="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-[var(--color-text-muted)]">Even geduld...</p>
    </div>
  </div>
</template>


