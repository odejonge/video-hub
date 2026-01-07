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
      <h1 class="text-3xl font-bold mb-8">Privacyverklaring</h1>
      
      <div class="prose prose-invert max-w-none space-y-6 text-[var(--color-text-muted)]">
        <p class="text-sm">Laatst bijgewerkt: Januari 2026</p>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">1. Inleiding</h2>
          <p>
            DanceClips respecteert je privacy en verwerkt persoonsgegevens in overeenstemming met de 
            Algemene Verordening Gegevensbescherming (AVG/GDPR). Deze privacyverklaring legt uit welke 
            gegevens we verzamelen en hoe we deze gebruiken.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">2. Welke gegevens verzamelen we?</h2>
          
          <h3 class="text-lg font-medium text-white">Accountgegevens</h3>
          <p>Bij het inloggen via Google of Facebook ontvangen we:</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>Je naam</li>
            <li>Je e-mailadres</li>
            <li>Je profielfoto (indien beschikbaar)</li>
            <li>Een unieke identifier van de OAuth provider</li>
          </ul>

          <h3 class="text-lg font-medium text-white">Gebruiksgegevens</h3>
          <ul class="list-disc pl-6 space-y-2">
            <li>Geüploade video's en clips</li>
            <li>Tags en collecties die je aanmaakt</li>
            <li>Transactiegeschiedenis (credit aankopen)</li>
          </ul>

          <h3 class="text-lg font-medium text-white">Technische gegevens</h3>
          <ul class="list-disc pl-6 space-y-2">
            <li>IP-adres (voor beveiliging en misbruikpreventie)</li>
            <li>Browsertype en -versie</li>
            <li>Tijdstip van toegang</li>
          </ul>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">3. Waarvoor gebruiken we je gegevens?</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>Dienstverlening:</strong> Om je account te beheren en de functionaliteiten van DanceClips te leveren</li>
            <li><strong>Betalingen:</strong> Om credit-aankopen te verwerken via Mollie</li>
            <li><strong>Communicatie:</strong> Om je te informeren over belangrijke wijzigingen in de dienst</li>
            <li><strong>Beveiliging:</strong> Om misbruik te voorkomen en de veiligheid van de dienst te waarborgen</li>
          </ul>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">4. Delen met derden</h2>
          <p>Wij delen je gegevens alleen met:</p>
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>Bunny.net:</strong> Voor video-opslag en streaming (gegevens blijven in de EU)</li>
            <li><strong>Mollie:</strong> Voor betalingsverwerking</li>
            <li><strong>Google/Facebook:</strong> Alleen de OAuth authenticatie</li>
          </ul>
          <p>
            Wij verkopen je gegevens niet aan derden en gebruiken ze niet voor reclame van derden.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">5. Gegevensopslag</h2>
          <p>
            Je gegevens worden opgeslagen op servers binnen de Europese Unie. Video's worden opgeslagen 
            bij Bunny.net met datacenters in Europa.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">6. Bewaartermijn</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>Accountgegevens:</strong> Zolang je account actief is</li>
            <li><strong>Video's en clips:</strong> Tot je ze verwijdert of je account opheft</li>
            <li><strong>Transactiegegevens:</strong> 7 jaar (wettelijke verplichting)</li>
            <li><strong>Logbestanden:</strong> Maximaal 90 dagen</li>
          </ul>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">7. Je rechten</h2>
          <p>Onder de AVG heb je de volgende rechten:</p>
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>Inzage:</strong> Je kunt opvragen welke gegevens we van je hebben</li>
            <li><strong>Correctie:</strong> Je kunt onjuiste gegevens laten aanpassen</li>
            <li><strong>Verwijdering:</strong> Je kunt verzoeken om verwijdering van je gegevens</li>
            <li><strong>Overdracht:</strong> Je kunt je gegevens opvragen in een gangbaar formaat</li>
            <li><strong>Bezwaar:</strong> Je kunt bezwaar maken tegen bepaalde verwerkingen</li>
          </ul>
          <p>
            Om je rechten uit te oefenen, neem contact met ons op via e-mail.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">8. Cookies</h2>
          <p>
            DanceClips gebruikt alleen functionele cookies die noodzakelijk zijn voor de werking van de dienst:
          </p>
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>Authenticatie token:</strong> Om je ingelogd te houden (localStorage)</li>
          </ul>
          <p>
            Wij gebruiken geen tracking cookies of analytics van derden.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">9. Beveiliging</h2>
          <p>
            Wij nemen passende technische en organisatorische maatregelen om je gegevens te beschermen, 
            waaronder:
          </p>
          <ul class="list-disc pl-6 space-y-2">
            <li>Versleutelde verbindingen (HTTPS)</li>
            <li>Veilige authenticatie via OAuth</li>
            <li>Beperkte toegang tot persoonsgegevens</li>
          </ul>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">10. Wijzigingen</h2>
          <p>
            Wij kunnen deze privacyverklaring van tijd tot tijd aanpassen. Bij belangrijke wijzigingen 
            zullen wij je hiervan op de hoogte stellen.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">11. Contact</h2>
          <p>
            Voor vragen over deze privacyverklaring of om je rechten uit te oefenen, 
            neem contact op via e-mail.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">12. Klachten</h2>
          <p>
            Als je een klacht hebt over de verwerking van je persoonsgegevens, kun je deze indienen bij 
            de Autoriteit Persoonsgegevens (www.autoriteitpersoonsgegevens.nl).
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


