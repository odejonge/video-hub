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

// Touch/swipe state
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const isDragging = ref(false)
const translateY = ref(0)

// Controls visibility
const showControls = ref(true)
let hideControlsTimeout: ReturnType<typeof setTimeout> | null = null

const currentClip = computed(() => clips.value[currentIndex.value])
const isCurrentBuffering = computed(() => isBuffering.value[currentIndex.value] ?? false)

async function loadClips() {
  console.log('[Feed] loadClips() called')
  loading.value = true
  try {
    const { data } = await api.get<Clip[]>('/api/clips')
    console.log('[Feed] Loaded', data.length, 'clips')
    // Shuffle clips randomly
    clips.value = shuffleArray(data)
  } catch (e) {
    console.error('[Feed] Failed to load clips:', e)
  } finally {
    loading.value = false
    console.log('[Feed] loading set to false, clips.length =', clips.value.length)
    
    // Auto-play first clip after loading
    if (clips.value.length > 0) {
      console.log('[Feed] Scheduling playCurrentClip() via nextTick')
      nextTick(() => {
        console.log('[Feed] nextTick fired, calling playCurrentClip()')
        playCurrentClip()
      })
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
  // Wrap around for infinite loop
  if (index < 0) {
    currentIndex.value = clips.value.length - 1
  } else if (index >= clips.value.length) {
    currentIndex.value = 0
  } else {
    currentIndex.value = index
  }
  
  translateY.value = 0
  
  nextTick(() => {
    playCurrentClip()
  })
}

async function playCurrentClip() {
  const index = currentIndex.value
  console.log('[Feed] playCurrentClip() called, index =', index)
  
  // Pause all other videos
  videoRefs.value.forEach((video, i) => {
    if (video && i !== index) {
      video.pause()
      isActuallyPlaying.value[i] = false
    }
  })
  
  const currentVideo = videoRefs.value[index]
  const clip = clips.value[index]
  
  console.log('[Feed] currentVideo =', currentVideo ? 'exists' : 'null')
  console.log('[Feed] clip =', clip ? clip.title : 'null')
  
  if (!currentVideo || !clip) {
    console.log('[Feed] Video element not ready, retrying in 100ms')
    // Video element not ready yet, retry after a short delay
    setTimeout(() => {
      if (currentIndex.value === index) {
        playCurrentClip()
      }
    }, 100)
    return
  }
  
  console.log('[Feed] Video readyState =', currentVideo.readyState)
  console.log('[Feed] Video paused =', currentVideo.paused)
  console.log('[Feed] Setting currentTime to', clip.startTime)
  
  // Show buffering indicator
  isBuffering.value[index] = true
  isActuallyPlaying.value[index] = false
  
  // Set the start time
  currentVideo.currentTime = clip.startTime
  
  // Immediately try to play - the 'playing' event will clear buffering
  console.log('[Feed] Calling video.play()')
  currentVideo.play()
    .then(() => {
      console.log('[Feed] play() promise resolved successfully')
    })
    .catch((e) => {
      console.log('[Feed] play() failed:', e.name, e.message)
      // Retry play after a short delay
      setTimeout(() => {
        if (currentIndex.value === index && currentVideo.paused) {
          console.log('[Feed] Retrying play()')
          currentVideo.play().catch((e2) => {
            console.log('[Feed] Retry play() also failed:', e2.name, e2.message)
          })
        }
      }, 500)
    })
  
  resetHideControlsTimer()
}

function onTimeUpdate(video: HTMLVideoElement, clip: Clip, index: number) {
  // Only handle for current clip
  if (index !== currentIndex.value) return
  
  if (video.currentTime >= clip.endTime) {
    video.currentTime = clip.startTime
  }
}

function onVideoWaiting(index: number) {
  console.log('[Feed] onVideoWaiting, index =', index)
  if (index === currentIndex.value) {
    isBuffering.value[index] = true
  }
}

function onVideoPlaying(index: number) {
  console.log('[Feed] onVideoPlaying, index =', index, '- VIDEO IS NOW PLAYING!')
  // Only clear buffering when video is actually playing
  isBuffering.value[index] = false
  isActuallyPlaying.value[index] = true
}

function onVideoCanPlay(index: number) {
  console.log('[Feed] onVideoCanPlay, index =', index)
  // If this is the current clip and it's paused, try to play it
  const video = videoRefs.value[index]
  if (index === currentIndex.value && video && video.paused) {
    console.log('[Feed] Video is paused at canplay, trying to play')
    video.play().catch((e) => {
      console.log('[Feed] play() in canplay failed:', e.name, e.message)
    })
  }
}

function onVideoLoadedMetadata(index: number) {
  console.log('[Feed] onVideoLoadedMetadata, index =', index)
  videoReady.value[index] = true
}

function onVideoPause(index: number) {
  console.log('[Feed] onVideoPause, index =', index)
  isActuallyPlaying.value[index] = false
}

function onVideoStalled(index: number) {
  console.log('[Feed] onVideoStalled, index =', index)
  if (index === currentIndex.value) {
    isBuffering.value[index] = true
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
      router.back()
      break
  }
}

function togglePlayPause() {
  const index = currentIndex.value
  const video = videoRefs.value[index]
  const clip = clips.value[index]
  if (!video || !clip) return
  
  if (video.paused) {
    isBuffering.value[index] = true
    video.play().catch(() => {})
    resetHideControlsTimer()
  } else {
    video.pause()
    showControls.value = true
    if (hideControlsTimeout) clearTimeout(hideControlsTimeout)
  }
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
          :src="clip.video.videoUrl"
          class="max-h-full max-w-full object-contain"
          playsinline
          muted
          autoplay
          preload="auto"
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
            class="absolute inset-0 flex items-center justify-center z-30"
            @click="togglePlayPause"
          >
            <div class="text-center">
              <div class="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                <div class="animate-spin w-10 h-10 border-4 border-white/30 border-t-white rounded-full"></div>
              </div>
              <p class="text-sm text-white/70">Laden...</p>
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
            <!-- Top gradient & back button -->
            <div class="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
              <button @click="router.back()" class="p-2 -m-2">
                <Icon name="arrow-left" :size="24" />
              </button>
            </div>

            <!-- Center play button (only show when paused and not buffering) -->
            <div 
              class="absolute inset-0 flex items-center justify-center pointer-events-auto"
              @click.stop="togglePlayPause"
            >
              <div 
                v-if="videoRefs[index]?.paused && !isBuffering[index]"
                class="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <Icon name="play" :size="40" />
              </div>
            </div>

            <!-- Bottom info -->
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
              <div class="max-w-lg">
                <h2 class="font-semibold text-lg mb-1">{{ clip.title }}</h2>
                <p class="text-sm text-white/70 mb-2">{{ clip.collection.name }}</p>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="ct in clip.tags" 
                    :key="ct.tag.id"
                    class="text-xs bg-white/20 px-2 py-1 rounded-full"
                  >
                    #{{ ct.tag.name }}
                  </span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="absolute right-4 bottom-20 flex flex-col gap-4 items-center">
                <button 
                  @click.stop="goToClipDetail(clip)"
                  class="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Icon name="expand" :size="24" />
                </button>
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
      <Icon name="chevron-right" :size="24" class="rotate-90 text-white/60" />
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

