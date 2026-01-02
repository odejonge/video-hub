<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import AppLayout from '@/components/AppLayout.vue'
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

interface Collection {
  id: string
  name: string
  description: string | null
  tags: Tag[]
  clips: Clip[]
}

const route = useRoute()
const router = useRouter()
const collection = ref<Collection | null>(null)
const loading = ref(true)
const activeTab = ref<'clips' | 'tags'>('clips')
const selectedTagId = ref<string | null>(null)

// Tag management
const showNewTagModal = ref(false)
const newTagName = ref('')
const editingTag = ref<Tag | null>(null)

// Clip editing
const showEditClipModal = ref(false)
const editingClip = ref<Clip | null>(null)
const editClipTitle = ref('')
const editClipTags = ref<string[]>([])
const editClipTagInput = ref('')
const showEditTagDropdown = ref(false)
const isSavingClip = ref(false)

const filteredClips = computed(() => {
  if (!collection.value) return []
  if (!selectedTagId.value) return collection.value.clips
  return collection.value.clips.filter(clip => 
    clip.tags.some(ct => ct.tag.id === selectedTagId.value)
  )
})

const filteredEditTags = computed(() => {
  if (!collection.value) return []
  const search = editClipTagInput.value.toLowerCase()
  return collection.value.tags
    .filter(t => t.name.includes(search) && !editClipTags.value.includes(t.name))
    .slice(0, 10)
})

async function loadCollection() {
  loading.value = true
  try {
    const res = await api.get<Collection>(`/api/collections/${route.params.id}`)
    collection.value = res.data
    
    // Check for tag query parameter and select that tag
    const tagQuery = route.query.tag as string | undefined
    if (tagQuery && collection.value) {
      const matchingTag = collection.value.tags.find(
        t => t.name.toLowerCase() === tagQuery.toLowerCase()
      )
      if (matchingTag) {
        selectedTagId.value = matchingTag.id
      }
    }
  } catch {
    router.push('/dashboard')
  } finally {
    loading.value = false
  }
}

function openClip(clip: Clip) {
  router.push(`/clips/${clip.id}`)
}

function openEditClipModal(clip: Clip, e: Event) {
  e.stopPropagation()
  editingClip.value = clip
  editClipTitle.value = clip.title
  editClipTags.value = clip.tags.map(ct => ct.tag.name)
  editClipTagInput.value = ''
  showEditClipModal.value = true
}

function addEditTag() {
  const tag = editClipTagInput.value.trim().toLowerCase()
  if (tag && !editClipTags.value.includes(tag)) {
    editClipTags.value = [...editClipTags.value, tag]
  }
  editClipTagInput.value = ''
  showEditTagDropdown.value = false
}

function selectEditTag(tagName: string) {
  if (!editClipTags.value.includes(tagName)) {
    editClipTags.value = [...editClipTags.value, tagName]
  }
  editClipTagInput.value = ''
  showEditTagDropdown.value = false
}

function removeEditTag(tag: string) {
  editClipTags.value = editClipTags.value.filter(t => t !== tag)
}

async function saveClipEdit() {
  if (!editingClip.value || !editClipTitle.value.trim()) return
  
  isSavingClip.value = true
  try {
    await api.patch(`/api/clips/${editingClip.value.id}`, {
      title: editClipTitle.value,
      tagNames: editClipTags.value,
    })
    
    showEditClipModal.value = false
    editingClip.value = null
    await loadCollection()
  } catch (err) {
    console.error('Failed to update clip:', err)
  } finally {
    isSavingClip.value = false
  }
}

async function deleteClip(clip: Clip, e: Event) {
  e.stopPropagation()
  if (!confirm(`Clip "${clip.title}" verwijderen?`)) return
  
  try {
    await api.delete(`/api/clips/${clip.id}`)
    await loadCollection()
  } catch (err) {
    console.error('Failed to delete clip:', err)
  }
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Tag management
async function createTag() {
  if (!newTagName.value.trim() || !collection.value) return
  
  try {
    await api.post(`/api/collections/${collection.value.id}/tags`, {
      name: newTagName.value,
    })
    newTagName.value = ''
    showNewTagModal.value = false
    await loadCollection()
  } catch (e: any) {
    if (e.message?.includes('409')) {
      alert('Tag bestaat al')
    }
  }
}

async function updateTag() {
  if (!editingTag.value || !collection.value) return
  
  try {
    await api.patch(`/api/collections/${collection.value.id}/tags/${editingTag.value.id}`, {
      name: editingTag.value.name,
    })
    editingTag.value = null
    await loadCollection()
  } catch (e: any) {
    if (e.message?.includes('409')) {
      alert('Tag naam bestaat al')
    }
  }
}

async function deleteTag(tag: Tag) {
  if (!collection.value) return
  if (!confirm(`Tag "${tag.name}" verwijderen? Dit verwijdert de tag van alle clips.`)) return
  
  await api.delete(`/api/collections/${collection.value.id}/tags/${tag.id}`)
  await loadCollection()
}

onMounted(loadCollection)
</script>

<template>
  <AppLayout>
    <div class="max-w-6xl mx-auto px-6 py-8">
      <!-- Back link -->
      <RouterLink to="/dashboard" class="text-[var(--color-text-muted)] hover:text-white mb-4 inline-flex items-center gap-1">
        <Icon name="arrow-left" :size="16" /> Terug naar collecties
      </RouterLink>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
      </div>

      <div v-else-if="collection">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold">{{ collection.name }}</h1>
          <p v-if="collection.description" class="text-[var(--color-text-muted)] mt-1">
            {{ collection.description }}
          </p>
        </div>

        <!-- Tabs -->
        <div class="flex gap-4 border-b border-[var(--color-border)] mb-6">
          <button
            @click="activeTab = 'clips'"
            class="pb-3 px-1 text-sm font-medium transition-colors border-b-2 -mb-px"
            :class="activeTab === 'clips' 
              ? 'border-brand-500 text-brand-400' 
              : 'border-transparent text-[var(--color-text-muted)] hover:text-white'"
          >
            Clips ({{ collection.clips.length }})
          </button>
          <button
            @click="activeTab = 'tags'"
            class="pb-3 px-1 text-sm font-medium transition-colors border-b-2 -mb-px"
            :class="activeTab === 'tags' 
              ? 'border-brand-500 text-brand-400' 
              : 'border-transparent text-[var(--color-text-muted)] hover:text-white'"
          >
            Tags ({{ collection.tags.length }})
          </button>
        </div>

        <!-- Clips Tab -->
        <div v-if="activeTab === 'clips'">
          <!-- Tag filter -->
          <div v-if="collection.tags.length" class="flex flex-wrap gap-2 mb-6">
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
              v-for="tag in collection.tags"
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
              <div class="aspect-video bg-black/50 relative">
                <img
                  v-if="clip.video.thumbnailUrl"
                  :src="clip.video.thumbnailUrl"
                  :alt="clip.title"
                  class="w-full h-full object-cover"
                />
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <Icon name="play" :size="24" />
                  </div>
                </div>
                <!-- Time badge -->
                <div class="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-mono">
                  {{ formatTime(clip.startTime) }} - {{ clip.endTime ? formatTime(clip.endTime) : '...' }}
                </div>
                <!-- Edit/Delete buttons -->
                <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    @click="openEditClipModal(clip, $event)"
                    class="p-1.5 rounded bg-black/60 hover:bg-black/80 text-white"
                    title="Bewerken"
                  ><Icon name="edit" :size="16" /></button>
                  <button
                    @click="deleteClip(clip, $event)"
                    class="p-1.5 rounded bg-black/60 hover:bg-red-500/80 text-white"
                    title="Verwijderen"
                  ><Icon name="trash" :size="16" /></button>
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

          <!-- Empty state -->
          <div v-else class="card p-12 text-center">
            <div class="w-16 h-16 rounded-full bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
              <Icon name="clip" :size="32" />
            </div>
            <h3 class="text-xl font-semibold mb-2">Nog geen clips</h3>
            <p class="text-[var(--color-text-muted)] mb-6">
              Ga naar Video's om clips te maken en ze aan deze collectie toe te voegen.
            </p>
            <RouterLink to="/videos" class="btn btn-primary">
              Naar video's
            </RouterLink>
          </div>
        </div>

        <!-- Tags Tab -->
        <div v-if="activeTab === 'tags'">
          <div class="flex justify-end mb-4">
            <button @click="showNewTagModal = true" class="btn btn-primary flex items-center gap-2">
              <Icon name="plus" :size="16" /> Tag toevoegen
            </button>
          </div>

          <div v-if="collection.tags.length" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="tag in collection.tags"
              :key="tag.id"
              class="card p-4 flex items-center justify-between"
            >
              <div v-if="editingTag?.id !== tag.id">
                <div class="font-medium">{{ tag.name }}</div>
                <div class="text-sm text-[var(--color-text-muted)]">{{ tag._count.clips }} clips</div>
              </div>
              <input
                v-else
                v-model="editingTag.name"
                class="input flex-1 mr-2"
                @keyup.enter="updateTag"
                @keyup.escape="editingTag = null"
              />
              
              <div class="flex gap-2">
                <button
                  v-if="editingTag?.id !== tag.id"
                  @click="editingTag = { ...tag }"
                  class="text-[var(--color-text-muted)] hover:text-white"
                >
                  <Icon name="edit" :size="16" />
                </button>
                <button
                  v-else
                  @click="updateTag"
                  class="text-green-400 hover:text-green-300"
                >
                  <Icon name="check" :size="16" />
                </button>
                <button
                  @click="editingTag?.id === tag.id ? editingTag = null : deleteTag(tag)"
                  class="text-[var(--color-text-muted)] hover:text-red-400"
                >
                  <Icon v-if="editingTag?.id === tag.id" name="x" :size="16" />
                  <Icon v-else name="trash" :size="16" />
                </button>
              </div>
            </div>
          </div>

          <div v-else class="card p-12 text-center">
            <p class="text-[var(--color-text-muted)]">
              Nog geen tags. Voeg tags toe om clips te organiseren.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- New Tag Modal -->
    <Teleport to="body">
      <div v-if="showNewTagModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showNewTagModal = false">
        <div class="card p-6 w-full max-w-sm space-y-4">
          <h2 class="text-xl font-semibold">Nieuwe tag</h2>
          <input
            v-model="newTagName"
            type="text"
            placeholder="Tag naam"
            class="input w-full"
            @keyup.enter="createTag"
          />
          <div class="flex gap-3 justify-end">
            <button @click="showNewTagModal = false" class="btn btn-secondary">Annuleren</button>
            <button @click="createTag" class="btn btn-primary" :disabled="!newTagName.trim()">Toevoegen</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Clip Modal -->
    <Teleport to="body">
      <div v-if="showEditClipModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showEditClipModal = false">
        <div class="card p-6 w-full max-w-md space-y-4">
          <h2 class="text-xl font-semibold">Clip bewerken</h2>
          
          <!-- Title -->
          <div>
            <label class="block text-sm text-[var(--color-text-muted)] mb-1">Titel</label>
            <input
              v-model="editClipTitle"
              type="text"
              class="input w-full"
            />
          </div>

          <!-- Tags -->
          <div class="space-y-2">
            <label class="block text-sm text-[var(--color-text-muted)]">Tags</label>
            
            <!-- Tag input with dropdown -->
            <div class="relative">
              <div class="flex gap-2">
                <input
                  v-model="editClipTagInput"
                  @input="showEditTagDropdown = true"
                  @focus="showEditTagDropdown = true"
                  @blur="showEditTagDropdown = false"
                  @keyup.enter="addEditTag"
                  type="text"
                  placeholder="Zoek of maak tag..."
                  class="input flex-1"
                />
                <button type="button" @click="addEditTag" class="btn btn-secondary px-3">+</button>
              </div>
              
              <!-- Dropdown -->
              <div 
                v-if="showEditTagDropdown && (filteredEditTags.length > 0 || editClipTagInput.trim())"
                class="absolute z-10 top-full left-0 right-12 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl max-h-48 overflow-y-auto"
              >
                <button
                  v-for="tag in filteredEditTags"
                  :key="tag.id"
                  type="button"
                  @mousedown.prevent="selectEditTag(tag.name)"
                  class="w-full text-left px-3 py-2 hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2"
                >
                  <Icon name="tag" :size="16" class="text-brand-400" />
                  {{ tag.name }}
                </button>
                
                <button
                  v-if="editClipTagInput.trim() && !collection?.tags.some(t => t.name === editClipTagInput.trim().toLowerCase())"
                  type="button"
                  @mousedown.prevent="addEditTag"
                  class="w-full text-left px-3 py-2 hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2 border-t border-[var(--color-border)]"
                >
                  <Icon name="plus" :size="16" class="text-green-400" />
                  <span>Nieuwe tag: <strong>{{ editClipTagInput.trim().toLowerCase() }}</strong></span>
                </button>
              </div>
            </div>
            
            <!-- Selected tags -->
            <div v-if="editClipTags.length" class="flex flex-wrap gap-2">
              <span
                v-for="tag in editClipTags"
                :key="tag"
                class="inline-flex items-center gap-1 bg-brand-600/20 text-brand-400 px-2 py-1 rounded-full text-sm"
              >
                {{ tag }}
                <button type="button" @click="removeEditTag(tag)" class="hover:text-white">×</button>
              </span>
            </div>
          </div>

          <div class="flex gap-3 justify-end pt-2">
            <button @click="showEditClipModal = false" class="btn btn-secondary">Annuleren</button>
            <button @click="saveClipEdit" class="btn btn-primary" :disabled="!editClipTitle.trim() || isSavingClip">
              {{ isSavingClip ? 'Opslaan...' : 'Opslaan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
