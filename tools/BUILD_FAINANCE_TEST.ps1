$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$VerifyTool = Join-Path $App "tools\VERIFY_FAINANCE_TEST_ISOLATION.ps1"

if (!(Test-Path -LiteralPath $VerifyTool)) { throw "VERIFY_FAINANCE_TEST_ISOLATION.ps1 mancante" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $VerifyTool
if ($LASTEXITCODE -ne 0) { throw "Verifica isolamento Test fallita (exit $LASTEXITCODE)" }

Set-Location -LiteralPath $App
Write-Host "`n=== BUILD FAINANCE TEST ===" -ForegroundColor Cyan
& npx.cmd vite build --mode test --outDir dist-test
if ($LASTEXITCODE -ne 0) { throw "Build fAInance Test fallita (exit $LASTEXITCODE)" }
if (!(Test-Path -LiteralPath (Join-Path $App "dist-test\index.html"))) { throw "dist-test\index.html non prodotto" }
Write-Host "[OK] Build Test: $App\dist-test" -ForegroundColor Green
