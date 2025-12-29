<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Nav -->
    <nav class="px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <span class="text-white font-bold text-sm">D</span>
        </div>
        <span class="font-semibold text-lg">DanceClips</span>
      </div>

      <div v-if="auth.isLoggedIn">
        <RouterLink to="/dashboard" class="btn btn-primary">Dashboard</RouterLink>
      </div>
    </nav>

    <!-- Hero -->
    <main class="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div class="max-w-2xl mx-auto space-y-8">
        <h1 class="text-5xl md:text-6xl font-bold leading-tight">
          Organiseer je
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
            dansmoves
          </span>
        </h1>

        <p class="text-xl text-[var(--color-text-muted)] max-w-lg mx-auto">
          Verzamel, tag en vind je favoriete dansclips terug. Slow-motion, timestamps, en alles georganiseerd per dansstijl.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button @click="auth.loginWithGoogle" class="btn btn-primary text-lg px-8 py-3 flex items-center gap-3">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Inloggen met Google
          </button>

          <button @click="auth.loginWithFacebook" class="btn btn-secondary text-lg px-8 py-3 flex items-center gap-3">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Inloggen met Facebook
          </button>
        </div>
      </div>
    </main>

    <!-- Features -->
    <section class="px-6 py-16 border-t border-[var(--color-border)]">
      <div class="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
        <div class="card p-6 space-y-3">
          <div class="w-12 h-12 rounded-lg bg-brand-600/20 flex items-center justify-center">
            <span class="text-2xl">🎬</span>
          </div>
          <h3 class="font-semibold text-lg">Clip & Tag</h3>
          <p class="text-[var(--color-text-muted)]">
            Markeer exacte momenten in je video's met start- en eindtijden.
          </p>
        </div>

        <div class="card p-6 space-y-3">
          <div class="w-12 h-12 rounded-lg bg-brand-600/20 flex items-center justify-center">
            <span class="text-2xl">🐢</span>
          </div>
          <h3 class="font-semibold text-lg">Slow Motion</h3>
          <p class="text-[var(--color-text-muted)]">
            Bekijk moves op 0.25x tot 2x snelheid om elk detail te zien.
          </p>
        </div>

        <div class="card p-6 space-y-3">
          <div class="w-12 h-12 rounded-lg bg-brand-600/20 flex items-center justify-center">
            <span class="text-2xl">📁</span>
          </div>
          <h3 class="font-semibold text-lg">Collecties</h3>
          <p class="text-[var(--color-text-muted)]">
            Organiseer per dansstijl, niveau, of maak je eigen systeem.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>


