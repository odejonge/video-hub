<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  await auth.fetchUser()
  setTimeout(() => {
    router.push('/credits')
  }, 2000)
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-6">
    <div class="text-center space-y-6 max-w-md">
      <div class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
        <span class="text-3xl">✓</span>
      </div>
      <h1 class="text-2xl font-bold">Betaling gelukt!</h1>
      <p class="text-[var(--color-text-muted)]">
        Je credits zijn toegevoegd aan je account.
      </p>
      <RouterLink to="/credits" class="btn btn-primary inline-block">
        Naar credits
      </RouterLink>
    </div>
  </div>
</template>


