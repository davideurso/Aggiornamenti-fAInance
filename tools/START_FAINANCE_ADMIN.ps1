param(
    [string]$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App",
    [int]$Port = 5173,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$Admin = Join-Path $App "admin-app"
$Package = Join-Path $Admin "package.json"
$Url = "http://127.0.0.1:$Port/"

function Test-AdminHttp {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    } catch { return $false }
}

try {
    Write-Host "`n=== Avvio fAInance Admin ===" -ForegroundColor Cyan
    if (!(Test-Path -LiteralPath $Package)) { throw "package.json Admin non trovato: $Package" }
    $pkg = Get-Content -LiteralPath $Package -Raw | ConvertFrom-Json
    if (!$pkg.scripts.dev) { throw "Script npm 'dev' non presente in admin-app\package.json" }

    if (Test-AdminHttp) {
        Write-Host "[OK] Admin gia attiva: $Url" -ForegroundColor Green
        if (!$NoBrowser) { Start-Process $Url }
        exit 0
    }

    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop
        Start-Sleep -Seconds 1
    }

    if (!(Test-Path -LiteralPath (Join-Path $Admin "node_modules"))) {
        Set-Location -LiteralPath $Admin
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install Admin fallito" }
    }

    $command = "Set-Location -LiteralPath '$Admin'; npm run dev -- --host 127.0.0.1 --port $Port --strictPort"
    Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $command) | Out-Null

    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-AdminHttp) { $ready = $true; break }
    }
    if (!$ready) { throw "Server Admin non raggiungibile dopo 30 secondi su $Url" }

    Write-Host "[OK] FAINANCE ADMIN ATTIVA - HTTP 200" -ForegroundColor Green
    Write-Host $Url -ForegroundColor Cyan
    if (!$NoBrowser) { Start-Process $Url }
}
catch {
    Write-Host "`nAVVIO ADMIN INTERROTTO" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
