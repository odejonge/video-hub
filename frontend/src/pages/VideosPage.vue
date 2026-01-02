<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'
import Icon from '@/components/Icons.vue'

interface Video {
  id: string
  title: string
  thumbnailUrl: string | null
  duration: number | null
  createdAt: string
  owner: { id: string; name: string | null; email: string }
  _count: { clips: number }
}

const router = useRouter()
const auth = useAuthStore()
const videos = ref<Video[]>([])
const loading = ref(true)
const filter = ref<'all' | 'owned' | 'shared'>('all')

// Upload state
const showUploadModal = ref(false)
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const videoTitle = ref('')
const uploadProgress = ref(0)
const isUploading = ref(false)
const uploadError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const filteredVideos = computed(() => {
  if (filter.value === 'all') return videos.value
  // We'd need currentUser to filter, for now show all
  return videos.value
})

async function loadVideos() {
  loading.value = true
  try {
    const res = await api.get<Video[]>('/api/videos')
    videos.value = res.data
  } finally {
    loading.value = false
  }
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

// Upload handlers
function onDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    handleFile(input.files[0])
  }
}

function handleFile(file: File) {
  if (!file.type.startsWith('video/')) {
    uploadError.value = 'Alleen videobestanden zijn toegestaan'
    return
  }
  selectedFile.value = file
  videoTitle.value = file.name.replace(/\.[^/.]+$/, '')
  uploadError.value = ''
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      resolve(video.duration)
      URL.revokeObjectURL(video.src)
    }
    video.src = URL.createObjectURL(file)
  })
}

async function uploadVideo() {
  if (!selectedFile.value) return

  isUploading.value = true
  uploadError.value = ''
  uploadProgress.value = 0

  try {
    const duration = await getVideoDuration(selectedFile.value)

    // 1. Get upload URL from backend
    const { data: uploadData } = await api.post<{
      uploadUrl: string
      bunnyVideoId: string
      creditsUsed: number
      authHeader: string
    }>('/api/videos/upload-url', {
      title: videoTitle.value,
      durationSeconds: duration,
    })

    // 2. Upload to Bunny
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadData.uploadUrl)
    xhr.setRequestHeader('AccessKey', uploadData.authHeader)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
    }

    await new Promise<void>((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error('Upload failed'))
        }
      }
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(selectedFile.value)
    })

    // 3. Confirm upload
    const { data: newVideo } = await api.post<Video>('/api/videos/confirm-upload', {
      bunnyVideoId: uploadData.bunnyVideoId,
      title: videoTitle.value,
      duration,
    })

    // 4. Refresh & close, then open video editor
    await auth.fetchUser()
    closeUploadModal()
    router.push(`/videos/${newVideo.id}`)
  } catch (err: any) {
    console.error(err)
    if (err.message?.includes('insufficient_credits')) {
      uploadError.value = 'Niet genoeg credits'
    } else {
      uploadError.value = 'Upload mislukt, probeer opnieuw'
    }
  } finally {
    isUploading.value = false
  }
}

function closeUploadModal() {
  showUploadModal.value = false
  selectedFile.value = null
  videoTitle.value = ''
  uploadProgress.value = 0
  uploadError.value = ''
}

onMounted(loadVideos)
</script>

<template>
  <AppLayout>
    <div class="max-w-6xl mx-auto px-6 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold">Mijn Video's</h1>
          <p class="text-[var(--color-text-muted)] mt-1">
            {{ videos.length }} video{{ videos.length !== 1 ? "'s" : '' }}
          </p>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Filter -->
          <div class="flex gap-2">
            <button
              @click="filter = 'all'"
              class="px-3 py-1.5 rounded text-sm transition-colors"
              :class="filter === 'all' ? 'bg-brand-500 text-white' : 'bg-white/5 hover:bg-white/10'"
            >
              Alle
            </button>
            <button
              @click="filter = 'owned'"
              class="px-3 py-1.5 rounded text-sm transition-colors"
              :class="filter === 'owned' ? 'bg-brand-500 text-white' : 'bg-white/5 hover:bg-white/10'"
            >
              Eigen
            </button>
            <button
              @click="filter = 'shared'"
              class="px-3 py-1.5 rounded text-sm transition-colors"
              :class="filter === 'shared' ? 'bg-brand-500 text-white' : 'bg-white/5 hover:bg-white/10'"
            >
              Gedeeld
            </button>
          </div>
          
          <!-- Upload button -->
          <button @click="showUploadModal = true" class="btn btn-primary flex items-center gap-2">
            <Icon name="upload" :size="18" />
            Video uploaden
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
      </div>

      <!-- Videos Grid -->
      <div v-else-if="filteredVideos.length" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="video in filteredVideos"
          :key="video.id"
          class="card overflow-hidden group cursor-pointer hover:ring-2 hover:ring-brand-500/50 transition-all"
          @click="router.push(`/videos/${video.id}`)"
        >
          <!-- Thumbnail -->
          <div class="aspect-video bg-black/50 relative">
            <img
              v-if="video.thumbnailUrl"
              :src="video.thumbnailUrl"
              :alt="video.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <Icon name="video" :size="48" class="text-[var(--color-text-muted)]" />
            </div>
            
            <!-- Duration badge -->
            <div class="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs">
              {{ formatDuration(video.duration) }}
            </div>
            
            <!-- Clips badge -->
            <div class="absolute top-2 right-2 bg-brand-500/90 px-2 py-0.5 rounded text-xs">
              {{ video._count.clips }} clips
            </div>
          </div>
          
          <!-- Info -->
          <div class="p-4">
            <h3 class="font-semibold group-hover:text-brand-400 transition-colors truncate">
              {{ video.title }}
            </h3>
            <div class="flex items-center justify-between text-sm text-[var(--color-text-muted)] mt-1">
              <span>{{ video.owner.name || video.owner.email }}</span>
              <span>{{ formatDate(video.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="card p-12 text-center">
        <div class="w-16 h-16 rounded-full bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
          <Icon name="video" :size="32" />
        </div>
        <h3 class="text-xl font-semibold mb-2">Nog geen video's</h3>
        <p class="text-[var(--color-text-muted)] mb-6">
          Upload je eerste video om clips te kunnen maken.
        </p>
        <button @click="showUploadModal = true" class="btn btn-primary">
          Video uploaden
        </button>
      </div>
    </div>

    <!-- Upload Modal -->
    <Teleport to="body">
      <div v-if="showUploadModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="closeUploadModal">
        <div class="card p-6 w-full max-w-md space-y-4">
          <h2 class="text-xl font-semibold">Video uploaden</h2>
          <p class="text-[var(--color-text-muted)]">
            Je hebt <span class="text-brand-400 font-medium">{{ auth.user?.credits ?? 0 }}</span> credits beschikbaar.
          </p>
          <p class="text-sm text-[var(--color-text-muted)]">
            Upload één keer, maak onbeperkt clips.
          </p>

          <!-- Dropzone -->
          <div
            v-if="!selectedFile"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
            @click="triggerFileInput"
            class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
            :class="isDragging ? 'border-brand-500 bg-brand-500/10' : 'border-[var(--color-border)] hover:border-brand-500/50'"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept="video/*"
              class="hidden"
              @change="onFileSelect"
            />
            <Icon name="upload" :size="48" class="mb-3 text-[var(--color-text-muted)]" />
            <p class="text-[var(--color-text-muted)]">
              Sleep een video hierheen of klik om te selecteren
            </p>
          </div>

          <!-- Selected file preview -->
          <div v-else class="space-y-4">
            <div class="bg-white/5 rounded-lg p-4 flex items-center gap-3">
              <Icon name="video" :size="32" class="text-brand-400" />
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ selectedFile.name }}</p>
                <p class="text-sm text-[var(--color-text-muted)]">
                  {{ (selectedFile.size / 1024 / 1024).toFixed(1) }} MB
                </p>
              </div>
              <button @click="selectedFile = null" class="text-[var(--color-text-muted)] hover:text-white">
                <Icon name="x" :size="20" />
              </button>
            </div>

            <input
              v-model="videoTitle"
              type="text"
              placeholder="Titel van de video"
              class="input w-full"
            />

            <!-- Progress bar -->
            <div v-if="isUploading" class="space-y-2">
              <div class="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  class="h-full bg-brand-500 transition-all duration-300"
                  :style="{ width: `${uploadProgress}%` }"
                ></div>
              </div>
              <p class="text-sm text-center text-[var(--color-text-muted)]">
                {{ uploadProgress }}% geüpload...
              </p>
            </div>
          </div>

          <!-- Error -->
          <p v-if="uploadError" class="text-red-400 text-sm">
            {{ uploadError }}
          </p>

          <div class="flex gap-3 justify-end">
            <button @click="closeUploadModal" class="btn btn-secondary" :disabled="isUploading">
              Annuleren
            </button>
            <button
              v-if="selectedFile"
              @click="uploadVideo"
              class="btn btn-primary"
              :disabled="isUploading || !videoTitle.trim()"
            >
              {{ isUploading ? 'Uploaden...' : 'Uploaden' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
