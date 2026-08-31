param(
    [switch]$ConfirmTestDeploy
)

$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$TestProject = "fainance-test-20260823195207"
$ProductionProject = "fainance-a7794"
$FunctionNames = @(
    "sendCustomVerificationEmail",
    "notifyShareInviteCreated",
    "fanOutImportantCommunication",
    "cleanupExpiredShareAttachments",
    "processDueAccountDeletions",
    "syncAccountDeletionAdminMetadata"
)

if (!$ConfirmTestDeploy) {
    throw "Deploy bloccato: specificare -ConfirmTestDeploy dopo le verifiche locali."
}
if (!(Test-Path -LiteralPath (Join-Path $App "firebase.json") -PathType Leaf)) {
    throw "Progetto fAInance non trovato"
}

$EnvironmentText = [IO.File]::ReadAllText((Join-Path $App ".env.test.local"))
if ($EnvironmentText -notmatch [regex]::Escape("VITE_FIREBASE_TEST_PROJECT_ID=$TestProject")) {
    throw "Configurazione Test inattesa"
}
if ($EnvironmentText -match [regex]::Escape("VITE_FIREBASE_TEST_PROJECT_ID=$ProductionProject")) {
    throw "BLOCCO SICUREZZA: configurazione Test collegata a Production"
}

$FirebaseConfig = Get-Content -LiteralPath (Join-Path $App "firebase.json") -Raw | ConvertFrom-Json
if ([string]$FirebaseConfig.firestore.rules -ne "firestore_share_rules_1.3.25.rules") {
    throw "File regole Firebase inatteso"
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $App "tools\VERIFY_FAINANCE_TEST_ISOLATION.ps1")
if ($LASTEXITCODE -ne 0) { throw "Verifica isolamento Test fallita" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $App "tools\VERIFY_FAINANCE_2_0_PHASE11.ps1")
if ($LASTEXITCODE -ne 0) { throw "Verifier Phase 11 fallito" }

$Firebase = (Get-Command firebase.cmd -ErrorAction Stop).Source
$FunctionsSelector = @($FunctionNames | ForEach-Object { "functions:" + $_ }) -join ","
$Only = "firestore:rules," + $FunctionsSelector

Write-Host "`n=== DEPLOY BACKEND FAINANCE TEST - PHASE 11 ===" -ForegroundColor Cyan
Write-Host ("Progetto autorizzato: {0}" -f $TestProject) -ForegroundColor Green
& $Firebase deploy --project $TestProject --config (Join-Path $App "firebase.json") --only $Only --non-interactive
if ($LASTEXITCODE -ne 0) { throw "Deploy backend Firebase Test fallito" }

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $App "tools\VERIFY_FAINANCE_TEST_ISOLATION.ps1")
if ($LASTEXITCODE -ne 0) { throw "Isolamento post-deploy fallito" }
Write-Host "[OK] Regole e sei funzioni Phase 11 pubblicate esclusivamente su Firebase Test" -ForegroundColor Green
