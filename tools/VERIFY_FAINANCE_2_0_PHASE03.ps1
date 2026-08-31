$ErrorActionPreference = "Stop"

$App = Split-Path -Parent $PSScriptRoot

function Require-File([string]$Path,[string]$Message) {
    if (!(Test-Path -LiteralPath $Path)) { throw $Message }
}

function Require-Text([string]$Path,[string]$Pattern,[string]$Message) {
    $content = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    if ($content -notmatch $Pattern) { throw $Message }
}

Write-Host "`n=== VERIFY FAINANCE 2.0 PHASE 03 ===" -ForegroundColor Cyan

$AccountScreens = Join-Path $App "src\account\AccountScreens.tsx"
$AuthService = Join-Path $App "src\auth\authService.ts"
$AccountSession = Join-Path $App "src\auth\accountSession.ts"
$ProfileService = Join-Path $App "src\profile\profileService.ts"
$ProfileTypes = Join-Path $App "src\profile\types.ts"
$Widget = Join-Path $App "src\widget.tsx"

Require-File $AccountScreens "AccountScreens.tsx mancante"
Require-File $AuthService "authService.ts mancante"
Require-File $AccountSession "accountSession.ts mancante"
Require-File $ProfileService "profileService.ts mancante"
Require-File $ProfileTypes "types.ts mancante"
Require-File $Widget "widget.tsx mancante"

Require-Text $AuthService "sendAccountEmailVerification" "Validazione email non trovata in authService.ts"
Require-Text $AccountScreens "Reinvia email di verifica" "UI reinvio verifica email non trovata"
Require-Text $AccountScreens "Username" "Campo username non trovato nella UI account"
Require-Text $AccountScreens "newsletter" "Gestione newsletter non trovata nella UI account"
Require-Text $ProfileService "saveUsernameForUser" "Persistenza username non trovata in profileService.ts"
Require-Text $AccountSession "newsletterConsent" "Sessione account non aggiornata con newsletterConsent"
Require-Text $ProfileTypes "newsletterConsent\?: boolean;" "Tipizzazione newsletterConsent non trovata"
Require-Text $Widget "Math\.max\(20,Math\.round\(iconSize\*0\.62\)\)" "Nuova icona calcolatrice non trovata"
Require-Text $Widget "#335D9A" "Nuovo contrasto icona calcolatrice non trovato"

Write-Host "[OK] Phase 03 verificata" -ForegroundColor Green
