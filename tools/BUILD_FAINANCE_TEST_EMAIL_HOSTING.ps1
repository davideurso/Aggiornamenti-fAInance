$ErrorActionPreference = "Stop"
$App = Split-Path $PSScriptRoot -Parent
$VerifyTool = Join-Path $App "tools\VERIFY_FAINANCE_TEST_ISOLATION.ps1"
$Output = Join-Path $App "dist-test-hosting"

if (!(Test-Path -LiteralPath $VerifyTool -PathType Leaf)) { throw "VERIFY_FAINANCE_TEST_ISOLATION.ps1 mancante" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $VerifyTool
if ($LASTEXITCODE -ne 0) { throw "Verifica isolamento Test fallita (exit $LASTEXITCODE)" }

Set-Location -LiteralPath $App
Write-Host "`n=== BUILD HOSTING EMAIL FAINANCE TEST ===" -ForegroundColor Cyan
& npx.cmd vite build --mode test --outDir dist-test-hosting --base /
if ($LASTEXITCODE -ne 0) { throw "Build Hosting Test fallita (exit $LASTEXITCODE)" }

$Index = Join-Path $Output "index.html"
if (!(Test-Path -LiteralPath $Index -PathType Leaf)) { throw "dist-test-hosting\index.html non prodotto" }
$Html = Get-Content -LiteralPath $Index -Raw
if ($Html -notmatch 'src="/assets/') { throw "La build Hosting Test non usa asset assoluti" }
if ($Html -match 'src="\./assets/') { throw "La build Hosting Test contiene asset relativi incompatibili con /auth/action" }
Write-Host "[OK] Build Hosting Test con routing profondo: $Output" -ForegroundColor Green
