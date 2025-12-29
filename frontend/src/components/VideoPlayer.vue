<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { api } from '@/lib/api'

interface DanceMove {
  id: string
  name: string
  category: string
}

interface Tag {
  tag: { id: string; name: string }
}

interface Clip {
  id: string
  title: string
  videoUrl: string
  startTime: number | null
  endTime: number | null
  danceMove?: DanceMove | null
  tags?: Tag[]
}

const props = defineProps<{
  clip: Clip
  danceMoves?: DanceMove[]
}>()

const emit = defineEmits<{
  close: []
  updated: [clip: Clip]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)

// Edit mode
const isEditing = ref(false)
const editTitle = ref('')
const editStartTime = ref<number | null>(null)
const editEndTime = ref<number | null>(null)
const editDanceMoveId = ref<string | null>(null)
const isSaving = ref(false)

const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

const hasChanges = computed(() => {
  return (
    editTitle.value !== props.clip.title ||
    editStartTime.value !== props.clip.startTime ||
    editEndTime.value !== props.clip.endTime ||
    editDanceMoveId.value !== (props.clip.danceMove?.id ?? null)
  )
})

function startEditing() {
  editTitle.value = props.clip.title
  editStartTime.value = props.clip.startTime
  editEndTime.value = props.clip.endTime
  editDanceMoveId.value = props.clip.danceMove?.id ?? null
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
}

function setStartTime() {
  editStartTime.value = currentTime.value
}

function setEndTime() {
  editEndTime.value = currentTime.value
}

function clearStartTime() {
  editStartTime.value = null
}

function clearEndTime() {
  editEndTime.value = null
}

async function saveChanges() {
  if (!hasChanges.value) {
    isEditing.value = false
    return
  }

  isSaving.value = true
  try {
    const { data } = await api.patch<Clip>(`/api/clips/${props.clip.id}`, {
      title: editTitle.value,
      startTime: editStartTime.value,
      endTime: editEndTime.value,
      danceMoveId: editDanceMoveId.value,
    })
    emit('updated', data)
    isEditing.value = false
  } catch (err) {
    console.error('Failed to save:', err)
  } finally {
    isSaving.value = false
  }
}

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

  // Stop at end time if defined (only when not editing)
  const endTime = isEditing.value ? editEndTime.value : props.clip.endTime
  if (endTime && videoRef.value.currentTime >= endTime) {
    videoRef.value.pause()
    isPlaying.value = false
  }
}

function handleLoadedMetadata() {
  if (!videoRef.value) return
  duration.value = videoRef.value.duration

  // Jump to start time if defined
  if (props.clip.startTime) {
    videoRef.value.currentTime = props.clip.startTime
  }
}

function seek(e: Event) {
  if (!videoRef.value) return
  const target = e.target as HTMLInputElement
  videoRef.value.currentTime = parseFloat(target.value)
}

function jumpToStart() {
  if (!videoRef.value) return
  const startTime = isEditing.value ? editStartTime.value : props.clip.startTime
  videoRef.value.currentTime = startTime ?? 0
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
}

function handleKeydown(e: KeyboardEvent) {
  if (!videoRef.value) return
  
  // Don't handle keys when typing in input
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
    case 'Escape':
      if (isEditing.value) {
        cancelEditing()
      } else {
        emit('close')
      }
      break
    case 'i':
      if (isEditing.value) setStartTime()
      break
    case 'o':
      if (isEditing.value) setEndTime()
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

watch(
  () => props.clip,
  () => {
    if (videoRef.value && props.clip.startTime) {
      videoRef.value.currentTime = props.clip.startTime
    }
    isEditing.value = false
  }
)
</script>

<template>
  <div class="card overflow-hidden">
    <!-- Video -->
    <div class="relative bg-black aspect-video">
      <video
        ref="videoRef"
        :src="clip.videoUrl"
        class="w-full h-full"
        @timeupdate="handleTimeUpdate"
        @loadedmetadata="handleLoadedMetadata"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @click="togglePlay"
      />

      <!-- Close button -->
      <button
        @click="emit('close')"
        class="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
      >
        ✕
      </button>

      <!-- Current time overlay -->
      <div class="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded text-sm font-mono">
        {{ formatTime(currentTime) }}
      </div>
    </div>

    <!-- Controls -->
    <div class="p-4 space-y-4">
      <!-- Title row -->
      <div class="flex items-center gap-4">
        <input
          v-if="isEditing"
          v-model="editTitle"
          class="input flex-1 text-lg font-semibold"
          placeholder="Titel"
        />
        <h3 v-else class="font-semibold text-lg flex-1">{{ clip.title }}</h3>
        
        <button
          v-if="!isEditing"
          @click="startEditing"
          class="btn btn-secondary text-sm"
        >
          ✏️ Bewerken
        </button>
      </div>

      <!-- Tags & Dance move display -->
      <div v-if="!isEditing" class="flex flex-wrap gap-2">
        <span v-if="clip.danceMove" class="text-sm bg-brand-600/20 text-brand-400 px-3 py-1 rounded-full">
          {{ clip.danceMove.name }}
        </span>
        <span
          v-for="t in clip.tags"
          :key="t.tag.id"
          class="text-sm bg-white/10 text-white/70 px-3 py-1 rounded-full"
        >
          #{{ t.tag.name }}
        </span>
      </div>

      <!-- Progress bar -->
      <div class="flex items-center gap-3">
        <button
          @click="togglePlay"
          class="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center transition-colors"
        >
          {{ isPlaying ? '❚❚' : '▶' }}
        </button>

        <span class="text-sm text-[var(--color-text-muted)] w-16 font-mono">
          {{ formatTime(currentTime) }}
        </span>

        <div class="flex-1 relative">
          <input
            type="range"
            :min="0"
            :max="duration"
            :value="currentTime"
            step="0.1"
            @input="seek"
            class="w-full h-2 bg-[var(--color-border)] rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
          />
          
          <!-- Start/End markers on timeline -->
          <div
            v-if="(isEditing ? editStartTime : clip.startTime) !== null"
            class="absolute top-0 h-2 w-1 bg-green-500 rounded pointer-events-none"
            :style="{ left: `${((isEditing ? editStartTime : clip.startTime)! / duration) * 100}%` }"
          />
          <div
            v-if="(isEditing ? editEndTime : clip.endTime) !== null"
            class="absolute top-0 h-2 w-1 bg-red-500 rounded pointer-events-none"
            :style="{ left: `${((isEditing ? editEndTime : clip.endTime)! / duration) * 100}%` }"
          />
        </div>

        <span class="text-sm text-[var(--color-text-muted)] w-16 font-mono">
          {{ formatTime(duration) }}
        </span>
      </div>

      <!-- Playback rate -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-[var(--color-text-muted)]">Snelheid:</span>
        <div class="flex gap-1">
          <button
            v-for="rate in playbackRates"
            :key="rate"
            @click="setPlaybackRate(rate)"
            class="px-2 py-1 text-sm rounded transition-colors"
            :class="playbackRate === rate ? 'bg-brand-600 text-white' : 'bg-white/10 hover:bg-white/15'"
          >
            {{ rate }}x
          </button>
        </div>
      </div>

      <!-- Edit mode: Clip markers -->
      <div v-if="isEditing" class="space-y-4 pt-4 border-t border-[var(--color-border)]">
        <h4 class="font-medium">Clip markeringen</h4>
        
        <div class="grid grid-cols-2 gap-4">
          <!-- Start time -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-[var(--color-text-muted)]">Start tijd</span>
              <button
                v-if="editStartTime !== null"
                @click="clearStartTime"
                class="text-xs text-red-400 hover:text-red-300"
              >
                Wissen
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono bg-green-500/20 text-green-400 px-3 py-2 rounded flex-1">
                {{ editStartTime !== null ? formatTime(editStartTime) : '--:--.-' }}
              </span>
              <button
                @click="setStartTime"
                class="btn btn-secondary text-sm whitespace-nowrap"
                title="Shortcut: I"
              >
                Set [I]
              </button>
            </div>
          </div>

          <!-- End time -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-[var(--color-text-muted)]">Eind tijd</span>
              <button
                v-if="editEndTime !== null"
                @click="clearEndTime"
                class="text-xs text-red-400 hover:text-red-300"
              >
                Wissen
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono bg-red-500/20 text-red-400 px-3 py-2 rounded flex-1">
                {{ editEndTime !== null ? formatTime(editEndTime) : '--:--.-' }}
              </span>
              <button
                @click="setEndTime"
                class="btn btn-secondary text-sm whitespace-nowrap"
                title="Shortcut: O"
              >
                Set [O]
              </button>
            </div>
          </div>
        </div>

        <button
          @click="jumpToStart"
          class="text-sm text-brand-400 hover:text-brand-300"
        >
          ↻ Spring naar start
        </button>

        <!-- Dance move selector -->
        <div v-if="danceMoves?.length" class="space-y-2">
          <span class="text-sm text-[var(--color-text-muted)]">Dans move</span>
          <select
            v-model="editDanceMoveId"
            class="input w-full"
          >
            <option :value="null">-- Geen --</option>
            <option v-for="move in danceMoves" :key="move.id" :value="move.id">
              {{ move.name }} ({{ move.category }})
            </option>
          </select>
        </div>

        <!-- Save/Cancel buttons -->
        <div class="flex gap-3 pt-2">
          <button @click="cancelEditing" class="btn btn-secondary flex-1">
            Annuleren
          </button>
          <button
            @click="saveChanges"
            class="btn btn-primary flex-1"
            :disabled="isSaving || !hasChanges"
          >
            {{ isSaving ? 'Opslaan...' : 'Opslaan' }}
          </button>
        </div>
      </div>

      <!-- Clip markers info (view mode) -->
      <div v-else-if="clip.startTime || clip.endTime" class="text-sm text-[var(--color-text-muted)] flex items-center gap-4">
        <span>Clip:</span>
        <span class="font-mono bg-green-500/20 text-green-400 px-2 py-1 rounded">
          {{ formatTime(clip.startTime ?? 0) }}
        </span>
        <span>→</span>
        <span class="font-mono bg-red-500/20 text-red-400 px-2 py-1 rounded">
          {{ formatTime(clip.endTime ?? duration) }}
        </span>
        <button @click="jumpToStart" class="text-brand-400 hover:text-brand-300">
          ↻ Afspelen
        </button>
      </div>
    </div>
  </div>
</template>
