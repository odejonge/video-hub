<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { publicFetch } from '@/lib/api'
import Icon from '@/components/Icons.vue'
import Hls from 'hls.js'

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
    videoUrl: string
    thumbnailUrl: string | null
  }
  tags: { tag: { id: string; name: string } }[]
}

interface SharedCollection {
  id: string
  name: string
  clips: Clip[]
  tags: Tag[]
}

const route = useRoute()
const router = useRouter()

const clip = ref<Clip | null>(null)
const allClips = ref<Clip[]>([])
const collectionName = ref('')
const currentClipIndex = ref(-1)
const loading = ref(true)

const videoRef = ref<HTMLVideoElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)
const controlsVisible = ref(true)
const isPortrait = ref(false)
const isFullscreen = ref(false)
const isIOSMobile = ref(false)
const isMuted = ref(sessionStorage.getItem('clipViewerMuted') !== 'false')
let hlsInstance: Hls | null = null
let hideControlsTimeout: ReturnType<typeof setTimeout> | null = null

const hasNavigation = computed(() => allClips.value.length > 1)
const canGoPrevious = computed(() => currentClipIndex.value > 0)
const canGoNext = computed(() => currentClipIndex.value < allClips.value.length - 1)

const progress = computed(() => {
  if (!clip.value) return 0
  const start = clip.value.startTime
  const end = clip.value.endTime ?? duration.value
  const clipDur = end - start
  if (clipDur <= 0) return 0
  return ((currentTime.value - start) / clipDur) * 100
})

const clipDuration = computed(() => {
  if (!clip.value) return 0
  return (clip.value.endTime ?? duration.value) - clip.value.startTime
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

async function loadData() {
  loading.value = true
  try {
    const data = await publicFetch<SharedCollection>(
      `/api/collections/shared/${route.params.shareToken}`
    )
    collectionName.value = data.name
    allClips.value = data.clips
    setActiveClip(route.params.clipId as string)
  } catch {
    router.push(`/shared/${route.params.shareToken}`)
  } finally {
    loading.value = false
  }
}

function setActiveClip(clipId: string) {
  const idx = allClips.value.findIndex(c => c.id === clipId)
  if (idx === -1) {
    router.push(`/shared/${route.params.shareToken}`)
    return
  }
  currentClipIndex.value = idx
  clip.value = allClips.value[idx]
  setupVideo()
}

function setupVideo() {
  // Wait for DOM update
  setTimeout(() => {
    if (!videoRef.value || !clip.value) return

    if (hlsInstance) {
      hlsInstance.destroy()
      hlsInstance = null
    }

    const url = clip.value.video.videoUrl
    if (url.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        hlsInstance = new Hls()
        hlsInstance.loadSource(url)
        hlsInstance.attachMedia(videoRef.value)
      } else if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.value.src = url
      }
    } else {
      videoRef.value.src = url
    }
  }, 0)
}

function goToPreviousClip() {
  if (!canGoPrevious.value) return
  const prev = allClips.value[currentClipIndex.value - 1]
  router.replace(`/shared/${route.params.shareToken}/clips/${prev.id}`)
}

function goToNextClip() {
  if (!canGoNext.value) return
  const next = allClips.value[currentClipIndex.value + 1]
  router.replace(`/shared/${route.params.shareToken}/clips/${next.id}`)
}

function goBack() {
  router.push(`/shared/${route.params.shareToken}`)
}

function onVideoLoaded() {
  if (!videoRef.value || !clip.value) return
  const video = videoRef.value
  isPortrait.value = video.videoHeight > video.videoWidth
  video.currentTime = clip.value.startTime
  duration.value = video.duration
  video.play().then(() => { playing.value = true }).catch(() => {})
}

function onTimeUpdate() {
  if (!videoRef.value || !clip.value) return
  currentTime.value = videoRef.value.currentTime
  const end = clip.value.endTime ?? duration.value
  if (currentTime.value >= end) {
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
  sessionStorage.setItem('clipViewerMuted', String(isMuted.value))
}

function toggleControls() {
  controlsVisible.value = !controlsVisible.value
  if (controlsVisible.value && playing.value) {
    resetHideControlsTimer()
  } else if (hideControlsTimeout) {
    clearTimeout(hideControlsTimeout)
  }
}

function onMouseMove() {
  if (!controlsVisible.value) controlsVisible.value = true
  if (playing.value) resetHideControlsTimer()
}

// Scrubbing
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
  if (newTime !== null) videoRef.value.currentTime = newTime
  if (playing.value) { videoRef.value.pause(); playing.value = false }
  if (!('touches' in e)) {
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }
}

function handleGlobalMouseMove(e: MouseEvent) {
  if (!isScrubbing.value || !videoRef.value) return
  const newTime = getSeekPosition(e)
  if (newTime !== null) videoRef.value.currentTime = newTime
}

function handleGlobalMouseUp() {
  endScrub()
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('mouseup', handleGlobalMouseUp)
}

function scrub(e: TouchEvent) {
  if (!isScrubbing.value || !videoRef.value) return
  const newTime = getSeekPosition(e)
  if (newTime !== null) videoRef.value.currentTime = newTime
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
  if (hideControlsTimeout) clearTimeout(hideControlsTimeout)
  if (playing.value && controlsVisible.value) {
    hideControlsTimeout = setTimeout(() => { controlsVisible.value = false }, 1500)
  }
}

function canUseFullscreenAPI() {
  return !!(document.fullscreenEnabled || (document as any).webkitFullscreenEnabled)
}

function toggleFullscreen() {
  const container = containerRef.value
  if (!container) return
  if (!canUseFullscreenAPI()) { isFullscreen.value = !isFullscreen.value; return }
  const isCurrently = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
  if (!isCurrently) {
    if (container.requestFullscreen) container.requestFullscreen().catch(() => {})
    else if ((container as any).webkitRequestFullscreen) (container as any).webkitRequestFullscreen()
  } else {
    if (document.exitFullscreen) document.exitFullscreen()
    else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen()
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
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
      videoRef.value.currentTime = Math.min(clip.value.endTime ?? duration.value, currentTime.value + 5)
      controlsVisible.value = true
      resetHideControlsTimer()
      break
    case 'ArrowUp':
      e.preventDefault()
      if (canGoPrevious.value) goToPreviousClip()
      break
    case 'ArrowDown':
      e.preventDefault()
      if (canGoNext.value) goToNextClip()
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
  if (isPlaying) resetHideControlsTimer()
  else if (hideControlsTimeout) clearTimeout(hideControlsTimeout)
})

watch(() => route.params.clipId, (newId) => {
  if (newId && allClips.value.length) setActiveClip(newId as string)
})

onMounted(() => {
  loadData()
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
  if (hideControlsTimeout) clearTimeout(hideControlsTimeout)
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null }
})
</script>

<template>
  <div
    ref="containerRef"
    class="fixed inset-0 bg-black flex items-center justify-center"
    @mousemove="onMouseMove"
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

    <!-- Navigation buttons -->
    <transition name="fade">
      <template v-if="hasNavigation && clip && controlsVisible">
        <button
          v-if="canGoPrevious"
          @click.stop="goToPreviousClip"
          class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all opacity-70 hover:opacity-100"
          title="Vorige clip"
        >
          <Icon name="chevron-left" :size="28" />
        </button>
      </template>
    </transition>

    <transition name="fade">
      <template v-if="hasNavigation && clip && controlsVisible">
        <button
          v-if="canGoNext"
          @click.stop="goToNextClip"
          class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all opacity-70 hover:opacity-100"
          title="Volgende clip"
        >
          <Icon name="chevron-right" :size="28" />
        </button>
      </template>
    </transition>

    <!-- Navigation indicator -->
    <transition name="fade">
      <div
        v-if="hasNavigation && clip && controlsVisible"
        class="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 bg-black/60 px-3 py-1 rounded-full text-white/80 text-sm"
      >
        {{ currentClipIndex + 1 }} / {{ allClips.length }}
      </div>
    </transition>

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
                <span class="text-white/50">{{ collectionName }}</span>
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
