<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

interface Video {
  id: string
  title: string
  thumbnailUrl: string | null
  duration: number | null
  _count: { clips: number }
}

interface Collection {
  id: string
  name: string
  description: string | null
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const collection = ref<Collection | null>(null)
const videos = ref<Video[]>([])
const showUploadModal = ref(false)

// Upload state
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const videoTitle = ref('')
const uploadProgress = ref(0)
const isUploading = ref(false)
const uploadError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

async function loadCollection() {
  try {
    const res = await api.get<Collection>(`/api/collections/${route.params.id}`)
    collection.value = res.data
  } catch {
    router.push('/dashboard')
  }
}

async function loadVideos() {
  try {
    const res = await api.get<Video[]>(`/api/videos/collection/${route.params.id}`)
    videos.value = res.data
  } catch {
    // Ignore
  }
}

function openVideo(video: Video) {
  router.push(`/videos/${video.id}`)
}

// Drag & Drop handlers
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
  if (!selectedFile.value || !collection.value) return

  isUploading.value = true
  uploadError.value = ''
  uploadProgress.value = 0

  try {
    const duration = await getVideoDuration(selectedFile.value)

    // 1. Get upload URL from backend (now using /api/videos)
    const { data: uploadData } = await api.post<{
      uploadUrl: string
      bunnyVideoId: string
      creditsUsed: number
      authHeader: string
    }>('/api/videos/upload-url', {
      title: videoTitle.value,
      durationSeconds: duration,
      collectionId: collection.value.id,
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

    // 3. Confirm upload (now using /api/videos)
    const { data: newVideo } = await api.post<Video>('/api/videos/confirm-upload', {
      bunnyVideoId: uploadData.bunnyVideoId,
      title: videoTitle.value,
      collectionId: collection.value.id,
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

function formatDuration(seconds: number | null) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

onMounted(() => {
  loadCollection()
  loadVideos()
})
</script>

<template>
  <AppLayout>
    <div class="max-w-6xl mx-auto px-6 py-8">
      <!-- Back link -->
      <RouterLink to="/dashboard" class="text-[var(--color-text-muted)] hover:text-white mb-4 inline-flex items-center gap-1">
        ← Terug naar collecties
      </RouterLink>

      <div v-if="collection">
        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-3xl font-bold">{{ collection.name }}</h1>
            <p v-if="collection.description" class="text-[var(--color-text-muted)] mt-1">
              {{ collection.description }}
            </p>
          </div>
          <button @click="showUploadModal = true" class="btn btn-primary flex items-center gap-2">
            <span class="text-xl">+</span>
            Video uploaden
          </button>
        </div>

        <!-- Videos grid -->
        <div v-if="videos.length" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="video in videos"
            :key="video.id"
            @click="openVideo(video)"
            class="card overflow-hidden cursor-pointer group hover:border-brand-500/50 transition-colors"
          >
            <div class="aspect-video bg-black/50 relative">
              <img
                v-if="video.thumbnailUrl"
                :src="video.thumbnailUrl"
                :alt="video.title"
                class="w-full h-full object-cover"
              />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <span class="text-2xl">✏️</span>
                </div>
              </div>
              <!-- Duration badge -->
              <div class="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-mono">
                {{ formatDuration(video.duration) }}
              </div>
            </div>
            <div class="p-4">
              <h3 class="font-medium truncate">{{ video.title }}</h3>
              <p class="text-sm text-[var(--color-text-muted)] mt-1">
                {{ video._count.clips }} clip{{ video._count.clips !== 1 ? 's' : '' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="card p-12 text-center">
          <div class="w-16 h-16 rounded-full bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">🎬</span>
          </div>
          <h3 class="text-xl font-semibold mb-2">Nog geen video's</h3>
          <p class="text-[var(--color-text-muted)] mb-6">
            Upload je eerste video om clips te maken.
          </p>
          <button @click="showUploadModal = true" class="btn btn-primary">
            Video uploaden
          </button>
        </div>
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
            <div class="text-4xl mb-3">🎬</div>
            <p class="text-[var(--color-text-muted)]">
              Sleep een video hierheen of klik om te selecteren
            </p>
          </div>

          <!-- Selected file preview -->
          <div v-else class="space-y-4">
            <div class="bg-white/5 rounded-lg p-4 flex items-center gap-3">
              <div class="text-3xl">🎥</div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ selectedFile.name }}</p>
                <p class="text-sm text-[var(--color-text-muted)]">
                  {{ (selectedFile.size / 1024 / 1024).toFixed(1) }} MB
                </p>
              </div>
              <button @click="selectedFile = null" class="text-[var(--color-text-muted)] hover:text-white">
                ✕
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
