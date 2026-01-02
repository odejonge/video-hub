<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import AppLayout from '@/components/AppLayout.vue'
import Icon from '@/components/Icons.vue'

interface Collection {
  id: string
  name: string
  _count: { clips: number; tags: number }
}

interface Tag {
  id: string
  name: string
  _count: { clips: number }
}

const router = useRouter()
const collections = ref<{ collection: Collection; tags: Tag[] }[]>([])
const loading = ref(true)
const expandedCollections = ref<Set<string>>(new Set())

async function loadData() {
  loading.value = true
  try {
    // Get all collections
    const { data: cols } = await api.get<Collection[]>('/api/collections')
    
    // Load tags for each collection
    const results = await Promise.all(
      cols.map(async (col) => {
        try {
          const { data: tags } = await api.get<Tag[]>(`/api/collections/${col.id}/tags`)
          return { collection: col, tags }
        } catch {
          return { collection: col, tags: [] }
        }
      })
    )
    
    collections.value = results.filter(r => r.tags.length > 0)
    
    // Expand first collection by default
    if (collections.value.length > 0) {
      expandedCollections.value.add(collections.value[0].collection.id)
    }
  } finally {
    loading.value = false
  }
}

function toggleCollection(id: string) {
  if (expandedCollections.value.has(id)) {
    expandedCollections.value.delete(id)
  } else {
    expandedCollections.value.add(id)
  }
  expandedCollections.value = new Set(expandedCollections.value) // Trigger reactivity
}

function goToCollection(id: string) {
  router.push(`/collections/${id}`)
}

// Total stats
const totalTags = computed(() => 
  collections.value.reduce((sum, c) => sum + c.tags.length, 0)
)
const totalClips = computed(() => 
  collections.value.reduce((sum, c) => 
    sum + c.tags.reduce((s, t) => s + t._count.clips, 0), 0
  )
)

onMounted(loadData)
</script>

<template>
  <AppLayout>
    <div class="p-4 md:p-6 max-w-4xl mx-auto">
      <header class="mb-6">
        <h1 class="text-2xl md:text-3xl font-bold mb-2">Tags Overzicht</h1>
        <p class="text-[var(--color-text-muted)]">
          {{ totalTags }} tags in {{ collections.length }} collectie{{ collections.length !== 1 ? 's' : '' }}
        </p>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
      </div>

      <div v-else>
        <!-- Empty state -->
        <div v-if="collections.length === 0" class="card p-12 text-center">
          <Icon name="tag" :size="48" class="mb-4 mx-auto" />
          <p class="text-[var(--color-text-muted)]">Nog geen tags.</p>
          <p class="text-sm text-[var(--color-text-muted)] mt-1">
            Maak een collectie aan en voeg tags toe.
          </p>
          <RouterLink to="/dashboard" class="btn btn-primary mt-4 inline-block">
            Naar collecties
          </RouterLink>
        </div>

        <!-- Collections with tags -->
        <div v-else class="space-y-4">
          <div
            v-for="{ collection, tags } in collections"
            :key="collection.id"
            class="card overflow-hidden"
          >
            <!-- Collection header -->
            <button
              @click="toggleCollection(collection.id)"
              class="w-full p-4 flex items-center justify-between hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon name="chevron-right" :size="18" class="transition-transform" :class="{ 'rotate-90': expandedCollections.has(collection.id) }" />
                <div class="text-left">
                  <h2 class="font-semibold">{{ collection.name }}</h2>
                  <p class="text-sm text-[var(--color-text-muted)]">
                    {{ tags.length }} tags · {{ collection._count.clips }} clips
                  </p>
                </div>
              </div>
              <button
                @click.stop="goToCollection(collection.id)"
                class="btn btn-secondary text-sm"
              >
                Bekijken
              </button>
            </button>

            <!-- Tags grid -->
            <div
              v-if="expandedCollections.has(collection.id)"
              class="p-4 pt-0 border-t border-[var(--color-border)]"
            >
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
                <RouterLink
                  v-for="tag in tags"
                  :key="tag.id"
                  :to="`/collections/${collection.id}?tag=${encodeURIComponent(tag.name)}`"
                  class="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <span class="font-medium truncate">{{ tag.name }}</span>
                  <span class="text-sm text-brand-400 ml-2">{{ tag._count.clips }}</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
