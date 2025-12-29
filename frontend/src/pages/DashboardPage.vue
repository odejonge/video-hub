<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'
import AppLayout from '@/components/AppLayout.vue'

interface Collection {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  _count: { clips: number }
}

const auth = useAuthStore()
const collections = ref<Collection[]>([])
const showNewModal = ref(false)
const newCollectionName = ref('')
const newCollectionDescription = ref('')

async function loadCollections() {
  const res = await api.get<Collection[]>('/api/collections')
  collections.value = res.data
}

async function createCollection() {
  if (!newCollectionName.value.trim()) return

  await api.post('/api/collections', {
    name: newCollectionName.value,
    description: newCollectionDescription.value || null,
  })

  newCollectionName.value = ''
  newCollectionDescription.value = ''
  showNewModal.value = false
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
        <button @click="showNewModal = true" class="btn btn-primary flex items-center gap-2">
          <span class="text-xl">+</span>
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
            <div class="space-y-1">
              <h3 class="font-semibold text-lg group-hover:text-brand-400 transition-colors">
                {{ collection.name }}
              </h3>
              <p v-if="collection.description" class="text-sm text-[var(--color-text-muted)] line-clamp-2">
                {{ collection.description }}
              </p>
            </div>
            <span class="text-sm text-[var(--color-text-muted)] bg-white/5 px-2 py-1 rounded">
              {{ collection._count.clips }} clips
            </span>
          </div>
        </RouterLink>
      </div>

      <!-- Empty state -->
      <div v-else class="card p-12 text-center">
        <div class="w-16 h-16 rounded-full bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
          <span class="text-3xl">📁</span>
        </div>
        <h3 class="text-xl font-semibold mb-2">Nog geen collecties</h3>
        <p class="text-[var(--color-text-muted)] mb-6">
          Maak je eerste collectie om clips te organiseren.
        </p>
        <button @click="showNewModal = true" class="btn btn-primary">
          Eerste collectie maken
        </button>
      </div>
    </div>

    <!-- New Collection Modal -->
    <Teleport to="body">
      <div v-if="showNewModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showNewModal = false">
        <div class="card p-6 w-full max-w-md space-y-4">
          <h2 class="text-xl font-semibold">Nieuwe collectie</h2>
          
          <div class="space-y-3">
            <input
              v-model="newCollectionName"
              type="text"
              placeholder="Naam"
              class="input w-full"
              @keyup.enter="createCollection"
            />
            <textarea
              v-model="newCollectionDescription"
              placeholder="Beschrijving (optioneel)"
              rows="3"
              class="input w-full resize-none"
            ></textarea>
          </div>

          <div class="flex gap-3 justify-end">
            <button @click="showNewModal = false" class="btn btn-secondary">
              Annuleren
            </button>
            <button @click="createCollection" class="btn btn-primary" :disabled="!newCollectionName.trim()">
              Aanmaken
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>


