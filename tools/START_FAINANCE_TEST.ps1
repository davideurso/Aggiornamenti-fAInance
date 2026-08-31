param(
    [int]$Port = 5174,
    [int]$StartupTimeoutSeconds = 180,
    [int]$HttpRequestTimeoutSeconds = 15,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$Url = "http://127.0.0.1:$Port/"
$VerifyTool = Join-Path $App "tools\VERIFY_FAINANCE_TEST_ISOLATION.ps1"
$OutLog = Join-Path $App "vite-test.out.log"
$ErrLog = Join-Path $App "vite-test.err.log"
$PidFile = Join-Path $App ".vite-test.pid"

function Invoke-CheckedPowerShellScript([string]$ScriptPath) {
    if (!(Test-Path -LiteralPath $ScriptPath)) {
        throw "Script mancante: $ScriptPath"
    }

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath

    if ($LASTEXITCODE -ne 0) {
        throw "Script fallito: $ScriptPath (exit $LASTEXITCODE)"
    }
}

function Test-Http200([string]$TargetUrl) {
    $curl = (Get-Command curl.exe -ErrorAction Stop).Source
    $code = & $curl -s -o NUL -w "%{http_code}" --max-time $HttpRequestTimeoutSeconds $TargetUrl
    $curlExit = $LASTEXITCODE
    return (($curlExit -eq 0) -and ([string]$code -eq "200"))
}

function Show-ViteLogs {
    Write-Host "`n=== VITE STDOUT ===" -ForegroundColor Yellow
    if (Test-Path -LiteralPath $OutLog) {
        Get-Content -LiteralPath $OutLog -Tail 160 -ErrorAction SilentlyContinue
    }

    Write-Host "`n=== VITE STDERR ===" -ForegroundColor Yellow
    if (Test-Path -LiteralPath $ErrLog) {
        Get-Content -LiteralPath $ErrLog -Tail 160 -ErrorAction SilentlyContinue
    }
}

Write-Host "`n=== VERIFICA ISOLAMENTO FAINANCE TEST ===" -ForegroundColor Cyan
Invoke-CheckedPowerShellScript $VerifyTool

$EnvFile = Join-Path $App ".env.test.local"

if (!(Test-Path -LiteralPath $EnvFile)) {
    throw ".env.test.local non trovato"
}

$EnvText = [System.IO.File]::ReadAllText($EnvFile)

if ($EnvText -notmatch 'VITE_FIREBASE_TEST_PROJECT_ID=fainance-test-') {
    throw "Configurazione Firebase Test non valida"
}

if ($EnvText -match 'VITE_FIREBASE_TEST_PROJECT_ID=fainance-a7794') {
    throw "BLOCCO SICUREZZA: Test punta alla Production"
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

$existing = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)

if ($existing.Count -gt 0) {
    if (Test-Http200 $Url) {
        Write-Host "[OK] fAInance Test gia attiva: $Url" -ForegroundColor Green
        if (!$NoBrowser) { Start-Process $Url }
        exit 0
    }

    foreach ($connection in $existing) {
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds 2
}

Remove-Item -LiteralPath $OutLog,$ErrLog,$PidFile -Force -ErrorAction SilentlyContinue

Write-Host "`n=== AVVIO FAINANCE TEST ===" -ForegroundColor Cyan

# PREVENZIONE PERMANENTE:
# npm.cmd viene avviato direttamente con WorkingDirectory esplicita.
# Nessun percorso Vite/Node contenente spazi viene passato come argomento a Node.
$arguments = @(
    "run",
    "dev",
    "--",
    "--mode",
    "test",
    "--host",
    "127.0.0.1",
    "--port",
    [string]$Port,
    "--strictPort"
)

$process = Start-Process `
    -FilePath $npm `
    -ArgumentList $arguments `
    -WorkingDirectory $App `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Hidden `
    -PassThru

[System.IO.File]::WriteAllText(
    $PidFile,
    [string]$process.Id,
    (New-Object System.Text.UTF8Encoding($false))
)

$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
$attempt = 0

while ((Get-Date) -lt $deadline) {
    $attempt++
    Start-Sleep -Seconds 2

    $alive = Get-Process -Id $process.Id -ErrorAction SilentlyContinue

    if (!$alive) {
        Write-Host "[ERRORE] Il processo Vite Test si e arrestato (PID $($process.Id))." -ForegroundColor Red
        Show-ViteLogs
        throw "Avvio fAInance Test fallito: processo Vite terminato"
    }

    if (Test-Http200 $Url) {
        Write-Host "[OK] fAInance Test HTTP 200" -ForegroundColor Green
        Write-Host "[OK] Processo Vite persistente PID $($process.Id)" -ForegroundColor Green
        Write-Host "[OK] fAInance Test attiva: $Url" -ForegroundColor Green
        if (!$NoBrowser) { Start-Process $Url }
        exit 0
    }

    if (($attempt % 5) -eq 0) {
        $elapsed = $attempt * 2
        Write-Host "Attesa fAInance Test... ${elapsed}s" -ForegroundColor Yellow
    }
}

Write-Host "[ERRORE] fAInance Test non ha restituito HTTP 200 entro $StartupTimeoutSeconds secondi." -ForegroundColor Red
Show-ViteLogs
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
throw "Health-check fAInance Test fallito"
