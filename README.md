# 💰 Tracker Spese

App per il tracciamento di spese, entrate e patrimonio.

## Requisiti

- **Node.js** versione 18 o superiore  
  Scarica da: https://nodejs.org

## Avvio rapido

1. Apri il terminale nella cartella del progetto
2. Installa le dipendenze (solo la prima volta):
   ```
   npm install
   ```
3. Avvia l'app in modalità sviluppo:
   ```
   npm run dev
   ```
4. Si apre automaticamente il browser su **http://localhost:3000**

## Build per produzione

Per creare una versione ottimizzata da distribuire:
```
npm run build
```
I file pronti si trovano nella cartella `dist/`.

Per testare la build in locale:
```
npm run preview
```

## Struttura del progetto

```
tracker-app/
├── index.html          # Pagina HTML principale
├── package.json        # Dipendenze e script
├── tsconfig.json       # Configurazione TypeScript
├── vite.config.ts      # Configurazione Vite
└── src/
    ├── main.tsx        # Entry point React
    └── App.tsx         # Tutta l'applicazione
```

## Note

- I dati vengono salvati nel **localStorage** del browser
- Per fare backup: Impostazioni → Dati → Backup JSON
- Per spostare i dati su un altro dispositivo: esporta il backup e importalo nel nuovo browser
