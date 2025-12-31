<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import AppLayout from '@/components/AppLayout.vue'

interface Tag {
  id: string
  name: string
  _count: { clips: number }
}

const router = useRouter()
const tags = ref<Tag[]>([])
const loading = ref(true)
const editingTag = ref<string | null>(null)
const editTagName = ref('')
const newTagName = ref('')
const showNewTagInput = ref(false)

const sortedTags = computed(() => {
  return [...tags.value].sort((a, b) => b._count.clips - a._count.clips)
})

const tagsWithClips = computed(() => sortedTags.value.filter(t => t._count.clips > 0))
const emptyTags = computed(() => sortedTags.value.filter(t => t._count.clips === 0))

async function loadTags() {
  loading.value = true
  try {
    const { data } = await api.get<Tag[]>('/api/tags')
    tags.value = data
  } finally {
    loading.value = false
  }
}

function goToTag(tagName: string) {
  router.push(`/tags/${encodeURIComponent(tagName)}`)
}

async function createTag() {
  if (!newTagName.value.trim()) return
  await api.post('/api/tags', { name: newTagName.value })
  newTagName.value = ''
  showNewTagInput.value = false
  await loadTags()
}

function startEditTag(tag: Tag) {
  editingTag.value = tag.id
  editTagName.value = tag.name
}

async function saveTagEdit(tag: Tag) {
  if (!editTagName.value.trim()) return
  await api.patch(`/api/tags/${tag.id}`, { name: editTagName.value })
  editingTag.value = null
  await loadTags()
}

async function deleteTag(tag: Tag) {
  if (!confirm(`Tag "${tag.name}" verwijderen?`)) return
  await api.delete(`/api/tags/${tag.id}`)
  await loadTags()
}

onMounted(loadTags)
</script>

<template>
  <AppLayout>
    <div class="p-4 md:p-6 max-w-4xl mx-auto">
      <header class="mb-6">
        <h1 class="text-2xl md:text-3xl font-bold mb-2">Mijn Tags</h1>
        <p class="text-[var(--color-text-muted)]">
          Tik op een tag om je clips te bekijken
        </p>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
      </div>

      <div v-else>
        <!-- New tag button -->
        <div class="mb-6">
          <div v-if="showNewTagInput" class="flex gap-2 max-w-md">
            <input
              v-model="newTagName"
              @keyup.enter="createTag"
              placeholder="Nieuwe tag naam..."
              class="input flex-1"
              autofocus
            />
            <button @click="createTag" class="btn btn-primary px-4">Toevoegen</button>
            <button @click="showNewTagInput = false" class="btn btn-secondary px-4">Annuleren</button>
          </div>
          <button 
            v-else
            @click="showNewTagInput = true"
            class="btn btn-secondary"
          >
            + Nieuwe tag
          </button>
        </div>

        <!-- Empty state -->
        <div v-if="tags.length === 0" class="text-center py-12 text-[var(--color-text-muted)]">
          <p class="text-4xl mb-4">🏷️</p>
          <p>Nog geen tags.</p>
          <p class="text-sm mt-1">Maak clips en voeg tags toe om te beginnen.</p>
        </div>

        <!-- Tags with clips -->
        <div v-if="tagsWithClips.length" class="mb-8">
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div
              v-for="tag in tagsWithClips"
              :key="tag.id"
              class="group relative"
            >
              <!-- Edit mode -->
              <div v-if="editingTag === tag.id" class="card p-3 space-y-2">
                <input
                  v-model="editTagName"
                  @keyup.enter="saveTagEdit(tag)"
                  @keyup.escape="editingTag = null"
                  class="input w-full text-sm"
                  autofocus
                />
                <div class="flex gap-1">
                  <button @click="saveTagEdit(tag)" class="btn btn-primary text-xs flex-1">Opslaan</button>
                  <button @click="editingTag = null" class="btn btn-secondary text-xs flex-1">Annuleren</button>
                </div>
              </div>

              <!-- Normal view -->
              <button
                v-else
                @click="goToTag(tag.name)"
                class="card p-4 w-full text-left hover:ring-2 hover:ring-brand-500 transition-all"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <h3 class="font-medium truncate">{{ tag.name }}</h3>
                    <p class="text-sm text-brand-400 mt-1">
                      {{ tag._count.clips }} clip{{ tag._count.clips === 1 ? '' : 's' }}
                    </p>
                  </div>
                  <span class="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </button>

              <!-- Edit/delete buttons (visible on hover) -->
              <div 
                v-if="editingTag !== tag.id"
                class="absolute top-1 right-1 hidden group-hover:flex gap-1"
              >
                <button 
                  @click.stop="startEditTag(tag)" 
                  class="p-1 bg-[var(--color-surface)] rounded text-xs hover:bg-[var(--color-bg-tertiary)]"
                  title="Bewerken"
                >✎</button>
                <button 
                  @click.stop="deleteTag(tag)" 
                  class="p-1 bg-[var(--color-surface)] rounded text-xs hover:bg-red-500/20 text-red-400"
                  title="Verwijderen"
                >✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty tags (collapsed section) -->
        <div v-if="emptyTags.length" class="border-t border-[var(--color-border)] pt-6">
          <details class="group">
            <summary class="cursor-pointer text-[var(--color-text-muted)] text-sm flex items-center gap-2">
              <span class="group-open:rotate-90 transition-transform">▶</span>
              {{ emptyTags.length }} lege tag{{ emptyTags.length === 1 ? '' : 's' }}
            </summary>
            <div class="mt-4 flex flex-wrap gap-2">
              <div
                v-for="tag in emptyTags"
                :key="tag.id"
                class="group/tag relative inline-flex items-center gap-2 bg-[var(--color-bg-tertiary)] px-3 py-1.5 rounded-full text-sm"
              >
                <span>{{ tag.name }}</span>
                <button 
                  @click="deleteTag(tag)" 
                  class="opacity-0 group-hover/tag:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                  title="Verwijderen"
                >✕</button>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
