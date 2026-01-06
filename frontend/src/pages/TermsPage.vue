<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg)]">
    <!-- Nav -->
    <nav class="px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
      <RouterLink to="/" class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <span class="text-white font-bold text-sm">D</span>
        </div>
        <span class="font-semibold text-lg">DanceClips</span>
      </RouterLink>
    </nav>

    <!-- Content -->
    <main class="max-w-3xl mx-auto px-6 py-12">
      <h1 class="text-3xl font-bold mb-8">Algemene Voorwaarden</h1>
      
      <div class="prose prose-invert max-w-none space-y-6 text-[var(--color-text-muted)]">
        <p class="text-sm">Laatst bijgewerkt: Januari 2026</p>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">1. Acceptatie van voorwaarden</h2>
          <p>
            Door gebruik te maken van DanceClips ("de Dienst") ga je akkoord met deze Algemene Voorwaarden. 
            Als je niet akkoord gaat met deze voorwaarden, maak dan geen gebruik van de Dienst.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">2. Beschrijving van de Dienst</h2>
          <p>
            DanceClips is een platform voor het uploaden, organiseren en bekijken van dansvideo's en -clips. 
            De Dienst stelt gebruikers in staat om video's te uploaden, clips te maken met timestamps, 
            en deze te organiseren met tags en collecties.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">3. Gebruikersaccount</h2>
          <p>
            Om de Dienst te gebruiken moet je inloggen via een extern account (Google of Facebook). 
            Je bent verantwoordelijk voor het beheren van je accountgegevens en alle activiteiten onder je account.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">4. Geüploade Content</h2>
          <p>
            Door content te uploaden naar DanceClips verklaar en garandeer je dat:
          </p>
          <ul class="list-disc pl-6 space-y-2">
            <li>Je de eigenaar bent van de content of toestemming hebt om deze te uploaden</li>
            <li>Je toestemming hebt van alle herkenbare personen in de video</li>
            <li>De content geen inbreuk maakt op auteursrechten, merkenrechten of andere intellectuele eigendomsrechten van derden</li>
            <li>De content geen illegaal, beledigend, discriminerend of anderszins onrechtmatig materiaal bevat</li>
          </ul>
          <p>
            Je behoudt alle eigendomsrechten op je geüploade content. Door content te uploaden verleen je 
            DanceClips een niet-exclusieve licentie om de content op te slaan, te verwerken en weer te geven 
            in het kader van de Dienst.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">5. Verboden Gebruik</h2>
          <p>Het is niet toegestaan om:</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>Content te uploaden waar je geen rechten op hebt</li>
            <li>Illegale, pornografische, gewelddadige of haatdragende content te uploaden</li>
            <li>De Dienst te gebruiken voor commerciële doeleinden zonder toestemming</li>
            <li>De Dienst te misbruiken of te proberen de beveiliging te omzeilen</li>
            <li>Andere gebruikers te hinderen of te schaden</li>
          </ul>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">6. Credits en Betalingen</h2>
          <p>
            Sommige functies van de Dienst vereisen credits. Credits kunnen worden gekocht via de betaalpagina. 
            Aankopen zijn definitief en worden niet gerestitueerd, tenzij wettelijk vereist.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">7. Aansprakelijkheid</h2>
          <p>
            DanceClips is niet aansprakelijk voor content die door gebruikers wordt geüpload. 
            Gebruikers zijn zelf verantwoordelijk voor de content die zij uploaden en de gevolgen daarvan.
          </p>
          <p>
            De Dienst wordt aangeboden "zoals deze is" zonder enige garantie. DanceClips is niet aansprakelijk 
            voor directe of indirecte schade voortvloeiend uit het gebruik van de Dienst.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">8. Melding van Inbreuk</h2>
          <p>
            Als je meent dat content op DanceClips inbreuk maakt op jouw rechten, neem dan contact met ons op 
            via het contactformulier of e-mail. Wij zullen klachten serieus onderzoeken en waar nodig content verwijderen.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">9. Beëindiging</h2>
          <p>
            Wij behouden ons het recht voor om accounts te beëindigen of toegang tot de Dienst te weigeren 
            bij overtreding van deze voorwaarden, zonder voorafgaande kennisgeving.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">10. Wijzigingen</h2>
          <p>
            Wij kunnen deze voorwaarden van tijd tot tijd wijzigen. Bij belangrijke wijzigingen zullen wij 
            je hiervan op de hoogte stellen. Voortgezet gebruik van de Dienst na wijzigingen betekent 
            acceptatie van de gewijzigde voorwaarden.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">11. Toepasselijk Recht</h2>
          <p>
            Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de 
            bevoegde rechter in Nederland.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">12. Contact</h2>
          <p>
            Voor vragen over deze voorwaarden kun je contact opnemen via e-mail.
          </p>
        </section>
      </div>

      <div class="mt-12 pt-8 border-t border-[var(--color-border)]">
        <RouterLink to="/" class="text-brand-400 hover:text-brand-300">
          ← Terug naar home
        </RouterLink>
      </div>
    </main>
  </div>
</template>

