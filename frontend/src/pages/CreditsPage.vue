<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/lib/api'
import AppLayout from '@/components/AppLayout.vue'

interface CreditPackage {
  id: string
  name: string
  credits: number
  priceEur: number
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  createdAt: string
}

const packages = ref<CreditPackage[]>([])
const balance = ref(0)
const transactions = ref<Transaction[]>([])
const purchasing = ref<string | null>(null)

async function loadData() {
  const [packagesRes, balanceRes] = await Promise.all([
    api.get<CreditPackage[]>('/api/credits/packages'),
    api.get<{ credits: number; transactions: Transaction[] }>('/api/credits/balance'),
  ])
  packages.value = packagesRes.data
  balance.value = balanceRes.data.credits
  transactions.value = balanceRes.data.transactions
}

async function purchasePackage(pkg: CreditPackage) {
  purchasing.value = pkg.id
  try {
    const res = await api.post<{ checkoutUrl: string }>('/api/credits/purchase', {
      packageId: pkg.id,
    })
    window.location.href = res.data.checkoutUrl
  } catch {
    purchasing.value = null
  }
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

onMounted(loadData)
</script>

<template>
  <AppLayout>
    <div class="max-w-4xl mx-auto px-6 py-8">
      <h1 class="text-3xl font-bold mb-8">Credits</h1>

      <!-- Current balance -->
      <div class="card p-6 mb-8">
        <div class="text-[var(--color-text-muted)] mb-1">Huidig saldo</div>
        <div class="text-4xl font-bold text-brand-400">{{ balance }} credits</div>
      </div>

      <!-- Packages -->
      <h2 class="text-xl font-semibold mb-4">Credits kopen</h2>
      <div class="grid md:grid-cols-3 gap-4 mb-12">
        <div
          v-for="pkg in packages"
          :key="pkg.id"
          class="card p-6 flex flex-col"
        >
          <div class="text-lg font-semibold mb-1">{{ pkg.name }}</div>
          <div class="text-3xl font-bold text-brand-400 mb-1">{{ pkg.credits }}</div>
          <div class="text-[var(--color-text-muted)] mb-4">credits</div>
          <div class="mt-auto">
            <button
              @click="purchasePackage(pkg)"
              :disabled="purchasing === pkg.id"
              class="btn btn-primary w-full"
            >
              {{ purchasing === pkg.id ? 'Even wachten...' : formatPrice(pkg.priceEur) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Transaction history -->
      <h2 class="text-xl font-semibold mb-4">Geschiedenis</h2>
      <div class="card overflow-hidden">
        <table class="w-full">
          <thead class="border-b border-[var(--color-border)]">
            <tr class="text-left text-[var(--color-text-muted)]">
              <th class="p-4 font-medium">Datum</th>
              <th class="p-4 font-medium">Omschrijving</th>
              <th class="p-4 font-medium text-right">Credits</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tx in transactions"
              :key="tx.id"
              class="border-b border-[var(--color-border)] last:border-0"
            >
              <td class="p-4 text-[var(--color-text-muted)]">{{ formatDate(tx.createdAt) }}</td>
              <td class="p-4">{{ tx.description || tx.type }}</td>
              <td class="p-4 text-right" :class="tx.amount > 0 ? 'text-green-400' : 'text-red-400'">
                {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
              </td>
            </tr>
            <tr v-if="!transactions.length">
              <td colspan="3" class="p-8 text-center text-[var(--color-text-muted)]">
                Nog geen transacties
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>


