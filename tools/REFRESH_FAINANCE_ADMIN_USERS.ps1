param(
    [string]$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
)

$ErrorActionPreference = "Stop"
$ProjectId = "fainance-a7794"
$Tools = Join-Path $App "admin-tools"
$Indexer = Join-Path $Tools "index-admin-users.mjs"
$Download = Join-Path $env:USERPROFILE "Downloads"

function Find-ServiceAccount {
    $candidates = Get-ChildItem -LiteralPath $Download -Filter *.json -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending
    foreach ($file in $candidates) {
        try {
            $json = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
            if ($json.type -eq "service_account" -and $json.project_id -eq $ProjectId) {
                return $file.FullName
            }
        } catch { }
    }
    return $null
}

try {
    Write-Host "`n=== fAInance Admin - Refresh utenti ===" -ForegroundColor Cyan
    if (!(Test-Path -LiteralPath $Indexer)) { throw "Indexer Admin non trovato: $Indexer" }
    if (!(Test-Path -LiteralPath (Join-Path $Tools "package.json"))) { throw "admin-tools\package.json non trovato" }

    $serviceAccount = Find-ServiceAccount
    if (!$serviceAccount) { throw "Service Account Firebase Production ($ProjectId) non trovata in Downloads." }
    Write-Host "[OK] Service Account: $serviceAccount" -ForegroundColor Green

    Set-Location -LiteralPath $Tools
    if (!(Test-Path -LiteralPath (Join-Path $Tools "node_modules\firebase-admin"))) {
        Write-Host "Installazione dipendenze admin-tools..." -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install admin-tools fallito" }
    }

    $env:GOOGLE_APPLICATION_CREDENTIALS = $serviceAccount
    node $Indexer
    if ($LASTEXITCODE -ne 0) { throw "Refresh indice utenti fallito" }

    Write-Host "`n[OK] INDICE UTENTI AGGIORNATO" -ForegroundColor Green
}
catch {
    Write-Host "`nREFRESH UTENTI INTERROTTO" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
