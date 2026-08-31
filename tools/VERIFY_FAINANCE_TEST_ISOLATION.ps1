$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$ProductionProjectId = "fainance-a7794"
$EnvPath = Join-Path $App ".env.test.local"

function Read-EnvFile([string]$Path) {
    $result = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trim = $line.Trim()
        if (!$trim -or $trim.StartsWith("#") -or !$trim.Contains("=")) { continue }
        $parts = $trim.Split("=", 2)
        $result[$parts[0].Trim()] = $parts[1].Trim()
    }
    return $result
}

Write-Host "`n=== VERIFICA ISOLAMENTO FAINANCE TEST ===" -ForegroundColor Cyan

if (!(Test-Path -LiteralPath $EnvPath)) { throw ".env.test.local non trovato. Eseguire CONFIGURE_FAINANCE_TEST.ps1" }
$EnvMap = Read-EnvFile $EnvPath
$Required = @(
    "VITE_APP_ENV",
    "VITE_FIREBASE_TEST_API_KEY",
    "VITE_FIREBASE_TEST_AUTH_DOMAIN",
    "VITE_FIREBASE_TEST_PROJECT_ID",
    "VITE_FIREBASE_TEST_STORAGE_BUCKET",
    "VITE_FIREBASE_TEST_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_TEST_APP_ID"
)
foreach ($name in $Required) {
    if (!$EnvMap.ContainsKey($name) -or [string]::IsNullOrWhiteSpace([string]$EnvMap[$name])) {
        throw "Configurazione Test incompleta: $name"
    }
}
if ($EnvMap["VITE_APP_ENV"] -ne "test") { throw "VITE_APP_ENV non e impostato a test" }
$TestProjectId = [string]$EnvMap["VITE_FIREBASE_TEST_PROJECT_ID"]
if ($TestProjectId -eq $ProductionProjectId) { throw "BLOCCO SICUREZZA: Test punta a Production" }
if ($EnvMap["VITE_FIREBASE_TEST_AUTH_DOMAIN"] -notlike "*$TestProjectId*") { throw "authDomain Test non coerente con projectId" }

$BackendIsolation = Join-Path $App "src\config\backendIsolation.ts"
if (!(Test-Path -LiteralPath $BackendIsolation)) { throw "backendIsolation.ts mancante" }
$IsolationText = [System.IO.File]::ReadAllText($BackendIsolation)
if (!$IsolationText.Contains('TEST_ENVIRONMENT_POINTS_TO_PRODUCTION')) { throw "Guardia Test/Production non rilevata" }

Write-Host "[OK] Ambiente richiesto: TEST" -ForegroundColor Green
Write-Host "[OK] Firebase Test: $TestProjectId" -ForegroundColor Green
Write-Host "[OK] Firebase Production: $ProductionProjectId" -ForegroundColor Green
Write-Host "[OK] Test e Production sono separati" -ForegroundColor Green
