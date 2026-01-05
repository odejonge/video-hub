<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import Icon from '@/components/Icons.vue'

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
  tags: { tag: { id: string; name: string } }[]
  collection: { id: string; name: string }
}

interface Collection {
  id: string
  name: string
}

const route = useRoute()
const router = useRouter()

const clip = ref<Clip | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)
const controlsVisible = ref(true)
const isPortrait = ref(false)
const isFullscreen = ref(false)
const isIOSMobile = ref(false)
const isMuted = ref(true) // Start muted for autoplay

// Copy/Move/Share modal state
const showCopyModal = ref(false)
const showMoveModal = ref(false)
const showShareModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const collections = ref<Collection[]>([])
const selectedCollectionId = ref<string | null>(null)
const shareEmail = ref('')
const isCopying = ref(false)
const isMoving = ref(false)
const isSharing = ref(false)
const isEditing = ref(false)
const isDeleting = ref(false)
const copySuccess = ref(false)
const moveSuccess = ref(false)
const shareSuccess = ref(false)
const shareError = ref('')

// Edit form
const editTitle = ref('')
const editTags = ref<string[]>([])
const editTagInput = ref('')

let hideControlsTimeout: ReturnType<typeof setTimeout> | null = null

const progress = computed(() => {
  if (!clip.value) return 0
  const clipDuration = clip.value.endTime - clip.value.startTime
  const clipProgress = currentTime.value - clip.value.startTime
  return (clipProgress / clipDuration) * 100
})

const clipDuration = computed(() => {
  if (!clip.value) return 0
  return clip.value.endTime - clip.value.startTime
})

const clipCurrentTime = computed(() => {
  if (!clip.value) return 0
  return Math.max(0, currentTime.value - clip.value.startTime)
})

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function loadClip() {
  loading.value = true
  try {
    const { data } = await api.get<Clip>(`/api/clips/${route.params.id}`)
    clip.value = data
  } catch (e) {
    router.push('/dashboard')
  } finally {
    loading.value = false
  }
}

async function loadCollections() {
  try {
    const { data } = await api.get<Collection[]>('/api/collections')
    collections.value = data
  } catch {}
}

function onVideoLoaded() {
  if (!videoRef.value || !clip.value) return
  
  const video = videoRef.value
  isPortrait.value = video.videoHeight > video.videoWidth
  video.currentTime = clip.value.startTime
  duration.value = video.duration
  
  // Auto-play the clip (muted)
  video.play()
    .then(() => {
      playing.value = true
    })
    .catch(() => {})
}

function onTimeUpdate() {
  if (!videoRef.value || !clip.value) return
  currentTime.value = videoRef.value.currentTime
  if (currentTime.value >= clip.value.endTime) {
    videoRef.value.currentTime = clip.value.startTime
  }
}

function togglePlay() {
  if (!videoRef.value) return
  if (playing.value) {
    videoRef.value.pause()
  } else {
    videoRef.value.play()
  }
  playing.value = !playing.value
}

function toggleMute() {
  if (!videoRef.value) return
  isMuted.value = !isMuted.value
  videoRef.value.muted = isMuted.value
}

function toggleControls() {
  controlsVisible.value = !controlsVisible.value
  if (controlsVisible.value && playing.value) {
    resetHideControlsTimer()
  } else if (hideControlsTimeout) {
    clearTimeout(hideControlsTimeout)
  }
}

const isScrubbing = ref(false)
const progressBarRef = ref<HTMLElement | null>(null)
const wasPlayingBeforeScrub = ref(false)

function getSeekPosition(e: MouseEvent | TouchEvent) {
  if (!progressBarRef.value || !clip.value) return null
  const rect = progressBarRef.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  return clip.value.startTime + (percent * clipDuration.value)
}

function startScrub(e: MouseEvent | TouchEvent) {
  if (!videoRef.value || !clip.value) return
  isScrubbing.value = true
  wasPlayingBeforeScrub.value = playing.value
  const newTime = getSeekPosition(e)
  if (newTime !== null) {
    videoRef.value.currentTime = newTime
  }
  if (playing.value) {
    videoRef.value.pause()
    playing.value = false
  }
  if (!('touches' in e)) {
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }
}

function handleGlobalMouseMove(e: MouseEvent) {
  if (!isScrubbing.value || !videoRef.value) return
  const newTime = getSeekPosition(e)
  if (newTime !== null) {
    videoRef.value.currentTime = newTime
  }
}

function handleGlobalMouseUp() {
  endScrub()
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('mouseup', handleGlobalMouseUp)
}

function scrub(e: TouchEvent) {
  if (!isScrubbing.value || !videoRef.value) return
  const newTime = getSeekPosition(e)
  if (newTime !== null) {
    videoRef.value.currentTime = newTime
  }
}

function endScrub() {
  if (!isScrubbing.value) return
  isScrubbing.value = false
  if (wasPlayingBeforeScrub.value && videoRef.value) {
    videoRef.value.play()
    playing.value = true
  }
  resetHideControlsTimer()
}

function setPlaybackRate(rate: number) {
  if (!videoRef.value) return
  playbackRate.value = rate
  videoRef.value.playbackRate = rate
  resetHideControlsTimer()
}

function resetHideControlsTimer() {
  if (hideControlsTimeout) {
    clearTimeout(hideControlsTimeout)
  }
  if (playing.value && controlsVisible.value) {
    hideControlsTimeout = setTimeout(() => {
      controlsVisible.value = false
    }, 1500)
  }
}

function canUseFullscreenAPI() {
  return !!(document.fullscreenEnabled || (document as any).webkitFullscreenEnabled)
}

function toggleFullscreen() {
  const container = containerRef.value
  if (!container) return
  if (!canUseFullscreenAPI()) {
    isFullscreen.value = !isFullscreen.value
    return
  }
  const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
  if (!isCurrentlyFullscreen) {
    if (container.requestFullscreen) {
      container.requestFullscreen().catch(err => console.error('Fullscreen failed:', err))
    } else if ((container as any).webkitRequestFullscreen) {
      (container as any).webkitRequestFullscreen()
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen()
    }
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
}

function goBack() {
  router.back()
}

// Copy clip to another collection
async function openCopyModal() {
  await loadCollections()
  selectedCollectionId.value = null
  copySuccess.value = false
  showCopyModal.value = true
}

async function copyClip() {
  if (!clip.value || !selectedCollectionId.value) return
  isCopying.value = true
  try {
    await api.post(`/api/clips/${clip.value.id}/copy`, {
      targetCollectionId: selectedCollectionId.value,
    })
    copySuccess.value = true
    setTimeout(() => {
      showCopyModal.value = false
    }, 1500)
  } catch (e) {
    console.error('Copy failed:', e)
  } finally {
    isCopying.value = false
  }
}

// Move clip to another collection
async function openMoveModal() {
  await loadCollections()
  selectedCollectionId.value = null
  moveSuccess.value = false
  showMoveModal.value = true
}

async function moveClip() {
  if (!clip.value || !selectedCollectionId.value) return
  isMoving.value = true
  try {
    await api.post(`/api/clips/${clip.value.id}/move`, {
      targetCollectionId: selectedCollectionId.value,
    })
    moveSuccess.value = true
    setTimeout(() => {
      showMoveModal.value = false
      // Reload clip to get updated collection
      loadClip()
    }, 1500)
  } catch (e) {
    console.error('Move failed:', e)
  } finally {
    isMoving.value = false
  }
}

// Share clip with another user
async function openShareModal() {
  shareEmail.value = ''
  shareSuccess.value = false
  shareError.value = ''
  showShareModal.value = true
}

async function shareClip() {
  if (!clip.value || !shareEmail.value) return
  isSharing.value = true
  shareError.value = ''
  try {
    await api.post(`/api/clips/${clip.value.id}/share`, {
      targetUserEmail: shareEmail.value,
    })
    shareSuccess.value = true
    setTimeout(() => {
      showShareModal.value = false
    }, 1500)
  } catch (e: any) {
    if (e.message?.includes('user_not_found')) {
      shareError.value = 'Gebruiker niet gevonden'
    } else {
      shareError.value = 'Delen mislukt'
    }
  } finally {
    isSharing.value = false
  }
}

function openEditModal() {
  if (!clip.value) return
  editTitle.value = clip.value.title
  editTags.value = clip.value.tags.map(ct => ct.tag.name)
  showEditModal.value = true
}

function addEditTag() {
  const tag = editTagInput.value.trim().toLowerCase()
  if (tag && !editTags.value.includes(tag)) {
    editTags.value.push(tag)
  }
  editTagInput.value = ''
}

function removeEditTag(tag: string) {
  editTags.value = editTags.value.filter(t => t !== tag)
}

async function saveEdit() {
  if (!clip.value || !editTitle.value.trim()) return
  isEditing.value = true
  try {
    await api.put(`/api/clips/${clip.value.id}`, {
      title: editTitle.value.trim(),
      tags: editTags.value,
    })
    clip.value.title = editTitle.value.trim()
    clip.value.tags = editTags.value.map(name => ({ tag: { id: name, name } }))
    showEditModal.value = false
  } catch (e) {
    console.error('Failed to update clip:', e)
  } finally {
    isEditing.value = false
  }
}

function openDeleteModal() {
  showDeleteModal.value = true
}

async function deleteClip() {
  if (!clip.value) return
  isDeleting.value = true
  try {
    await api.delete(`/api/clips/${clip.value.id}`)
    router.push(`/collections/${clip.value.collection.id}`)
  } catch (e) {
    console.error('Failed to delete clip:', e)
  } finally {
    isDeleting.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!videoRef.value || !clip.value) return
  if (showCopyModal.value || showMoveModal.value || showShareModal.value || showEditModal.value || showDeleteModal.value) return
  
  switch (e.key) {
    case ' ':
    case 'k':
      e.preventDefault()
      togglePlay()
      controlsVisible.value = true
      resetHideControlsTimer()
      break
    case 'ArrowLeft':
      e.preventDefault()
      videoRef.value.currentTime = Math.max(clip.value.startTime, currentTime.value - 5)
      controlsVisible.value = true
      resetHideControlsTimer()
      break
    case 'ArrowRight':
      e.preventDefault()
      videoRef.value.currentTime = Math.min(clip.value.endTime, currentTime.value + 5)
      controlsVisible.value = true
      resetHideControlsTimer()
      break
    case 'f':
      e.preventDefault()
      toggleFullscreen()
      break
    case 'Escape':
      if (!isFullscreen.value) goBack()
      break
  }
}

watch(playing, (isPlaying) => {
  if (isPlaying) {
    resetHideControlsTimer()
  } else {
    if (hideControlsTimeout) {
      clearTimeout(hideControlsTimeout)
    }
  }
})

onMounted(() => {
  loadClip()
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange)
  
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isMobile = /Mobi|Android/i.test(ua) || navigator.maxTouchPoints > 1
  isIOSMobile.value = isIOS && isMobile
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('mouseup', handleGlobalMouseUp)
  if (hideControlsTimeout) {
    clearTimeout(hideControlsTimeout)
  }
})
</script>

<template>
  <div 
    ref="containerRef"
    class="fixed inset-0 bg-black flex items-center justify-center"
  >
    <!-- Loading -->
    <div v-if="loading" class="text-white">
      <div class="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full"></div>
    </div>

    <!-- Video -->
    <video
      v-if="clip"
      ref="videoRef"
      :src="clip.video.videoUrl"
      @loadedmetadata="onVideoLoaded"
      @timeupdate="onTimeUpdate"
      class="max-h-full max-w-full"
      :class="isPortrait ? 'h-full w-auto' : 'w-full h-auto'"
      playsinline
      :muted="isMuted"
      autoplay
      preload="auto"
    />

    <!-- Tap overlay -->
    <div 
      v-if="clip"
      class="absolute inset-0 z-10"
      :class="controlsVisible ? 'top-16 bottom-24' : 'top-0 bottom-0'"
      @click.stop="toggleControls"
      @touchend.stop.prevent="toggleControls"
    />

    <!-- Controls overlay -->
    <transition name="fade">
      <div 
        v-if="clip && controlsVisible"
        class="absolute inset-0 pointer-events-none z-20"
      >
        <!-- Top bar -->
        <div class="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
          <div class="flex items-center gap-4">
            <button @click="goBack" class="text-white p-2 -m-2">
              <Icon name="arrow-left" :size="24" />
            </button>
            <div class="flex-1">
              <h1 class="text-white font-semibold truncate">{{ clip.title }}</h1>
              <div class="flex items-center gap-2 text-white/70 text-sm">
                <span v-for="ct in clip.tags" :key="ct.tag.id" class="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {{ ct.tag.name }}
                </span>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex gap-1">
              <button @click="openEditModal" class="text-white p-2 hover:bg-white/20 rounded" title="Bewerken">
                <Icon name="edit" :size="20" />
              </button>
              <button @click="openCopyModal" class="text-white p-2 hover:bg-white/20 rounded" title="Kopiëren">
                <Icon name="copy" :size="20" />
              </button>
              <button @click="openMoveModal" class="text-white p-2 hover:bg-white/20 rounded" title="Verplaatsen">
                <Icon name="folder" :size="20" />
              </button>
              <button @click="openShareModal" class="text-white p-2 hover:bg-white/20 rounded" title="Delen">
                <Icon name="share" :size="20" />
              </button>
              <button @click="openDeleteModal" class="text-white p-2 hover:bg-white/20 rounded" title="Verwijderen">
                <Icon name="trash" :size="20" />
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom bar -->
        <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
          <!-- Progress bar -->
          <div 
            ref="progressBarRef"
            @mousedown.stop="startScrub"
            @touchstart.stop.prevent="startScrub"
            @touchmove.prevent="scrub"
            @touchend="endScrub"
            class="py-3 -my-3 cursor-pointer select-none"
          >
            <div class="h-1 bg-white/30 rounded-full relative">
              <div class="h-full bg-brand-500 rounded-full" :style="{ width: `${progress}%` }" />
              <div 
                class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-transform"
                :class="isScrubbing ? 'scale-125' : ''"
                :style="{ left: `calc(${progress}% - 8px)` }"
              />
            </div>
          </div>

          <!-- Controls row -->
          <div class="flex items-center justify-between text-white mt-3">
            <div class="flex items-center gap-3">
              <button @click.stop="togglePlay" class="p-1">
                <Icon :name="playing ? 'pause' : 'play'" :size="32" />
              </button>
              <div class="text-sm">
                {{ formatTime(clipCurrentTime) }} / {{ formatTime(clipDuration) }}
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1">
                <button 
                  v-for="rate in [0.25, 0.5, 1, 1.5, 2]"
                  :key="rate"
                  @click.stop="setPlaybackRate(rate)"
                  class="px-2 py-1 rounded text-xs transition-colors"
                  :class="playbackRate === rate ? 'bg-brand-500' : 'bg-white/20 hover:bg-white/30'"
                >
                  {{ rate }}x
                </button>
              </div>
              
              <button @click.stop="toggleMute" class="p-2 ml-2">
                <Icon :name="isMuted ? 'volume-off' : 'volume-on'" :size="24" />
              </button>
              
              <button v-if="!isIOSMobile" @click.stop="toggleFullscreen" class="p-2">
                <Icon :name="isFullscreen ? 'shrink' : 'expand'" :size="24" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Copy Modal -->
    <Teleport to="body">
      <div v-if="showCopyModal" class="fixed inset-0 bg-black/70 z-50 overflow-auto" @click.self="showCopyModal = false">
        <div class="modal-card p-4 sm:p-6 space-y-4 mt-16 mx-4 sm:mx-auto sm:max-w-md">
          <h2 class="text-xl font-semibold text-white">Clip kopiëren</h2>
          
          <div v-if="copySuccess" class="text-center py-4">
            <Icon name="check" :size="48" class="mx-auto mb-2 text-green-400" />
            <p class="text-green-400">Gekopieerd!</p>
          </div>
          
          <template v-else>
            <p class="text-[var(--color-text-muted)]">Kies een collectie om de clip naar te kopiëren:</p>
            
            <select 
              v-model="selectedCollectionId" 
              class="input w-full"
            >
              <option :value="null" disabled>Selecteer collectie...</option>
              <option 
                v-for="col in collections.filter(c => c.id !== clip?.collection.id)" 
                :key="col.id" 
                :value="col.id"
              >
                {{ col.name }}
              </option>
            </select>
            
            <div class="flex gap-3">
              <button @click="showCopyModal = false" class="btn btn-secondary flex-1">Annuleren</button>
              <button @click="copyClip" class="btn btn-primary flex-1" :disabled="!selectedCollectionId || isCopying">
                {{ isCopying ? 'Kopiëren...' : 'Kopiëren' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- Move Modal -->
    <Teleport to="body">
      <div v-if="showMoveModal" class="fixed inset-0 bg-black/70 z-50 overflow-auto" @click.self="showMoveModal = false">
        <div class="modal-card p-4 sm:p-6 space-y-4 mt-16 mx-4 sm:mx-auto sm:max-w-md">
          <h2 class="text-xl font-semibold text-white">Clip verplaatsen</h2>
          
          <div v-if="moveSuccess" class="text-center py-4">
            <Icon name="check" :size="48" class="mx-auto mb-2 text-green-400" />
            <p class="text-green-400">Verplaatst!</p>
          </div>
          
          <template v-else>
            <p class="text-[var(--color-text-muted)]">Kies een collectie om de clip naar te verplaatsen:</p>
            
            <select 
              v-model="selectedCollectionId" 
              class="input w-full"
            >
              <option :value="null" disabled>Selecteer collectie...</option>
              <option 
                v-for="col in collections.filter(c => c.id !== clip?.collection.id)" 
                :key="col.id" 
                :value="col.id"
              >
                {{ col.name }}
              </option>
            </select>
            
            <div class="flex gap-3">
              <button @click="showMoveModal = false" class="btn btn-secondary flex-1">Annuleren</button>
              <button @click="moveClip" class="btn btn-primary flex-1" :disabled="!selectedCollectionId || isMoving">
                {{ isMoving ? 'Verplaatsen...' : 'Verplaatsen' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- Share Modal -->
    <Teleport to="body">
      <div v-if="showShareModal" class="fixed inset-0 bg-black/70 z-50 overflow-auto" @click.self="showShareModal = false">
        <div class="modal-card p-4 sm:p-6 space-y-4 mt-16 mx-4 sm:mx-auto sm:max-w-md">
          <h2 class="text-xl font-semibold text-white">Clip delen</h2>
          
          <div v-if="shareSuccess" class="text-center py-4">
            <Icon name="check" :size="48" class="mx-auto mb-2 text-green-400" />
            <p class="text-green-400">Gedeeld met {{ shareEmail }}!</p>
          </div>
          
          <template v-else>
            <p class="text-[var(--color-text-muted)]">Deel deze clip met een andere gebruiker. De clip wordt toegevoegd aan hun Inbox.</p>
            
            <input
              v-model="shareEmail"
              type="email"
              placeholder="E-mail van ontvanger"
              class="input w-full"
            />
            
            <p v-if="shareError" class="text-red-400 text-sm">{{ shareError }}</p>
            
            <div class="flex gap-3">
              <button @click="showShareModal = false" class="btn btn-secondary flex-1">Annuleren</button>
              <button @click="shareClip" class="btn btn-primary flex-1" :disabled="!shareEmail || isSharing">
                {{ isSharing ? 'Delen...' : 'Delen' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 bg-black/70 z-50 overflow-auto" @click.self="showEditModal = false">
        <div class="modal-card p-4 sm:p-6 space-y-4 mt-16 mx-4 sm:mx-auto sm:max-w-md">
          <h2 class="text-xl font-semibold text-white">Clip bewerken</h2>
          
          <div>
            <label class="block text-sm text-[var(--color-text-muted)] mb-1">Titel</label>
            <input v-model="editTitle" class="input w-full" placeholder="Clip titel" />
          </div>
          
          <div>
            <label class="block text-sm text-[var(--color-text-muted)] mb-1">Tags</label>
            <div class="flex gap-2 mb-2">
              <input
                v-model="editTagInput"
                @keydown.enter.prevent="addEditTag"
                class="input flex-1"
                placeholder="Voeg tag toe..."
              />
              <button @click="addEditTag" class="btn btn-secondary px-3">+</button>
            </div>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="tag in editTags" 
                :key="tag" 
                class="bg-brand-500/20 text-brand-400 px-2 py-1 rounded-full text-sm flex items-center gap-1"
              >
                {{ tag }}
                <button @click="removeEditTag(tag)" class="hover:text-white">&times;</button>
              </span>
            </div>
          </div>
          
          <div class="flex gap-3 pt-2">
            <button @click="showEditModal = false" class="btn btn-secondary flex-1">Annuleren</button>
            <button @click="saveEdit" class="btn btn-primary flex-1" :disabled="!editTitle.trim() || isEditing">
              {{ isEditing ? 'Opslaan...' : 'Opslaan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 bg-black/70 z-50 overflow-auto" @click.self="showDeleteModal = false">
        <div class="modal-card p-4 sm:p-6 space-y-4 mt-16 mx-4 sm:mx-auto sm:max-w-md">
          <h2 class="text-xl font-semibold text-white">Clip verwijderen</h2>
          
          <p class="text-[var(--color-text-muted)]">
            Weet je zeker dat je <strong class="text-white">{{ clip?.title }}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
          </p>
          
          <div class="flex gap-3 pt-2">
            <button @click="showDeleteModal = false" class="btn btn-secondary flex-1">Annuleren</button>
            <button @click="deleteClip" class="btn bg-red-600 hover:bg-red-700 text-white flex-1" :disabled="isDeleting">
              {{ isDeleting ? 'Verwijderen...' : 'Verwijderen' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
