param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("test","production")]
    [string]$Environment
)

$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

if (!(Test-Path -LiteralPath (Join-Path $App "package.json"))) {
    throw "Progetto fAInance non trovato: $App"
}

Set-Location $App
$env:VITE_APP_ENV = $Environment
Write-Host "fAInance environment: $Environment" -ForegroundColor Cyan
Write-Host "Nota: TEST viene attivato solo se tutte le variabili VITE_FIREBASE_TEST_* sono configurate." -ForegroundColor Yellow
