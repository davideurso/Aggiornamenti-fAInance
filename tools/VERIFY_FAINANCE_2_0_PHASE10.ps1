$ErrorActionPreference = "Stop"
$App = Split-Path $PSScriptRoot -Parent

function Need([string]$Relative) {
    $Path = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $Path -PathType Leaf)) { throw "File Phase 10 mancante: $Relative" }
    return $Path
}

function Require-Text([string]$Text, [string]$Needle, [string]$Message) {
    if ($Text.IndexOf($Needle, [StringComparison]::Ordinal) -lt 0) { throw $Message }
}

$Main = Get-Content -LiteralPath (Need "src\main.tsx") -Raw
$Handler = Get-Content -LiteralPath (Need "src\auth\EmailActionScreen.tsx") -Raw
$Auth = Get-Content -LiteralPath (Need "src\auth\authService.ts") -Raw
$Hosting = Get-Content -LiteralPath (Need "firebase.test-hosting.json") -Raw | ConvertFrom-Json
$Template = Get-Content -LiteralPath (Need "config\firebase-auth-test-email-template.json") -Raw | ConvertFrom-Json
$Configurator = Get-Content -LiteralPath (Need "tools\CONFIGURE_FAINANCE_TEST_EMAIL_VERIFICATION.ps1") -Raw
$HostingBuilder = Get-Content -LiteralPath (Need "tools\BUILD_FAINANCE_TEST_EMAIL_HOSTING.ps1") -Raw
$Index = Get-Content -LiteralPath (Need "index.html") -Raw

Require-Text $Main "isFainanceEmailActionUrl() ? <EmailActionScreen />" "Routing handler email non collegato al bootstrap"
Require-Text $Main "isFainanceTestRuntime && isFainanceEmailActionUrl()" "Handler email non isolato dal runtime Production"
foreach ($Token in @("applyActionCode", "checkActionCode", "verifyPasswordResetCode", "confirmPasswordReset")) {
    Require-Text $Handler $Token "Operazione Firebase mancante nel custom handler: $Token"
}
foreach ($Mode in @('mode === "verifyEmail"', 'mode === "recoverEmail"', 'mode === "resetPassword"')) {
    Require-Text $Handler $Mode "Modalita email non gestita: $Mode"
}
foreach ($Lang in @("it:", "en:", "es:", "fr:", "de:", "pt:", "pl:", "nl:", "ro:", "el:")) {
    Require-Text $Handler $Lang "Lingua handler mancante: $Lang"
}
Require-Text $Auth 'appEnvironment === "test"' "Continue URL non isolata per ambiente"
Require-Text $Auth 'firebaseConfig.projectId}.web.app/?emailVerified=1' "Continue URL Test Hosting mancante"

if ([string]$Hosting.hosting.site -ne "fainance-test-20260823195207") { throw "Hosting site Test inatteso" }
if ([string]$Hosting.hosting.public -ne "dist-test-hosting") { throw "Hosting Test non usa la build dedicata al routing profondo" }
if ([string]$Template.projectId -ne "fainance-test-20260823195207") { throw "Template collegato al progetto Test errato" }
if ([string]$Template.productionProjectId -ne "fainance-a7794") { throw "Guardia Production mancante" }
if ([string]$Template.callbackUri -ne "https://fainance-test-20260823195207.web.app/auth/action") { throw "Callback handler Test inattesa" }
if ([string]$Template.verifyEmailTemplate.senderDisplayName -ne "fAInance Test") { throw "Nome mittente Test errato" }
if ([string]$Template.verifyEmailTemplate.body -notmatch [regex]::Escape("%LINK%")) { throw "Placeholder email %LINK% mancante" }
if ([string]$Template.verifyEmailTemplate.body -notmatch "Verifica il mio indirizzo email") { throw "Pulsante HTML di verifica mancante" }

Require-Text $Configurator '$ExpectedTestProject = "fainance-test-20260823195207"' "Fail-closed project Test mancante"
Require-Text $Configurator '$ProductionProject = "fainance-a7794"' "Controllo Production mancante"
Require-Text $Configurator "RollbackPayload" "Backup template Firebase mancante"
Require-Text $Configurator "Set-TestEmailConfig" "Aggiornamento template Firebase mancante"
Require-Text $Configurator "Configurazione email Production cambiata" "Verifica non modifica Production mancante"
Require-Text $Configurator "RestoreFrom" "Rollback manuale Firebase Test mancante"
Require-Text $HostingBuilder '--base /' "Build Hosting Test priva di base assoluta"
Require-Text $HostingBuilder 'dist-test-hosting' "Directory Hosting Test dedicata mancante"
if ($Index -match "return 'Errore JavaScript durante l'avvio") { throw "Guardia bootstrap contiene apostrofo JavaScript non escapato" }

Write-Host "[OK] Handler email fAInance Test completo" -ForegroundColor Green
Write-Host "[OK] Verifica, recupero email e reset password gestiti" -ForegroundColor Green
Write-Host "[OK] Pagina handler localizzata in 10 lingue" -ForegroundColor Green
Write-Host "[OK] Template HTML e pulsante di conferma presenti" -ForegroundColor Green
Write-Host "[OK] Hosting, Firebase Test e rollback fail-closed isolati da Production" -ForegroundColor Green
