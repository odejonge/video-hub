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
const isCreating = ref(false)
const createError = ref('')

// Edit collection modal
const showEditModal = ref(false)
const editingCollection = ref<Collection | null>(null)
const editName = ref('')
const editDescription = ref('')

// Copy/Share modals
const showCopyModal = ref(false)
const showShareModal = ref(false)
const actionCollection = ref<Collection | null>(null)
const shareEmail = ref('')
const isCopying = ref(false)
const isSharing = ref(false)
const copySuccess = ref(false)
const shareSuccess = ref(false)
const shareError = ref('')

async function loadCollections() {
  const res = await api.get<Collection[]>('/api/collections')
  collections.value = res.data
}

async function loadTemplates() {
  const res = await api.get<Template[]>('/api/templates')
  templates.value = res.data
}

async function createCollection() {
  if (!newCollectionName.value.trim() || isCreating.value) return

  isCreating.value = true
  createError.value = ''
  
  try {
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
  } catch (e) {
    console.error('Failed to create collection:', e)
    createError.value = 'Aanmaken mislukt, probeer opnieuw'
  } finally {
    isCreating.value = false
  }
}

function openNewModal() {
  showNewModal.value = true
  createError.value = ''
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

function openCopyModal(collection: Collection, e: Event) {
  e.preventDefault()
  e.stopPropagation()
  actionCollection.value = collection
  copySuccess.value = false
  showCopyModal.value = true
}

async function copyCollection() {
  if (!actionCollection.value) return
  isCopying.value = true
  try {
    await api.post(`/api/collections/${actionCollection.value.id}/copy`)
    copySuccess.value = true
    await loadCollections()
    setTimeout(() => {
      showCopyModal.value = false
    }, 1500)
  } catch (e) {
    console.error('Failed to copy collection:', e)
  } finally {
    isCopying.value = false
  }
}

function openShareModal(collection: Collection, e: Event) {
  e.preventDefault()
  e.stopPropagation()
  actionCollection.value = collection
  shareEmail.value = ''
  shareError.value = ''
  shareSuccess.value = false
  showShareModal.value = true
}

async function shareCollection() {
  if (!actionCollection.value || !shareEmail.value) return
  isSharing.value = true
  shareError.value = ''
  try {
    await api.post(`/api/collections/${actionCollection.value.id}/share`, {
      targetUserEmail: shareEmail.value,
    })
    shareSuccess.value = true
    setTimeout(() => {
      showShareModal.value = false
    }, 1500)
  } catch (e: any) {
    if (e.message?.includes('user_not_found')) {
      shareError.value = 'Gebruiker niet gevonden'
    } else if (e.message?.includes('cannot_share_with_self')) {
      shareError.value = 'Je kunt niet met jezelf delen'
    } else {
      shareError.value = 'Delen mislukt'
    }
  } finally {
    isSharing.value = false
  }
}

onMounted(loadCollections)
</script>

<template>
  <AppLayout>
    <div class="max-w-6xl mx-auto px-6 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div class="hidden sm:block">
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
              
              <!-- Action buttons -->
              <div class="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click.prevent="openEditModal(collection, $event)"
                  class="p-1.5 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white"
                  title="Bewerken"
                >
                  <Icon name="edit" :size="16" />
                </button>
                <button
                  @click.prevent="openCopyModal(collection, $event)"
                  class="p-1.5 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white"
                  title="Kopiëren"
                >
                  <Icon name="copy" :size="16" />
                </button>
                <button
                  @click.prevent="openShareModal(collection, $event)"
                  class="p-1.5 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white"
                  title="Delen"
                >
                  <Icon name="share" :size="16" />
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
      <div v-if="showNewModal" class="fixed inset-0 bg-black/70 z-50 overflow-auto" @click.self="showNewModal = false">
        <div class="modal-card p-4 sm:p-6 space-y-4 mt-16 mx-4 sm:mx-auto sm:max-w-lg">
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

          <p v-if="createError" class="text-red-400 text-sm">{{ createError }}</p>
          
          <div class="flex gap-3 justify-end pt-2">
            <button @click="showNewModal = false" class="btn btn-secondary" :disabled="isCreating">Annuleren</button>
            <button @click="createCollection" class="btn btn-primary" :disabled="!newCollectionName.trim() || isCreating">
              {{ isCreating ? 'Aanmaken...' : 'Aanmaken' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Collection Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 bg-black/70 z-50 overflow-auto" @click.self="showEditModal = false">
        <div class="modal-card p-4 sm:p-6 space-y-4 mt-16 mx-4 sm:mx-auto sm:max-w-md">
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

    <!-- Copy Modal -->
    <Teleport to="body">
      <div v-if="showCopyModal" class="fixed inset-0 bg-black/70 z-50 overflow-auto" @click.self="showCopyModal = false">
        <div class="modal-card p-4 sm:p-6 space-y-4 mt-16 mx-4 sm:mx-auto sm:max-w-md">
          <h2 class="text-xl font-semibold">Collectie kopiëren</h2>
          
          <div v-if="copySuccess" class="text-center py-4">
            <Icon name="check" :size="48" class="mx-auto mb-2 text-green-400" />
            <p class="text-green-400">Gekopieerd!</p>
          </div>
          
          <template v-else>
            <p class="text-[var(--color-text-muted)]">
              Wil je een kopie maken van <strong class="text-white">{{ actionCollection?.name }}</strong>? 
              Alle clips en tags worden gekopieerd.
            </p>
            
            <div class="flex gap-3 pt-2">
              <button @click="showCopyModal = false" class="btn btn-secondary flex-1">Annuleren</button>
              <button @click="copyCollection" class="btn btn-primary flex-1" :disabled="isCopying">
                {{ isCopying ? 'Kopiëren...' : 'Kopiëren' }}
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
          <h2 class="text-xl font-semibold">Collectie delen</h2>
          
          <div v-if="shareSuccess" class="text-center py-4">
            <Icon name="check" :size="48" class="mx-auto mb-2 text-green-400" />
            <p class="text-green-400">Gedeeld met {{ shareEmail }}!</p>
          </div>
          
          <template v-else>
            <p class="text-[var(--color-text-muted)]">
              Deel <strong class="text-white">{{ actionCollection?.name }}</strong> met een andere gebruiker. 
              Zij ontvangen een kopie van alle clips en tags.
            </p>
            
            <input
              v-model="shareEmail"
              type="email"
              placeholder="E-mail van ontvanger"
              class="input w-full"
              @keyup.enter="shareCollection"
            />
            
            <p v-if="shareError" class="text-red-400 text-sm">{{ shareError }}</p>
            
            <div class="flex gap-3 pt-2">
              <button @click="showShareModal = false" class="btn btn-secondary flex-1">Annuleren</button>
              <button @click="shareCollection" class="btn btn-primary flex-1" :disabled="!shareEmail || isSharing">
                {{ isSharing ? 'Delen...' : 'Delen' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
