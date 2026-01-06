<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  logs: string[]
}>()

const emit = defineEmits<{
  clear: []
}>()

const isOpen = ref(false)
const copied = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}

async function copyLogs() {
  const text = props.logs.join('\n')
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch {
    // Fallback for mobile
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  }
}

function clearLogs() {
  emit('clear')
}
</script>

<template>
  <!-- Toggle button (always visible) -->
  <button 
    @click="toggle"
    class="fixed top-4 right-4 z-[100] w-10 h-10 rounded-full bg-yellow-500 text-black flex items-center justify-center shadow-lg"
  >
    <span class="text-xs font-bold">{{ logs.length }}</span>
  </button>

  <!-- Console panel -->
  <transition name="slide">
    <div 
      v-if="isOpen"
      class="fixed inset-x-0 bottom-0 z-[100] bg-black/95 backdrop-blur-sm border-t border-yellow-500/50 max-h-[60vh] flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-3 border-b border-white/10">
        <span class="text-yellow-500 font-mono text-sm">Debug Console ({{ logs.length }})</span>
        <div class="flex gap-2">
          <button 
            @click="copyLogs"
            class="px-3 py-1 rounded bg-white/10 text-white text-xs hover:bg-white/20"
          >
            {{ copied ? '✓ Copied' : 'Copy' }}
          </button>
          <button 
            @click="clearLogs"
            class="px-3 py-1 rounded bg-white/10 text-white text-xs hover:bg-white/20"
          >
            Clear
          </button>
          <button 
            @click="toggle"
            class="px-3 py-1 rounded bg-white/10 text-white text-xs hover:bg-white/20"
          >
            Close
          </button>
        </div>
      </div>

      <!-- Logs -->
      <div class="flex-1 overflow-y-auto p-3 font-mono text-xs">
        <div v-if="logs.length === 0" class="text-white/40">No logs yet...</div>
        <div 
          v-for="(log, i) in logs" 
          :key="i"
          class="text-green-400 whitespace-pre-wrap break-all mb-1"
        >
          {{ log }}
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateY(100%);
}
</style>

