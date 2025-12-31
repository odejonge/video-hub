<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/lib/api'
import AppLayout from '@/components/AppLayout.vue'

interface Clip {
  id: string
  title: string
  startTime: number
  endTime: number
  video: {
    id: string
    videoUrl: string
    bunnyVideoId: string
  }
  danceMove?: { name: string }
  tags: { tag: { id: string; name: string } }[]
  collection: { id: string; name: string }
}

const route = useRoute()
const tagName = ref('')
const clips = ref<Clip[]>([])
const loading = ref(true)

async function loadClips() {
  tagName.value = decodeURIComponent(route.params.tagName as string)
  loading.value = true
  try {
    const { data } = await api.get<Clip[]>(`/api/tags/${encodeURIComponent(tagName.value)}/clips`)
    clips.value = data
  } finally {
    loading.value = false
  }
}

function getThumbnail(clip: Clip) {
  const bunnyHost = 'vz-dfc1169e-a5d.b-cdn.net'
  return `https://${bunnyHost}/${clip.video.bunnyVideoId}/thumbnail.jpg`
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

onMounted(loadClips)
</script>

<template>
  <AppLayout>
    <div class="p-4 md:p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <header class="mb-6">
        <RouterLink 
          to="/tags" 
          class="text-[var(--color-text-muted)] hover:text-white mb-2 inline-flex items-center gap-1 text-sm"
        >
          ← Terug naar tags
        </RouterLink>
        <h1 class="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <span class="text-brand-400">🏷️</span>
          {{ tagName }}
        </h1>
        <p class="text-[var(--color-text-muted)] mt-1">
          {{ clips.length }} clip{{ clips.length === 1 ? '' : 's' }}
        </p>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="clips.length === 0" class="text-center py-12 text-[var(--color-text-muted)]">
        <p class="text-4xl mb-4">📭</p>
        <p>Geen clips met deze tag</p>
      </div>

      <!-- Clips grid -->
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <RouterLink
          v-for="clip in clips"
          :key="clip.id"
          :to="`/clips/${clip.id}`"
          class="card overflow-hidden group hover:ring-2 hover:ring-brand-500 transition-all"
        >
          <!-- Thumbnail -->
          <div class="aspect-video bg-[var(--color-bg-tertiary)] relative">
            <img 
              :src="getThumbnail(clip)" 
              :alt="clip.title"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
              {{ formatTime(clip.endTime - clip.startTime) }}
            </div>
            <!-- Play overlay -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <svg class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Info -->
          <div class="p-3 space-y-2">
            <h3 class="font-medium truncate">{{ clip.title }}</h3>

            <div class="flex flex-wrap gap-1">
              <span 
                v-for="ct in clip.tags" 
                :key="ct.tag.id"
                class="text-xs px-2 py-0.5 rounded-full"
                :class="ct.tag.name === tagName 
                  ? 'bg-brand-600/30 text-brand-400' 
                  : 'bg-[var(--color-bg-tertiary)]'"
              >
                {{ ct.tag.name }}
              </span>
            </div>

            <div class="text-xs text-[var(--color-text-muted)]">
              {{ clip.collection.name }}
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </AppLayout>
</template>

