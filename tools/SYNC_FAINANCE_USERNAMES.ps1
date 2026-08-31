$ErrorActionPreference = "Stop"

$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$Tools = Join-Path $App "admin-tools"
$Script = Join-Path $Tools "sync-usernames.mjs"
$Download = Join-Path $env:USERPROFILE "Downloads"

function Find-ServiceAccount {
    $candidate = Get-ChildItem -LiteralPath $Download -Filter "*.json" -File -ErrorAction SilentlyContinue |
        Where-Object {
            try {
                $j = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
                $j.type -eq "service_account" -and $j.project_id -eq "fainance-a7794"
            } catch { $false }
        } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (!$candidate) { throw "Service Account Firebase fainance-a7794 non trovata in Downloads" }
    return $candidate.FullName
}

try {
    Write-Host "`n=== Sync Username fAInance ===" -ForegroundColor Cyan
    if (!(Test-Path -LiteralPath $Script)) { throw "Script username non trovato: $Script" }
    if (!(Test-Path -LiteralPath (Join-Path $Tools "node_modules\firebase-admin"))) { throw "firebase-admin non installato in admin-tools" }

    $ServiceAccount = Find-ServiceAccount
    $env:GOOGLE_APPLICATION_CREDENTIALS = $ServiceAccount
    Set-Location -LiteralPath $Tools
    node $Script
    if ($LASTEXITCODE -ne 0) { throw "Sync username fallito" }
    Write-Host "[OK] USERNAME REGISTRY SINCRONIZZATO" -ForegroundColor Green
}
catch {
    Write-Host "`nSYNC USERNAME INTERROTTO" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
