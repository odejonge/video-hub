<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { publicFetch } from '@/lib/api'
import Icon from '@/components/Icons.vue'

interface Tag {
  id: string
  name: string
  _count: { clips: number }
}

interface Clip {
  id: string
  title: string
  startTime: number
  endTime: number | null
  video: {
    id: string
    thumbnailUrl: string | null
    videoUrl: string
  }
  tags: { tag: Tag }[]
}

interface SharedCollection {
  id: string
  name: string
  description: string | null
  tags: Tag[]
  clips: Clip[]
}

const route = useRoute()
const router = useRouter()
const collection = ref<SharedCollection | null>(null)
const loading = ref(true)
const error = ref(false)
const selectedTagId = ref<string | null>(null)

const filteredClips = computed(() => {
  if (!collection.value) return []
  if (!selectedTagId.value) return collection.value.clips
  return collection.value.clips.filter(clip =>
    clip.tags.some(ct => ct.tag.id === selectedTagId.value)
  )
})

const tagsWithClips = computed(() => {
  if (!collection.value) return []
  return collection.value.tags.filter(t => t._count.clips > 0)
})

async function loadCollection() {
  loading.value = true
  error.value = false
  try {
    const data = await publicFetch<SharedCollection>(
      `/api/collections/shared/${route.params.shareToken}`
    )
    collection.value = data
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function openClip(clip: Clip) {
  router.push(`/shared/${route.params.shareToken}/clips/${clip.id}`)
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

onMounted(loadCollection)
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg-primary)] text-white">
    <!-- Header -->
    <header class="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Icon name="clip" :size="18" />
          </div>
          <span class="font-semibold text-lg">Video Hub</span>
        </div>
        <RouterLink to="/" class="btn btn-primary text-sm px-4 py-2">
          Aanmelden
        </RouterLink>
      </div>
    </header>

    <div class="max-w-6xl mx-auto px-6 py-8">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-12">
        <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <Icon name="x" :size="32" />
        </div>
        <h2 class="text-xl font-semibold mb-2">Collectie niet gevonden</h2>
        <p class="text-[var(--color-text-muted)]">
          Deze deellink is ongeldig of ingetrokken.
        </p>
      </div>

      <!-- Collection content -->
      <div v-else-if="collection">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold">{{ collection.name }}</h1>
          <p v-if="collection.description" class="text-[var(--color-text-muted)] mt-1">
            {{ collection.description }}
          </p>
          <p class="text-sm text-[var(--color-text-muted)] mt-2">
            {{ collection.clips.length }} clips
          </p>
        </div>

        <!-- Tag filter -->
        <div v-if="tagsWithClips.length" class="flex flex-wrap gap-2 mb-6">
          <button
            @click="selectedTagId = null"
            class="px-3 py-1 rounded-full text-sm transition-colors"
            :class="selectedTagId === null
              ? 'bg-brand-500 text-white'
              : 'bg-white/10 hover:bg-white/20'"
          >
            Alle
          </button>
          <button
            v-for="tag in tagsWithClips"
            :key="tag.id"
            @click="selectedTagId = tag.id"
            class="px-3 py-1 rounded-full text-sm transition-colors"
            :class="selectedTagId === tag.id
              ? 'bg-brand-500 text-white'
              : 'bg-white/10 hover:bg-white/20'"
          >
            {{ tag.name }} ({{ tag._count.clips }})
          </button>
        </div>

        <!-- Clips grid -->
        <div v-if="filteredClips.length" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="clip in filteredClips"
            :key="clip.id"
            @click="openClip(clip)"
            class="card overflow-hidden cursor-pointer group hover:ring-2 hover:ring-brand-500/50 transition-all"
          >
            <div class="aspect-square bg-black/50 relative">
              <img
                v-if="clip.video.thumbnailUrl"
                :src="clip.video.thumbnailUrl"
                :alt="clip.title"
                class="w-full h-full object-cover object-center"
              />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Icon name="play" :size="24" />
                </div>
              </div>
              <div class="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-mono">
                {{ formatTime(clip.startTime) }} - {{ clip.endTime ? formatTime(clip.endTime) : '...' }}
              </div>
            </div>
            <div class="p-4">
              <h3 class="font-medium truncate">{{ clip.title }}</h3>
              <div v-if="clip.tags.length" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="ct in clip.tags"
                  :key="ct.tag.id"
                  class="px-2 py-0.5 bg-white/10 rounded-full text-xs"
                >
                  {{ ct.tag.name }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else class="card p-12 text-center">
          <p class="text-[var(--color-text-muted)]">Geen clips gevonden.</p>
        </div>
      </div>
    </div>
  </div>
</template>
