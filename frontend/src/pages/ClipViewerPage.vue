<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'

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
    router.push('/tags')
  } finally {
    loading.value = false
  }
}

function onVideoLoaded() {
  if (!videoRef.value || !clip.value) return
  
  // Check orientation
  const video = videoRef.value
  isPortrait.value = video.videoHeight > video.videoWidth
  
  // Seek to start
  video.currentTime = clip.value.startTime
  duration.value = video.duration
}

function onTimeUpdate() {
  if (!videoRef.value || !clip.value) return
  
  currentTime.value = videoRef.value.currentTime
  
  // Loop at end
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

// Toggle controls visibility on tap
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
  
  // Pause during scrub
  if (playing.value) {
    videoRef.value.pause()
    playing.value = false
  }
  
  // Add global listeners for mouse
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
  
  // Resume playback if it was playing before
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
  
  // Check if Fullscreen API is available
  if (!canUseFullscreenAPI()) {
    // iOS Safari: Fullscreen API not available
    // Page is already visually fullscreen with fixed positioning
    // Just toggle the icon state for visual feedback (no actual effect)
    isFullscreen.value = !isFullscreen.value
    return
  }
  
  // Standard Fullscreen API (works on Android and Desktop)
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
  // State is updated by onFullscreenChange event listener
}

function onFullscreenChange() {
  isFullscreen.value = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
}

function goBack() {
  router.back()
}

function handleKeydown(e: KeyboardEvent) {
  if (!videoRef.value || !clip.value) return
  
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
  
  // Detect iOS mobile (iPhone/iPad touch device)
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
      preload="auto"
    />

    <!-- Tap overlay for toggling controls - covers entire screen except header/footer when visible -->
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
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="flex-1">
              <h1 class="text-white font-semibold truncate">{{ clip.title }}</h1>
              <div class="flex items-center gap-2 text-white/70 text-sm">
                <span v-if="clip.danceMove">{{ clip.danceMove.name }}</span>
                <span v-for="ct in clip.tags" :key="ct.tag.id" class="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {{ ct.tag.name }}
                </span>
              </div>
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
              <div 
                class="h-full bg-brand-500 rounded-full"
                :style="{ width: `${progress}%` }"
              />
              <div 
                class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-transform"
                :class="isScrubbing ? 'scale-125' : ''"
                :style="{ left: `calc(${progress}% - 8px)` }"
              />
            </div>
          </div>

          <!-- Controls row -->
          <div class="flex items-center justify-between text-white mt-3">
            <!-- Left: Play/Pause + Time -->
            <div class="flex items-center gap-3">
              <button @click.stop="togglePlay" class="p-1">
                <svg v-if="!playing" class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <svg v-else class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              </button>
              <div class="text-sm">
                {{ formatTime(clipCurrentTime) }} / {{ formatTime(clipDuration) }}
              </div>
            </div>

            <!-- Right: Speed + Fullscreen -->
            <div class="flex items-center gap-2">
              <!-- Playback speed -->
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
              
              <!-- Fullscreen - hide on iOS mobile where it doesn't work -->
              <button v-if="!isIOSMobile" @click.stop="toggleFullscreen" class="p-2 ml-2">
                <!-- Expand icon (enter fullscreen) - arrows pointing outward -->
                <svg v-if="!isFullscreen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                </svg>
                <!-- Shrink icon (exit fullscreen) - corners pointing inward -->
                <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4v4H4m16 0h-4V4M8 20v-4H4m16 0h-4v4"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
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
