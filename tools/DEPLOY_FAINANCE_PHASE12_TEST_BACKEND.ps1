param([switch]$ConfirmTestDeploy)

$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$TestProject = "fainance-test-20260823195207"
$ProductionProject = "fainance-a7794"

if (!$ConfirmTestDeploy) { throw "Deploy bloccato: specificare -ConfirmTestDeploy" }
if ($TestProject -eq $ProductionProject) { throw "Deploy bloccato: Test e Production coincidono" }

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $App "tools\VERIFY_FAINANCE_TEST_ISOLATION.ps1")
if ($LASTEXITCODE -ne 0) { throw "Verifica isolamento Test fallita" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $App "tools\VERIFY_FAINANCE_2_0_PHASE11.ps1")
if ($LASTEXITCODE -ne 0) { throw "Verifier funzionalita Phase 11 fallito" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $App "tools\VERIFY_FAINANCE_2_0_PHASE12_CATALOG_SYNC.ps1")
if ($LASTEXITCODE -ne 0) { throw "Verifier integrita Phase 12 fallito" }

$SecretMetadata = & gcloud secrets describe RESEND_API_KEY --project=$TestProject --format="value(name)" 2>$null
if ($LASTEXITCODE -ne 0 -or ![string]$SecretMetadata) {
    throw "Deploy bloccato: RESEND_API_KEY non configurata nel vault Firebase Test. Nessun segreto viene copiato automaticamente da Production."
}

$Functions = @(
    "sendCustomVerificationEmail",
    "notifyShareInviteCreated",
    "fanOutImportantCommunication",
    "cleanupExpiredShareAttachments",
    "processDueAccountDeletions",
    "syncAccountDeletionAdminMetadata"
)
$Only = "firestore:rules," + (($Functions | ForEach-Object { "functions:" + $_ }) -join ",")
& firebase deploy --project $TestProject --config (Join-Path $App "firebase.json") --only $Only --non-interactive
if ($LASTEXITCODE -ne 0) { throw "Deploy backend Firebase Test fallito" }

Write-Host "[OK] Regole e sei funzioni pubblicate esclusivamente su Firebase Test" -ForegroundColor Green
