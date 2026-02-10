<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icons.vue'
import versionData from '@/version.json'

const auth = useAuthStore()
const router = useRouter()
const version = versionData.version

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Nav -->
    <nav class="px-4 md:px-6 py-4 flex items-center justify-between gap-2 border-b border-[var(--color-border)]">
      <div class="flex items-center gap-3 md:gap-6 min-w-0">
        <RouterLink to="/dashboard" class="flex items-center gap-2 shrink-0">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <span class="text-white font-bold text-sm">D</span>
          </div>
          <span class="font-semibold text-lg hidden sm:inline">DanceClips</span>
        </RouterLink>

        <!-- Main nav links -->
        <div class="flex items-center gap-1">
          <RouterLink 
            to="/feed" 
            class="inline-flex items-center gap-1 px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
            :class="$route.path === '/feed'
              ? 'bg-brand-600/20 text-brand-400'
              : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-tertiary)]'"
          >
            <Icon name="shuffle" :size="16" /> <span class="hidden sm:inline">Feed</span>
          </RouterLink>
          <RouterLink 
            to="/dashboard" 
            class="inline-flex items-center gap-1 px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
            :class="$route.path.startsWith('/dashboard') || $route.path.startsWith('/collections') || $route.path.startsWith('/clips')
              ? 'bg-brand-600/20 text-brand-400'
              : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-tertiary)]'"
          >
            <Icon name="folder" :size="16" /> <span class="hidden sm:inline">Collecties</span>
          </RouterLink>
          <RouterLink 
            to="/videos" 
            class="inline-flex items-center gap-1 px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
            :class="$route.path === '/videos' || ($route.path.startsWith('/videos/') && !$route.path.includes('/collections'))
              ? 'bg-brand-600/20 text-brand-400'
              : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-tertiary)]'"
          >
            <Icon name="video" :size="16" /> <span class="hidden sm:inline">Video's</span>
          </RouterLink>
        </div>
      </div>

      <div class="flex items-center gap-2 md:gap-4 shrink-0">
        <RouterLink to="/credits" class="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-white transition-colors">
          <span class="text-brand-400 font-medium">{{ auth.user?.credits ?? 0 }}</span>
          <span class="hidden sm:inline">credits</span>
        </RouterLink>

        <div class="flex items-center gap-3">
          <div v-if="auth.user?.avatar" class="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <img :src="auth.user.avatar" alt="" class="w-full h-full object-cover" />
          </div>
          <span class="text-sm hidden md:inline">{{ auth.user?.name }}</span>
          <div class="flex flex-col items-end">
            <button @click="logout" class="text-[var(--color-text-muted)] hover:text-white transition-colors text-sm">
              Uitloggen
            </button>
            <!-- Version number -->
            <span v-if="version" class="text-[10px] text-gray-500 leading-none">v{{ version }}</span>
          </div>
        </div>
      </div>
    </nav>

    <!-- Content -->
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>


