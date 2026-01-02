<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'
import Icon from '@/components/Icons.vue'

const auth = useAuthStore()

const loading = ref(true)
const paymentStatus = ref<string | null>(null)
const error = ref(false)

const statusConfig = computed(() => {
  switch (paymentStatus.value) {
    case 'paid':
      return {
        iconName: 'check' as const,
        iconBg: 'bg-green-500/20',
        iconColor: 'text-green-400',
        title: 'Betaling gelukt!',
        message: 'Je credits zijn toegevoegd aan je account.',
        showButton: true,
      }
    case 'open':
    case 'pending':
      return {
        iconName: 'settings' as const,
        iconBg: 'bg-yellow-500/20',
        iconColor: 'text-yellow-400',
        title: 'Betaling in behandeling',
        message: 'Je betaling wordt nog verwerkt. Je credits worden toegevoegd zodra de betaling is voltooid.',
        showButton: true,
      }
    case 'canceled':
      return {
        iconName: 'x' as const,
        iconBg: 'bg-gray-500/20',
        iconColor: 'text-gray-400',
        title: 'Betaling geannuleerd',
        message: 'Je hebt de betaling geannuleerd. Er zijn geen credits in rekening gebracht.',
        showButton: true,
      }
    case 'expired':
      return {
        iconName: 'x' as const,
        iconBg: 'bg-orange-500/20',
        iconColor: 'text-orange-400',
        title: 'Betaling verlopen',
        message: 'De betaling is verlopen. Probeer het opnieuw.',
        showButton: true,
      }
    case 'failed':
      return {
        iconName: 'x' as const,
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-400',
        title: 'Betaling mislukt',
        message: 'Er is iets misgegaan met je betaling. Probeer het opnieuw of kies een andere betaalmethode.',
        showButton: true,
      }
    default:
      return {
        iconName: 'search' as const,
        iconBg: 'bg-gray-500/20',
        iconColor: 'text-gray-400',
        title: 'Status onbekend',
        message: 'We konden de status van je betaling niet ophalen.',
        showButton: true,
      }
  }
})

async function checkPaymentStatus() {
  // Get payment ID from localStorage (stored before redirect to Mollie)
  const paymentId = localStorage.getItem('pendingPaymentId')
  
  if (!paymentId) {
    console.error('No pending payment ID found')
    error.value = true
    loading.value = false
    return
  }
  
  try {
    console.log('Fetching payment status for:', paymentId)
    const { data } = await api.get<{ status: string }>(`/api/credits/payment/${paymentId}`)
    console.log('Payment API response:', data)
    paymentStatus.value = data.status
    
    // Clear the stored payment ID
    localStorage.removeItem('pendingPaymentId')
    
    // Refresh user data to get updated credits
    await auth.fetchUser()
  } catch (e: any) {
    console.error('Failed to check payment status:', e?.message || e)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  checkPaymentStatus()
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-6">
    <!-- Loading -->
    <div v-if="loading" class="text-center">
      <div class="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="mt-4 text-[var(--color-text-muted)]">Betaalstatus ophalen...</p>
    </div>
    
    <!-- Error -->
    <div v-else-if="error" class="text-center space-y-6 max-w-md">
      <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto text-red-400">
        <Icon name="x" :size="32" />
      </div>
      <h1 class="text-2xl font-bold">Er ging iets mis</h1>
      <p class="text-[var(--color-text-muted)]">
        We konden de status van je betaling niet ophalen.
      </p>
      <RouterLink to="/credits" class="btn btn-primary inline-block">
        Naar credits
      </RouterLink>
    </div>
    
    <!-- Status -->
    <div v-else class="text-center space-y-6 max-w-md">
      <div 
        class="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
        :class="[statusConfig.iconBg, statusConfig.iconColor]"
      >
        <Icon :name="statusConfig.iconName" :size="32" />
      </div>
      <h1 class="text-2xl font-bold">{{ statusConfig.title }}</h1>
      <p class="text-[var(--color-text-muted)]">
        {{ statusConfig.message }}
      </p>
      <RouterLink v-if="statusConfig.showButton" to="/credits" class="btn btn-primary inline-block">
        Naar credits
      </RouterLink>
    </div>
  </div>
</template>

