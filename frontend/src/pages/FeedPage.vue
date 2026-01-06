<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
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

const router = useRouter()

const clips = ref<Clip[]>([])
const loading = ref(true)
const currentIndex = ref(0)
const containerRef = ref<HTMLElement | null>(null)
const videoRefs = ref<(HTMLVideoElement | null)[]>([])

// Buffering state per video
const isBuffering = ref<Record<number, boolean>>({})
const videoReady = ref<Record<number, boolean>>({})
const isActuallyPlaying = ref<Record<number, boolean>>({})
const isMuted = ref(true) // Start muted for autoplay

// Touch/swipe state
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const isDragging = ref(false)
const translateY = ref(0)

// Controls visibility
const showControls = ref(true)
let hideControlsTimeout: ReturnType<typeof setTimeout> | null = null

// Playback controls
const playbackRate = ref(1)
const currentTime = ref(0)
const clipDuration = ref(0)
const isScrubbing = ref(false)
const wasPlayingBeforeScrub = ref(false)
const userPaused = ref(false)

const currentClip = computed(() => clips.value[currentIndex.value])

// Progress computed based on clip start/end times
const progress = computed(() => {
  const clip = currentClip.value
  if (!clip || clipDuration.value === 0) return 0
  const clipProgress = currentTime.value - clip.startTime
  const duration = clip.endTime - clip.startTime
  return Math.max(0, Math.min(100, (clipProgress / duration) * 100))
})

const clipCurrentTimeDisplay = computed(() => {
  const clip = currentClip.value
  if (!clip) return 0
  return Math.max(0, currentTime.value - clip.startTime)
})

const clipDurationDisplay = computed(() => {
  const clip = currentClip.value
  if (!clip) return 0
  return clip.endTime - clip.startTime
})

// Only load videos near current index to save bandwidth
function shouldLoadVideo(index: number): boolean {
  const current = currentIndex.value
  return index >= current - 1 && index <= current + 1
}

async function loadClips() {
  loading.value = true
  try {
    const { data } = await api.get<Clip[]>('/api/clips')
    clips.value = shuffleArray(data)
  } catch (e) {
    console.error('Failed to load clips:', e)
  } finally {
    loading.value = false
    if (clips.value.length > 0) {
      nextTick(() => playCurrentClip())
    }
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function goToClip(index: number) {
  const oldIndex = currentIndex.value
  
  // Wrap around for infinite loop
  if (index < 0) {
    currentIndex.value = clips.value.length - 1
  } else if (index >= clips.value.length) {
    currentIndex.value = 0
  } else {
    currentIndex.value = index
  }
  
  // Stop the old video
  const oldVideo = videoRefs.value[oldIndex]
  if (oldVideo) {
    oldVideo.pause()
  }
  
  // Reset user paused state for new clip
  userPaused.value = false
  
  translateY.value = 0
  nextTick(() => playCurrentClip())
}

async function playCurrentClip() {
  const index = currentIndex.value
  
  // Pause all other videos
  videoRefs.value.forEach((video, i) => {
    if (video && i !== index) {
      video.pause()
      isActuallyPlaying.value[i] = false
    }
  })
  
  const currentVideo = videoRefs.value[index]
  const clip = clips.value[index]
  
  if (!currentVideo || !clip) {
    setTimeout(() => {
      if (currentIndex.value === index) playCurrentClip()
    }, 100)
    return
  }
  
  // Show buffering indicator
  isBuffering.value[index] = true
  isActuallyPlaying.value[index] = false
  
  // Set the start time and playback rate
  currentVideo.currentTime = clip.startTime
  currentVideo.playbackRate = playbackRate.value
  currentTime.value = clip.startTime
  
  // Try to play
  currentVideo.play().catch(() => {
    setTimeout(() => {
      if (currentIndex.value === index && currentVideo.paused) {
        currentVideo.play().catch(() => {})
      }
    }, 500)
  })
  
  resetHideControlsTimer()
}

function onTimeUpdate(video: HTMLVideoElement, clip: Clip, index: number) {
  if (index !== currentIndex.value) return
  
  // Update current time for progress bar (only if not scrubbing)
  if (!isScrubbing.value) {
    currentTime.value = video.currentTime
  }
  clipDuration.value = video.duration
  
  // timeupdate means frames are actually playing - hide spinner
  if (isBuffering.value[index]) {
    isBuffering.value[index] = false
    isActuallyPlaying.value[index] = true
  }
  
  if (video.currentTime >= clip.endTime) {
    video.currentTime = clip.startTime
  }
}

function onVideoWaiting(index: number) {
  if (index === currentIndex.value) {
    isBuffering.value[index] = true
    isActuallyPlaying.value[index] = false
  }
}

function onVideoPlaying(index: number) {
  isBuffering.value[index] = false
  isActuallyPlaying.value[index] = true
}

function onVideoCanPlay(index: number) {
  // Don't auto-play while scrubbing or if user explicitly paused
  if (isScrubbing.value || userPaused.value) return
  
  const video = videoRefs.value[index]
  if (index === currentIndex.value && video && video.paused) {
    video.play().catch(() => {})
  }
}

function onVideoLoadedMetadata(index: number) {
  videoReady.value[index] = true
}

function onVideoPause(index: number) {
  isActuallyPlaying.value[index] = false
}

function onVideoStalled(index: number) {
  if (index === currentIndex.value) {
    isBuffering.value[index] = true
    isActuallyPlaying.value[index] = false
  }
}

// Touch handlers
function onTouchStart(e: TouchEvent) {
  touchStartY.value = e.touches[0].clientY
  touchCurrentY.value = e.touches[0].clientY
  isDragging.value = true
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value) return
  touchCurrentY.value = e.touches[0].clientY
  const diff = touchCurrentY.value - touchStartY.value
  // Limit drag distance
  translateY.value = Math.max(-150, Math.min(150, diff))
}

function onTouchEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  
  const threshold = 80
  const diff = touchCurrentY.value - touchStartY.value
  
  if (diff < -threshold) {
    // Swipe up - next clip
    goToClip(currentIndex.value + 1)
  } else if (diff > threshold) {
    // Swipe down - previous clip
    goToClip(currentIndex.value - 1)
  } else {
    // Snap back
    translateY.value = 0
  }
}

// Mouse wheel for desktop
function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY > 50) {
    goToClip(currentIndex.value + 1)
  } else if (e.deltaY < -50) {
    goToClip(currentIndex.value - 1)
  }
}

// Keyboard navigation
function onKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
    case ' ':
      e.preventDefault()
      goToClip(currentIndex.value + 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      goToClip(currentIndex.value - 1)
      break
    case 'Escape':
      router.push('/dashboard')
      break
  }
}

function togglePlayPause() {
  const index = currentIndex.value
  const video = videoRefs.value[index]
  const clip = clips.value[index]
  if (!video || !clip) return
  
  if (video.paused) {
    userPaused.value = false
    isBuffering.value[index] = true
    video.play().catch(() => {})
    resetHideControlsTimer()
  } else {
    userPaused.value = true
    video.pause()
    showControls.value = true
    if (hideControlsTimeout) clearTimeout(hideControlsTimeout)
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  // Update all video elements
  videoRefs.value.forEach((video) => {
    if (video) {
      video.muted = isMuted.value
    }
  })
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function setPlaybackRate(rate: number) {
  playbackRate.value = rate
  const video = videoRefs.value[currentIndex.value]
  if (video) {
    video.playbackRate = rate
  }
}

let scrubBarRect: DOMRect | null = null

function startScrub(e: MouseEvent | TouchEvent) {
  const target = e.currentTarget as HTMLElement
  if (target) {
    scrubBarRect = target.getBoundingClientRect()
  }
  
  const video = videoRefs.value[currentIndex.value]
  if (video) {
    wasPlayingBeforeScrub.value = !video.paused
    if (!video.paused) {
      video.pause()
    }
  }
  
  isScrubbing.value = true
  scrub(e)
  
  // Add global listeners
  document.addEventListener('mousemove', scrub)
  document.addEventListener('mouseup', endScrub)
}

function scrub(e: MouseEvent | TouchEvent) {
  if (!scrubBarRect || !currentClip.value) return
  
  const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX
  const percent = Math.max(0, Math.min(1, (clientX - scrubBarRect.left) / scrubBarRect.width))
  
  const clip = currentClip.value
  const clipLength = clip.endTime - clip.startTime
  const newTime = clip.startTime + (percent * clipLength)
  
  const video = videoRefs.value[currentIndex.value]
  if (video) {
    video.currentTime = newTime
    currentTime.value = newTime
  }
}

function endScrub() {
  isScrubbing.value = false
  scrubBarRect = null
  document.removeEventListener('mousemove', scrub)
  document.removeEventListener('mouseup', endScrub)
  
  // Only resume if video was playing before scrub
  if (wasPlayingBeforeScrub.value) {
    const video = videoRefs.value[currentIndex.value]
    if (video) {
      video.play().catch(() => {})
    }
  }
  
  resetHideControlsTimer()
}

function toggleControls() {
  showControls.value = !showControls.value
  if (showControls.value) {
    resetHideControlsTimer()
  }
}

function resetHideControlsTimer() {
  if (hideControlsTimeout) clearTimeout(hideControlsTimeout)
  showControls.value = true
  hideControlsTimeout = setTimeout(() => {
    const video = videoRefs.value[currentIndex.value]
    if (video && !video.paused) {
      showControls.value = false
    }
  }, 2000)
}

function goToClipDetail(clip: Clip) {
  router.push(`/clips/${clip.id}`)
}

function setVideoRef(el: any, index: number) {
  videoRefs.value[index] = el
}

onMounted(() => {
  loadClips()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (hideControlsTimeout) clearTimeout(hideControlsTimeout)
})
</script>

<template>
  <div 
    ref="containerRef"
    class="fixed inset-0 bg-black overflow-hidden"
    @wheel.prevent="onWheel"
    @touchstart="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- Loading -->
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <div class="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="clips.length === 0" class="absolute inset-0 flex items-center justify-center text-center p-8">
      <div>
        <Icon name="video" :size="64" class="mx-auto mb-4 text-gray-500" />
        <h2 class="text-xl font-semibold mb-2">Geen clips gevonden</h2>
        <p class="text-gray-400 mb-6">Upload video's en maak clips om ze hier te bekijken.</p>
        <button @click="router.push('/videos')" class="btn btn-primary">
          Naar video's
        </button>
      </div>
    </div>

    <!-- Clips container -->
    <div 
      v-else
      class="h-full w-full transition-transform duration-300 ease-out"
      :style="{ transform: `translateY(${translateY}px)` }"
      :class="{ 'transition-none': isDragging }"
    >
      <!-- Current clip -->
      <div 
        v-for="(clip, index) in clips"
        :key="clip.id"
        class="absolute inset-0 flex items-center justify-center"
        :class="{ 'pointer-events-none': index !== currentIndex }"
        :style="{ 
          opacity: index === currentIndex ? 1 : 0,
          zIndex: index === currentIndex ? 1 : 0 
        }"
      >
        <video
          :ref="(el) => setVideoRef(el, index)"
          :src="shouldLoadVideo(index) ? clip.video.videoUrl : undefined"
          class="max-h-full max-w-full object-contain"
          playsinline
          :muted="isMuted"
          :preload="index === currentIndex || index === currentIndex + 1 ? 'auto' : 'none'"
          @timeupdate="onTimeUpdate($event.target as HTMLVideoElement, clip, index)"
          @waiting="onVideoWaiting(index)"
          @playing="onVideoPlaying(index)"
          @canplay="onVideoCanPlay(index)"
          @loadedmetadata="onVideoLoadedMetadata(index)"
          @pause="onVideoPause(index)"
          @stalled="onVideoStalled(index)"
          @click="toggleControls"
        />

        <!-- Buffering/Loading indicator -->
        <transition name="fade">
          <div 
            v-if="isBuffering[index] && index === currentIndex"
            class="absolute inset-0 z-30"
          >
            <!-- Back button during loading -->
            <div class="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
              <button @click.stop="router.push('/dashboard')" class="p-2 -m-2">
                <Icon name="arrow-left" :size="24" />
              </button>
            </div>
            <!-- Spinner centered -->
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <div class="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                  <div class="animate-spin w-10 h-10 border-4 border-white/30 border-t-white rounded-full"></div>
                </div>
                <p class="text-sm text-white/70">Laden...</p>
              </div>
            </div>
          </div>
        </transition>

        <!-- Tap overlay for play/pause -->
        <div 
          class="absolute inset-0 z-10"
          :class="showControls ? 'pointer-events-none' : ''"
          @click="toggleControls"
        />

        <!-- Controls overlay -->
        <transition name="fade">
          <div 
            v-if="showControls && index === currentIndex"
            class="absolute inset-0 pointer-events-none z-20"
          >
            <!-- Top bar with back button and clip info -->
            <div class="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
              <div class="flex items-center gap-4">
                <button @click="router.push('/dashboard')" class="text-white p-2 -m-2">
                  <Icon name="arrow-left" :size="24" />
                </button>
                <div class="flex-1 min-w-0">
                  <h1 class="text-white font-semibold truncate">{{ clip.title }}</h1>
                  <div class="flex items-center gap-2 text-white/70 text-sm">
                    <span class="truncate">{{ clip.collection.name }}</span>
                    <span v-for="ct in clip.tags.slice(0, 3)" :key="ct.tag.id" class="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {{ ct.tag.name }}
                    </span>
                  </div>
                </div>
              </div>
            </div>


            <!-- Bottom controls -->
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
              <!-- Progress bar -->
              <div 
                @mousedown.stop="startScrub"
                @touchstart.stop.prevent="startScrub"
                @touchmove.stop.prevent="scrub"
                @touchend.stop.prevent="endScrub"
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
                  <button @click.stop="togglePlayPause" class="p-1">
                    <Icon :name="videoRefs[index]?.paused ? 'play' : 'pause'" :size="32" />
                  </button>
                  <div class="text-sm">
                    {{ formatTime(clipCurrentTimeDisplay) }} / {{ formatTime(clipDurationDisplay) }}
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
                  
                  <button @click.stop="goToClipDetail(clip)" class="p-2">
                    <Icon name="expand" :size="24" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Progress indicator -->
            <div class="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center">
              <div 
                v-for="(_, i) in clips.slice(0, Math.min(clips.length, 5))"
                :key="i"
                class="w-1 rounded-full transition-all"
                :class="[
                  i === currentIndex % 5 ? 'h-6 bg-white' : 'h-2 bg-white/40'
                ]"
              />
              <span v-if="clips.length > 5" class="text-xs text-white/60 mt-1">
                {{ currentIndex + 1 }}/{{ clips.length }}
              </span>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Swipe hint (first time) -->
    <div 
      v-if="!loading && clips.length > 1 && currentIndex === 0"
      class="absolute bottom-32 left-1/2 -translate-x-1/2 text-center animate-bounce pointer-events-none"
    >
      <Icon name="chevron-right" :size="24" class="-rotate-90 text-white/60" />
      <p class="text-xs text-white/60 mt-1">Swipe omhoog</p>
    </div>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

