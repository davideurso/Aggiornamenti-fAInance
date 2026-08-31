$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

function Require-File([string]$Relative) {
    $full = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $full)) { throw "File Phase 10 mancante: $Relative" }
    return $full
}

$translationData = Require-File "src\i18n\translationData.ts"
$translations = Require-File "src\traduzioni.tsx"
$appFile = Require-File "src\app.tsx"
$sectionsFile = Require-File "src\sezioni.tsx"
$contacts = Require-File "src\native\contacts.ts"
$fallback = Require-File "src\utils\translationFallback.ts"
$main = Require-File "src\main.tsx"
$startTest = Require-File "tools\START_FAINANCE_TEST.ps1"

$dataText = [System.IO.File]::ReadAllText($translationData)
$runtimeText = [System.IO.File]::ReadAllText($translations)
$appText = [System.IO.File]::ReadAllText($appFile)
$sectionsText = [System.IO.File]::ReadAllText($sectionsFile)
$contactsText = [System.IO.File]::ReadAllText($contacts)
$mainText = [System.IO.File]::ReadAllText($main)
$startText = [System.IO.File]::ReadAllText($startTest)

if (!$dataText.Contains("export const TRANSLATIONS")) { throw "TRANSLATIONS non presente nel nuovo data module" }
if (!$runtimeText.Contains("export * from './i18n/translationData'")) { throw "Re-export translationData mancante" }
if ($runtimeText.Contains("export const TRANSLATIONS =")) { throw "TRANSLATIONS ancora duplicato in traduzioni.tsx" }
if (!$appText.Contains("./utils/translationFallback")) { throw "app.tsx non usa translationFallback condiviso" }
if (!$sectionsText.Contains("./utils/translationFallback")) { throw "sezioni.tsx non usa translationFallback condiviso" }
if (!$sectionsText.Contains("./native/contacts")) { throw "sezioni.tsx non usa il modulo contacts estratto" }
if ($sectionsText.Contains("async function getFainanceContactsPlugin()")) { throw "Blocco contatti ancora duplicato in sezioni.tsx" }
if (!$contactsText.Contains("export async function pickFainanceContact()")) { throw "Picker contatti non esportato" }
if (!$mainText.Contains("__FAINANCE_REACT_MOUNTED__")) { throw "Marker React mounted mancante" }
if (!$mainText.Contains("__FAINANCE_BOOT_FATAL__")) { throw "Marker fatal bootstrap mancante" }
if ($startText.Contains("Invoke-WebRequest")) { throw "START_FAINANCE_TEST usa ancora Invoke-WebRequest" }
if (!$startText.Contains("npm.cmd")) { throw "START_FAINANCE_TEST non avvia Vite tramite npm.cmd" }
if (!$startText.Contains('-WorkingDirectory $App')) { throw "START_FAINANCE_TEST non imposta WorkingDirectory esplicita" }
if ($startText.Contains("node_modules\vite\bin\vite.js")) { throw "START_FAINANCE_TEST usa ancora il percorso Vite diretto soggetto a quoting" }
if (!$startText.Contains("curl.exe")) { throw "Health-check curl fail-closed mancante" }

if ((Get-Item -LiteralPath $translationData).Length -lt 1000000) { throw "translationData.ts insolitamente piccolo" }
if ((Get-Item -LiteralPath $translations).Length -ge 3000000) { throw "traduzioni.tsx non risulta decomposto" }

Write-Host "[OK] Translation data separati dal runtime" -ForegroundColor Green
Write-Host "[OK] Translation fallback condiviso" -ForegroundColor Green
Write-Host "[OK] Contacts estratto da sezioni.tsx" -ForegroundColor Green
Write-Host "[OK] Bootstrap readiness markers attivi" -ForegroundColor Green
Write-Host "[OK] START_FAINANCE_TEST persistente e fail-closed" -ForegroundColor Green
