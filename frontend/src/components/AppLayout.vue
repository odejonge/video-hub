<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Nav -->
    <nav class="px-4 md:px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
      <div class="flex items-center gap-6">
        <RouterLink to="/tags" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <span class="text-white font-bold text-sm">D</span>
          </div>
          <span class="font-semibold text-lg hidden sm:inline">DanceClips</span>
        </RouterLink>

        <!-- Main nav links -->
        <div class="flex items-center gap-1">
          <RouterLink 
            to="/tags" 
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="$route.path.startsWith('/tags') || $route.path.startsWith('/clips')
              ? 'bg-brand-600/20 text-brand-400'
              : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-tertiary)]'"
          >
            🏷️ Tags
          </RouterLink>
          <RouterLink 
            to="/dashboard" 
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="$route.path.startsWith('/dashboard') || $route.path.startsWith('/collections') || $route.path.startsWith('/videos')
              ? 'bg-brand-600/20 text-brand-400'
              : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-tertiary)]'"
          >
            📁 Collecties
          </RouterLink>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <RouterLink to="/credits" class="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-white transition-colors">
          <span class="text-brand-400 font-medium">{{ auth.user?.credits ?? 0 }}</span>
          <span class="hidden sm:inline">credits</span>
        </RouterLink>

        <div class="flex items-center gap-3">
          <div v-if="auth.user?.avatar" class="w-8 h-8 rounded-full overflow-hidden">
            <img :src="auth.user.avatar" alt="" class="w-full h-full object-cover" />
          </div>
          <span class="text-sm hidden md:inline">{{ auth.user?.name }}</span>
          <button @click="logout" class="text-[var(--color-text-muted)] hover:text-white transition-colors text-sm">
            Uitloggen
          </button>
        </div>
      </div>
    </nav>

    <!-- Content -->
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>


