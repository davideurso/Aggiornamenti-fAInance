$ErrorActionPreference = "Stop"

$App = Split-Path $PSScriptRoot -Parent
$Files = @{
    App = Join-Path $App "src\app.tsx"
    Account = Join-Path $App "src\account\AccountScreens.tsx"
    Auth = Join-Path $App "src\auth\authService.ts"
    Settings = Join-Path $App "src\settings\SettingsPanel.tsx"
    Translations = Join-Path $App "src\traduzioni.tsx"
    Manifest = Join-Path $App "android\app\src\main\AndroidManifest.xml"
}

function Require-File([string]$Path) {
    if (!(Test-Path -LiteralPath $Path -PathType Leaf)) { throw "File mancante: $Path" }
}

function Require-Text([string]$Source, [string]$Needle, [string]$Message) {
    if ($Source.IndexOf($Needle, [StringComparison]::Ordinal) -lt 0) { throw $Message }
}

foreach ($Path in $Files.Values) { Require-File $Path }
$AppSource = Get-Content -LiteralPath $Files.App -Raw
$AccountSource = Get-Content -LiteralPath $Files.Account -Raw
$AuthSource = Get-Content -LiteralPath $Files.Auth -Raw
$SettingsSource = Get-Content -LiteralPath $Files.Settings -Raw
$TranslationsSource = Get-Content -LiteralPath $Files.Translations -Raw
$ManifestSource = Get-Content -LiteralPath $Files.Manifest -Raw

Require-Text $AppSource 'b.type = b.type || "error"' "Il toast globale sovrascrive ancora il tipo esplicito"
Require-Text $AppSource 'b.color = b.color || (b.type === "warning" ? "#FFD84D" : "#E24B4A")' "Priorita del giallo esplicito non trovata"
Require-Text $AppSource 'fainance_registration_pending_email_v1' "Blocco transitorio account non verificato non trovato"

Require-Text $SettingsSource 'function readBackupJsonFileWithReader(file)' "Fallback FileReader backup non trovato"
Require-Text $SettingsSource 'var text = await readBackupJsonFile(f)' "Lettura asincrona robusta backup non trovata"
Require-Text $SettingsSource 'input.value = ""' "Reset finale input backup non trovato"
$ReadAt = $SettingsSource.IndexOf('var text = await readBackupJsonFile(f)', [StringComparison]::Ordinal)
$ResetAt = $SettingsSource.IndexOf('input.value = ""', $ReadAt, [StringComparison]::Ordinal)
if ($ReadAt -lt 0 -or $ResetAt -lt $ReadAt) { throw "Il selettore file viene azzerato prima della lettura Android" }

Require-Text $AccountSource 'justifyContent: mode === "register" ? "flex-start" : "center"' "Registrazione non ancorata in alto"
Require-Text $AccountSource 'height: "100dvh"' "Viewport registrazione non vincolato"
Require-Text $AccountSource 'WebkitOverflowScrolling: "touch"' "Scroll touch registrazione non trovato"
Require-Text $AccountSource 'max(env(safe-area-inset-top, 0px), 34px)' "Area sicura Android registrazione non trovata"
Require-Text $AccountSource 'fainance_registration_notice_v1' "Messaggio persistente verifica email non trovato"

Require-Text $AuthSource 'firebaseConfig.authDomain' "Dominio Firebase dell'ambiente non usato per la verifica email"
Require-Text $AuthSource 'handleCodeInApp: false' "Configurazione email verification mancante"
if ($AuthSource.IndexOf('window.location.origin', [StringComparison]::Ordinal) -ge 0) {
    throw "La verifica email usa ancora l'origine locale del WebView"
}

Require-Text $TranslationsSource 'Account created. We sent you an email verification link' "Traduzioni messaggio verifica email mancanti"
Require-Text $TranslationsSource 'Ο λογαριασμός δημιουργήθηκε.' "Copertura delle dieci lingue non completa"
Require-Text $ManifestSource 'android:windowSoftInputMode="adjustResize"' "Ridimensionamento Android con tastiera non configurato"

Write-Host "[OK] Ripristino JSON Android: lettura robusta e reset finale" -ForegroundColor Green
Write-Host "[OK] Popup limite valuta: giallo esplicito preservato" -ForegroundColor Green
Write-Host "[OK] Registrazione: area sicura, scroll touch e tastiera" -ForegroundColor Green
Write-Host "[OK] Verifica email: dominio Test/Production isolato e messaggio persistente" -ForegroundColor Green
Write-Host "[OK] Traduzioni supportate preservate" -ForegroundColor Green
