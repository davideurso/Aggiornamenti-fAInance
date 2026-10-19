import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: './',
  plugins: [react({ jsxImportSource: '@fainance/icons' })],
  resolve: { alias: { '@fainance/icons': fileURLToPath(new URL('./src/icons/runtime', import.meta.url)) } },
  build: {
    outDir: 'dist',

    // FIX 2.0.6 — Prima era true. Le sourcemap finivano dentro APK e IPA, gonfiando
    // il pacchetto e rendendo il sorgente leggibile a chiunque lo aprisse.
    // Per indagare un problema si puo' rimetterla a true in una build locale.
    sourcemap: false,

    rollupOptions: {
      output: {
        // FIX 2.1.2 — RIPRISTINATO a true.
        //
        // Nel batch 06 l'avevo rimosso per attivare il code splitting, con l'idea di
        // preparare il caricamento pigro delle traduzioni. Effetto collaterale non
        // previsto: con @capacitor/* in un chunk separato, registerPlugin veniva
        // valutato prima che il bridge nativo fosse pronto, ricadeva
        // sull'implementazione web (che non esiste) e rispondeva "Unimplemented".
        // Da qui i documenti che non si aprivano piu' sul dispositivo.
        //
        // Con inlineDynamicImports tutto torna in un file unico, con ordine di
        // valutazione deterministico: e' la configurazione con cui i plugin nativi
        // funzionavano.
        //
        // Il code splitting servira' quando si affrontera' il caricamento delle
        // traduzioni per lingua, ma andra' riattivato con cura, escludendo
        // @capacitor/* dalla suddivisione e verificando i plugin nativi sul
        // dispositivo prima di procedere.
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
})
