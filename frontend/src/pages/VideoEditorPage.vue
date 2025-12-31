<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import AppLayout from '@/components/AppLayout.vue'

interface Tag {
  tag: { id: string; name: string }
}

interface Clip {
  id: string
  title: string
  startTime: number
  endTime: number | null
  tags?: Tag[]
}

interface Video {
  id: string
  title: string
  videoUrl: string
  thumbnailUrl: string | null
  duration: number | null
  collectionId: string
  clips: Clip[]
}

const route = useRoute()
const router = useRouter()

const video = ref<Video | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)

// Player state
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)
const playbackRates = [0.25, 0.5, 0.75, 1, 1.5, 2]

// New clip form
const isCreatingClip = ref(false)
const newClipTitle = ref('')
const newClipStart = ref<number | null>(null)
const newClipEnd = ref<number | null>(null)
const newClipTagInput = ref('')
const newClipTags = ref<string[]>([])
const isSaving = ref(false)

// Tags autocomplete
const allTags = ref<{ id: string; name: string }[]>([])
const showTagDropdown = ref(false)
const filteredTags = computed(() => {
  const search = newClipTagInput.value.toLowerCase()
  return allTags.value
    .filter(t => 
      t.name.includes(search) && 
      !newClipTags.value.includes(t.name)
    )
    .slice(0, 10)
})

// Selected clip for preview
const previewClip = ref<Clip | null>(null)

// Mobile tab
const activeTab = ref<'video' | 'clips'>('video')

async function loadVideo() {
  try {
    const res = await api.get<Video>(`/api/videos/${route.params.id}`)
    video.value = res.data
  } catch {
    router.push('/dashboard')
  }
}

async function loadAllTags() {
  try {
    const res = await api.get<{ id: string; name: string }[]>('/api/tags')
    allTags.value = res.data
  } catch {}
}

function selectTagFromDropdown(tagName: string) {
  if (!newClipTags.value.includes(tagName)) {
    newClipTags.value = [...newClipTags.value, tagName]
  }
  newClipTagInput.value = ''
  showTagDropdown.value = false
}


// Player controls
function togglePlay() {
  if (!videoRef.value) return
  if (isPlaying.value) {
    videoRef.value.pause()
  } else {
    videoRef.value.play()
  }
}

function setPlaybackRate(rate: number) {
  if (!videoRef.value) return
  playbackRate.value = rate
  videoRef.value.playbackRate = rate
}

function handleTimeUpdate() {
  if (!videoRef.value) return
  currentTime.value = videoRef.value.currentTime

  // Stop at clip end when previewing
  if (previewClip.value?.endTime && currentTime.value >= previewClip.value.endTime) {
    videoRef.value.pause()
    isPlaying.value = false
  }
}

function handleLoadedMetadata() {
  if (!videoRef.value) return
  duration.value = videoRef.value.duration
}

function seek(e: Event) {
  if (!videoRef.value) return
  const target = e.target as HTMLInputElement
  videoRef.value.currentTime = parseFloat(target.value)
}

function skipBack() {
  if (!videoRef.value) return
  videoRef.value.currentTime -= 5
}

function skipForward() {
  if (!videoRef.value) return
  videoRef.value.currentTime += 5
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
}

function formatTimeShort(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Clip creation
function startCreatingClip() {
  isCreatingClip.value = true
  newClipTitle.value = ''
  newClipStart.value = null
  newClipEnd.value = null
  newClipTagInput.value = ''
  newClipTags.value = []
  previewClip.value = null
}

function addTag() {
  const tag = newClipTagInput.value.trim().toLowerCase()
  if (tag && !newClipTags.value.includes(tag)) {
    newClipTags.value = [...newClipTags.value, tag]
  }
  newClipTagInput.value = ''
  showTagDropdown.value = false
}

function removeTag(tag: string) {
  newClipTags.value = newClipTags.value.filter(t => t !== tag)
}

function cancelCreatingClip() {
  isCreatingClip.value = false
  previewClip.value = null
}

function setClipStart() {
  newClipStart.value = currentTime.value
}

function setClipEnd() {
  newClipEnd.value = currentTime.value
}

async function saveClip() {
  if (!video.value || !newClipTitle.value.trim() || newClipStart.value === null) return

  isSaving.value = true
  try {
    const { data: clip } = await api.post<Clip>(`/api/videos/${video.value.id}/clips`, {
      title: newClipTitle.value,
      startTime: newClipStart.value,
      endTime: newClipEnd.value,
      tagNames: newClipTags.value,
    })

    video.value.clips.push(clip)
    video.value.clips.sort((a, b) => a.startTime - b.startTime)
    isCreatingClip.value = false
    previewClip.value = null
    activeTab.value = 'clips' // Switch to clips tab on mobile
    loadAllTags() // Refresh tags list for new tags
  } catch (err) {
    console.error('Failed to save clip:', err)
  } finally {
    isSaving.value = false
  }
}

function playClipPreview(clip: Clip) {
  previewClip.value = clip
  activeTab.value = 'video' // Switch to video tab on mobile
  if (videoRef.value) {
    videoRef.value.currentTime = clip.startTime
    videoRef.value.play()
  }
}

function stopPreview() {
  previewClip.value = null
}

async function deleteClip(clipId: string) {
  if (!video.value || !confirm('Weet je zeker dat je deze clip wilt verwijderen?')) return

  try {
    await api.delete(`/api/clips/${clipId}`)
    video.value.clips = video.value.clips.filter(c => c.id !== clipId)
  } catch (err) {
    console.error('Failed to delete clip:', err)
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!videoRef.value) return
  if ((e.target as HTMLElement).tagName === 'INPUT') return

  switch (e.key) {
    case ' ':
      e.preventDefault()
      togglePlay()
      break
    case 'ArrowLeft':
      videoRef.value.currentTime -= 5
      break
    case 'ArrowRight':
      videoRef.value.currentTime += 5
      break
    case 'i':
      if (isCreatingClip.value) setClipStart()
      break
    case 'o':
      if (isCreatingClip.value) setClipEnd()
      break
  }
}

onMounted(() => {
  loadVideo()
  loadAllTags()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <!-- Back link -->
      <RouterLink
        v-if="video"
        :to="`/collections/${video.collectionId}`"
        class="text-[var(--color-text-muted)] hover:text-white mb-3 inline-flex items-center gap-1 text-sm"
      >
        ← Terug
      </RouterLink>

      <div v-if="video">
        <!-- Mobile Tabs -->
        <div class="lg:hidden flex mb-4 bg-[var(--color-surface)] rounded-lg p-1">
          <button
            @click="activeTab = 'video'"
            class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'video' ? 'bg-brand-600 text-white' : 'text-[var(--color-text-muted)]'"
          >
            Video
          </button>
          <button
            @click="activeTab = 'clips'"
            class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'clips' ? 'bg-brand-600 text-white' : 'text-[var(--color-text-muted)]'"
          >
            Clips ({{ video.clips.length }})
          </button>
        </div>

        <div class="grid lg:grid-cols-3 gap-4 lg:gap-6">
          <!-- Video Player Column -->
          <div 
            class="lg:col-span-2 space-y-3 sm:space-y-4"
            :class="{ 'hidden lg:block': activeTab === 'clips' }"
          >
            <h1 class="text-xl sm:text-2xl font-bold truncate">{{ video.title }}</h1>

            <!-- Video -->
            <div class="card overflow-hidden">
              <div class="relative bg-black aspect-video">
                <video
                  ref="videoRef"
                  :src="video.videoUrl"
                  class="w-full h-full"
                  playsinline
                  @timeupdate="handleTimeUpdate"
                  @loadedmetadata="handleLoadedMetadata"
                  @play="isPlaying = true"
                  @pause="isPlaying = false"
                  @click="togglePlay"
                />

                <!-- Current time overlay -->
                <div class="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/70 px-2 py-1 rounded text-xs sm:text-sm font-mono">
                  {{ formatTimeShort(currentTime) }}
                </div>

                <!-- Preview indicator -->
                <div
                  v-if="previewClip"
                  class="absolute top-2 left-2 sm:top-4 sm:left-4 bg-brand-600 px-2 py-1 rounded text-xs sm:text-sm"
                >
                  ▶ {{ previewClip.title }}
                </div>
              </div>

              <!-- Controls -->
              <div class="p-3 sm:p-4 space-y-3 sm:space-y-4">
                <!-- Progress bar - touch friendly -->
                <div class="space-y-2">
                  <div class="relative">
                    <input
                      type="range"
                      :min="0"
                      :max="duration"
                      :value="currentTime"
                      step="0.1"
                      @input="seek"
                      class="w-full h-3 sm:h-2 bg-[var(--color-border)] rounded-full appearance-none cursor-pointer touch-pan-x
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                             [&::-webkit-slider-thumb]:sm:w-4 [&::-webkit-slider-thumb]:sm:h-4
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
                    />

                    <!-- Clip markers on timeline -->
                    <div
                      v-for="clip in video.clips"
                      :key="clip.id"
                      class="absolute top-0 h-3 sm:h-2 bg-brand-400/50 rounded pointer-events-none"
                      :style="{
                        left: `${(clip.startTime / duration) * 100}%`,
                        width: `${((clip.endTime ?? duration) - clip.startTime) / duration * 100}%`
                      }"
                    />
                  </div>
                  <div class="flex justify-between text-xs text-[var(--color-text-muted)] font-mono">
                    <span>{{ formatTimeShort(currentTime) }}</span>
                    <span>{{ formatTimeShort(duration) }}</span>
                  </div>
                </div>

                <!-- Play controls -->
                <div class="flex items-center justify-center gap-2 sm:gap-4">
                  <button
                    @click="skipBack"
                    class="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-lg sm:text-base"
                  >
                    ⏪
                  </button>
                  <button
                    @click="togglePlay"
                    class="w-14 h-14 sm:w-12 sm:h-12 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center transition-colors text-xl"
                  >
                    {{ isPlaying ? '❚❚' : '▶' }}
                  </button>
                  <button
                    @click="skipForward"
                    class="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-lg sm:text-base"
                  >
                    ⏩
                  </button>
                </div>

                <!-- Playback rate - horizontal scroll on mobile -->
                <div class="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
                  <span class="text-xs sm:text-sm text-[var(--color-text-muted)] whitespace-nowrap">Snelheid:</span>
                  <div class="flex gap-1">
                    <button
                      v-for="rate in playbackRates"
                      :key="rate"
                      @click="setPlaybackRate(rate)"
                      class="px-3 py-1.5 sm:px-2 sm:py-1 text-sm rounded transition-colors whitespace-nowrap"
                      :class="playbackRate === rate ? 'bg-brand-600 text-white' : 'bg-white/10 hover:bg-white/15'"
                    >
                      {{ rate }}x
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- New Clip Form -->
            <div v-if="isCreatingClip" class="card p-3 sm:p-4 space-y-3 sm:space-y-4 border-brand-500">
              <h3 class="font-semibold">Nieuwe clip maken</h3>

              <input
                v-model="newClipTitle"
                type="text"
                placeholder="Titel van de clip"
                class="input w-full"
              />

              <!-- Start/End buttons - stacked on mobile -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  @click="setClipStart"
                  class="flex items-center justify-between p-3 rounded-lg transition-colors"
                  :class="newClipStart !== null ? 'bg-green-500/20 text-green-400' : 'bg-white/10'"
                >
                  <span class="font-medium">Start</span>
                  <span class="font-mono">
                    {{ newClipStart !== null ? formatTime(newClipStart) : 'Tap om te zetten' }}
                  </span>
                </button>

                <button
                  @click="setClipEnd"
                  class="flex items-center justify-between p-3 rounded-lg transition-colors"
                  :class="newClipEnd !== null ? 'bg-red-500/20 text-red-400' : 'bg-white/10'"
                >
                  <span class="font-medium">Eind</span>
                  <span class="font-mono">
                    {{ newClipEnd !== null ? formatTime(newClipEnd) : 'Tap om te zetten' }}
                  </span>
                </button>
              </div>

              <!-- Tags -->
              <div class="space-y-2">
                <label class="text-sm text-[var(--color-text-muted)]">Tags</label>
                <div class="relative">
                  <div class="flex gap-2">
                    <input
                      :value="newClipTagInput"
                      @input="newClipTagInput = ($event.target as HTMLInputElement).value; showTagDropdown = true"
                      @focus="showTagDropdown = true"
                      @blur="setTimeout(() => showTagDropdown = false, 200)"
                      type="text"
                      placeholder="Zoek of maak tag..."
                      class="input flex-1"
                      @keyup.enter="addTag"
                    />
                    <button type="button" @click="addTag" class="btn btn-secondary px-3">+</button>
                  </div>
                  
                  <!-- Tag dropdown -->
                  <div 
                    v-if="showTagDropdown && (filteredTags.length > 0 || newClipTagInput.trim())"
                    class="absolute z-10 top-full left-0 right-12 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl max-h-48 overflow-y-auto"
                  >
                    <!-- Existing tags -->
                    <button
                      v-for="tag in filteredTags"
                      :key="tag.id"
                      type="button"
                      @mousedown.prevent="selectTagFromDropdown(tag.name)"
                      class="w-full text-left px-3 py-2 hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2"
                    >
                      <span class="text-brand-400">🏷️</span>
                      {{ tag.name }}
                    </button>
                    
                    <!-- Create new tag option -->
                    <button
                      v-if="newClipTagInput.trim() && !allTags.some(t => t.name === newClipTagInput.trim().toLowerCase())"
                      type="button"
                      @mousedown.prevent="addTag"
                      class="w-full text-left px-3 py-2 hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2 border-t border-[var(--color-border)]"
                    >
                      <span class="text-green-400">+</span>
                      <span>Nieuwe tag: <strong>{{ newClipTagInput.trim().toLowerCase() }}</strong></span>
                    </button>
                  </div>
                </div>
                
                <!-- Selected tags -->
                <div v-if="newClipTags.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in newClipTags"
                    :key="tag"
                    class="inline-flex items-center gap-1 bg-brand-600/20 text-brand-400 px-2 py-1 rounded-full text-sm"
                  >
                    {{ tag }}
                    <button type="button" @click="removeTag(tag)" class="hover:text-white">×</button>
                  </span>
                </div>
              </div>

              <div class="flex gap-2 sm:gap-3">
                <button @click="cancelCreatingClip" class="btn btn-secondary flex-1">
                  Annuleren
                </button>
                <button
                  @click="saveClip"
                  class="btn btn-primary flex-1"
                  :disabled="isSaving || !newClipTitle.trim() || newClipStart === null"
                >
                  {{ isSaving ? 'Opslaan...' : 'Opslaan' }}
                </button>
              </div>
            </div>

            <!-- Create clip button -->
            <button
              v-else
              @click="startCreatingClip"
              class="btn btn-primary w-full py-3"
            >
              + Nieuwe clip maken
            </button>
          </div>

          <!-- Clips Sidebar -->
          <div 
            class="space-y-3 sm:space-y-4"
            :class="{ 'hidden lg:block': activeTab === 'video' }"
          >
            <h2 class="text-lg sm:text-xl font-semibold hidden lg:block">Clips ({{ video.clips.length }})</h2>

            <div v-if="video.clips.length" class="space-y-2">
              <div
                v-for="clip in video.clips"
                :key="clip.id"
                class="card p-3 hover:bg-[var(--color-surface-hover)] transition-colors"
                :class="previewClip?.id === clip.id ? 'border-brand-500' : ''"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0" @click="playClipPreview(clip)">
                    <h4 class="font-medium truncate">{{ clip.title }}</h4>
                    <div class="text-sm text-[var(--color-text-muted)] font-mono">
                      {{ formatTimeShort(clip.startTime) }} → {{ clip.endTime ? formatTimeShort(clip.endTime) : 'eind' }}
                    </div>
                    <div v-if="clip.tags?.length" class="flex flex-wrap gap-1 mt-1">
                      <span
                        v-for="ct in clip.tags"
                        :key="ct.tag.id"
                        class="text-xs bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded-full"
                      >
                        {{ ct.tag.name }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-1">
                    <button
                      @click="playClipPreview(clip)"
                      class="p-2 text-sm hover:bg-white/10 rounded"
                      title="Afspelen"
                    >
                      ▶
                    </button>
                    <button
                      @click="deleteClip(clip.id)"
                      class="p-2 text-sm hover:bg-red-500/20 text-red-400 rounded"
                      title="Verwijderen"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="card p-6 text-center text-[var(--color-text-muted)]">
              <p>Nog geen clips</p>
              <p class="text-sm mt-1">Maak je eerste clip</p>
            </div>

            <!-- Preview stop button -->
            <button
              v-if="previewClip"
              @click="stopPreview"
              class="btn btn-secondary w-full"
            >
              Stop preview
            </button>

            <!-- Mobile: button to go to video tab to create clip -->
            <button
              v-if="!isCreatingClip"
              @click="activeTab = 'video'; startCreatingClip()"
              class="btn btn-primary w-full lg:hidden"
            >
              + Nieuwe clip maken
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
