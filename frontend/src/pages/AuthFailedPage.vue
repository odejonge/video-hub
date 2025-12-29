<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-6">
    <div class="text-center space-y-6 max-w-md">
      <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
        <span class="text-3xl">😕</span>
      </div>
      <h1 class="text-2xl font-bold">Inloggen mislukt</h1>
      <p class="text-[var(--color-text-muted)]">
        Er ging iets mis bij het inloggen. Probeer het opnieuw.
      </p>
      <RouterLink to="/" class="btn btn-primary inline-block">
        Terug naar home
      </RouterLink>
    </div>
  </div>
</template>


