BASELINE 1.2.9 LOGIN TEST

Questo pacchetto serve SOLO a verificare se la versione dove il login funzionava funziona ancora oggi.
Non contiene i widget iOS e non contiene le patch successive sul login.

Contiene:
- src/app.tsx, src/core.tsx, src/main.tsx, src/sezioni.tsx, src/statistiche.tsx, src/traduzioni.tsx, src/widget.tsx, src/financeCalculations.* dalla 1.2.9 stabile
- ios/ dalla cartella iOS funzionante 150
- capacitor.config.ts, package.json, package-lock.json dalla cartella iOS funzionante 150
- codemagic.yaml basato sulla versione funzionante, con sola modifica a APP_VERSION=1.6.60 e email success=false

Uso consigliato: creare una branch separata, non lavorare su main.
