param(
    [ValidateSet("production", "test")]
    [string]$Environment = "production",
    [string]$Email = "",
    [string]$ServiceAccountPath = ""
)

$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$Tools = Join-Path $App "admin-tools"
$Download = Join-Path $env:USERPROFILE "Downloads"
$ExpectedProject = if ($Environment -eq "production") { "fainance-a7794" } else { "" }

function Find-ServiceAccount {
    $candidates = Get-ChildItem $Download -Filter "*.json" -File -ErrorAction SilentlyContinue | Where-Object {
        try {
            $j = Get-Content $_.FullName -Raw | ConvertFrom-Json
            $j.type -eq "service_account" -and $j.project_id
        } catch { $false }
    } | Sort-Object LastWriteTime -Descending

    if ($ExpectedProject) {
        $matching = @($candidates | Where-Object {
            try { (Get-Content $_.FullName -Raw | ConvertFrom-Json).project_id -eq $ExpectedProject } catch { $false }
        })
        if ($matching.Count -eq 1) { return $matching[0].FullName }
        if ($matching.Count -gt 1) { return $matching[0].FullName }
    }
    if (@($candidates).Count -eq 1) { return @($candidates)[0].FullName }
    return ""
}

try {
    Write-Host "`n=== BOOTSTRAP FAINANCE SUPERADMIN ===" -ForegroundColor Cyan
    if (!(Test-Path (Join-Path $Tools "bootstrap-superadmin.mjs"))) { throw "Phase 6 non installata: admin-tools mancante" }

    if (!$Email) { $Email = Read-Host "Email dell'account fAInance da rendere Superadmin" }
    if (!$Email -or $Email -notmatch "@") { throw "Email non valida" }

    if (!$ServiceAccountPath) { $ServiceAccountPath = Find-ServiceAccount }
    if (!$ServiceAccountPath) {
        Write-Host "Nessuna chiave Service Account Firebase rilevata automaticamente in Downloads." -ForegroundColor Yellow
        $ServiceAccountPath = Read-Host "Percorso completo del file JSON Service Account"
    }
    if (!(Test-Path -LiteralPath $ServiceAccountPath)) { throw "File Service Account non trovato: $ServiceAccountPath" }

    Set-Location $Tools
    if (!(Test-Path (Join-Path $Tools "node_modules\firebase-admin"))) {
        Write-Host "Installazione dipendenze Admin Tools..." -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install admin-tools fallito" }
    }

    node (Join-Path $Tools "bootstrap-superadmin.mjs") $ServiceAccountPath $Email $ExpectedProject
    if ($LASTEXITCODE -ne 0) { throw "Bootstrap Superadmin fallito" }

    Write-Host "`nSUPERADMIN CONFIGURATO CORRETTAMENTE" -ForegroundColor Green
}
catch {
    Write-Host "`nBOOTSTRAP SUPERADMIN INTERROTTO" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
