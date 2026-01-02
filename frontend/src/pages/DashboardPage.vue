<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/lib/api'
import AppLayout from '@/components/AppLayout.vue'
import Icon from '@/components/Icons.vue'

interface Collection {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  _count: { clips: number; tags: number }
}

interface Template {
  id: string
  name: string
  description: string | null
  _count: { tags: number }
  tags: { name: string }[]
}

const collections = ref<Collection[]>([])
const templates = ref<Template[]>([])

// New collection modal
const showNewModal = ref(false)
const newCollectionName = ref('')
const newCollectionDescription = ref('')
const selectedTemplateId = ref<string | null>(null)

// Edit collection modal
const showEditModal = ref(false)
const editingCollection = ref<Collection | null>(null)
const editName = ref('')
const editDescription = ref('')

async function loadCollections() {
  const res = await api.get<Collection[]>('/api/collections')
  collections.value = res.data
}

async function loadTemplates() {
  const res = await api.get<Template[]>('/api/templates')
  templates.value = res.data
}

async function createCollection() {
  if (!newCollectionName.value.trim()) return

  await api.post('/api/collections', {
    name: newCollectionName.value,
    description: newCollectionDescription.value || null,
    templateId: selectedTemplateId.value,
  })

  newCollectionName.value = ''
  newCollectionDescription.value = ''
  selectedTemplateId.value = null
  showNewModal.value = false
  await loadCollections()
}

function openNewModal() {
  showNewModal.value = true
  loadTemplates()
}

function openEditModal(collection: Collection, e: Event) {
  e.preventDefault()
  e.stopPropagation()
  editingCollection.value = collection
  editName.value = collection.name
  editDescription.value = collection.description || ''
  showEditModal.value = true
}

async function saveEdit() {
  if (!editingCollection.value || !editName.value.trim()) return

  await api.patch(`/api/collections/${editingCollection.value.id}`, {
    name: editName.value,
    description: editDescription.value || null,
  })

  showEditModal.value = false
  editingCollection.value = null
  await loadCollections()
}

async function deleteCollection(collection: Collection, e: Event) {
  e.preventDefault()
  e.stopPropagation()
  
  if (!confirm(`Collectie "${collection.name}" verwijderen? Dit verwijdert ook alle clips en tags in deze collectie.`)) return

  await api.delete(`/api/collections/${collection.id}`)
  await loadCollections()
}

onMounted(loadCollections)
</script>

<template>
  <AppLayout>
    <div class="max-w-6xl mx-auto px-6 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold">Mijn Collecties</h1>
          <p class="text-[var(--color-text-muted)] mt-1">
            {{ collections.length }} collectie{{ collections.length !== 1 ? 's' : '' }}
          </p>
        </div>
        <button @click="openNewModal" class="btn btn-primary flex items-center gap-2">
          <Icon name="plus" :size="18" />
          Nieuwe collectie
        </button>
      </div>

      <!-- Collections Grid -->
      <div v-if="collections.length" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <RouterLink
          v-for="collection in collections"
          :key="collection.id"
          :to="`/collections/${collection.id}`"
          class="card p-5 hover:bg-[var(--color-surface-hover)] transition-colors group"
        >
          <div class="flex items-start justify-between">
            <div class="space-y-1 flex-1 min-w-0">
              <h3 class="font-semibold text-lg group-hover:text-brand-400 transition-colors truncate">
                {{ collection.name }}
              </h3>
              <p v-if="collection.description" class="text-sm text-[var(--color-text-muted)] line-clamp-2">
                {{ collection.description }}
              </p>
            </div>
            
            <div class="flex flex-col items-end gap-2 ml-4">
              <div class="text-sm text-[var(--color-text-muted)] text-right space-y-1">
                <div class="bg-white/5 px-2 py-1 rounded">{{ collection._count.clips }} clips</div>
                <div class="bg-white/5 px-2 py-1 rounded">{{ collection._count.tags }} tags</div>
              </div>
              
              <!-- Edit/Delete buttons -->
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click.prevent="openEditModal(collection, $event)"
                  class="p-1.5 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white"
                  title="Bewerken"
                >
                  <Icon name="edit" :size="16" />
                </button>
                <button
                  @click.prevent="deleteCollection(collection, $event)"
                  class="p-1.5 rounded hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400"
                  title="Verwijderen"
                >
                  <Icon name="trash" :size="16" />
                </button>
              </div>
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- Empty state -->
      <div v-else class="card p-12 text-center">
        <div class="w-16 h-16 rounded-full bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
          <Icon name="folder" :size="32" />
        </div>
        <h3 class="text-xl font-semibold mb-2">Nog geen collecties</h3>
        <p class="text-[var(--color-text-muted)] mb-6">
          Maak je eerste collectie om clips te organiseren.
        </p>
        <button @click="openNewModal" class="btn btn-primary">
          Eerste collectie maken
        </button>
      </div>
    </div>

    <!-- New Collection Modal -->
    <Teleport to="body">
      <div v-if="showNewModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showNewModal = false">
        <div class="card p-6 w-full max-w-lg space-y-4">
          <h2 class="text-xl font-semibold">Nieuwe collectie</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-[var(--color-text-muted)] mb-1">Naam</label>
              <input
                v-model="newCollectionName"
                type="text"
                placeholder="Mijn Tango Collectie"
                class="input w-full"
                @keyup.enter="createCollection"
              />
            </div>
            
            <div>
              <label class="block text-sm text-[var(--color-text-muted)] mb-1">Beschrijving (optioneel)</label>
              <textarea
                v-model="newCollectionDescription"
                placeholder="Waar gaat deze collectie over?"
                rows="2"
                class="input w-full resize-none"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm text-[var(--color-text-muted)] mb-2">Start met een template (optioneel)</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  @click="selectedTemplateId = null"
                  class="p-3 rounded-lg border text-left transition-colors"
                  :class="selectedTemplateId === null 
                    ? 'border-brand-500 bg-brand-500/10' 
                    : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'"
                >
                  <div class="font-medium">Leeg</div>
                  <div class="text-xs text-[var(--color-text-muted)]">Begin from scratch</div>
                </button>
                <button
                  v-for="template in templates"
                  :key="template.id"
                  @click="selectedTemplateId = template.id"
                  class="p-3 rounded-lg border text-left transition-colors"
                  :class="selectedTemplateId === template.id 
                    ? 'border-brand-500 bg-brand-500/10' 
                    : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'"
                >
                  <div class="font-medium">{{ template.name }}</div>
                  <div class="text-xs text-[var(--color-text-muted)]">{{ template._count.tags }} tags</div>
                </button>
              </div>
            </div>
          </div>

          <div class="flex gap-3 justify-end pt-2">
            <button @click="showNewModal = false" class="btn btn-secondary">Annuleren</button>
            <button @click="createCollection" class="btn btn-primary" :disabled="!newCollectionName.trim()">Aanmaken</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Collection Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showEditModal = false">
        <div class="card p-6 w-full max-w-md space-y-4">
          <h2 class="text-xl font-semibold">Collectie bewerken</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-[var(--color-text-muted)] mb-1">Naam</label>
              <input
                v-model="editName"
                type="text"
                class="input w-full"
                @keyup.enter="saveEdit"
              />
            </div>
            
            <div>
              <label class="block text-sm text-[var(--color-text-muted)] mb-1">Beschrijving</label>
              <textarea
                v-model="editDescription"
                rows="3"
                class="input w-full resize-none"
              ></textarea>
            </div>
          </div>

          <div class="flex gap-3 justify-end">
            <button @click="showEditModal = false" class="btn btn-secondary">Annuleren</button>
            <button @click="saveEdit" class="btn btn-primary" :disabled="!editName.trim()">Opslaan</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
