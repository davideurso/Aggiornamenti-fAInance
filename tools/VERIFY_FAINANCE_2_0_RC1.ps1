param(
    [string]$AppRoot = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App",
    [switch]$RequireBuildArtifacts
)

$ErrorActionPreference = "Stop"
$Checks = 0
$ExpectedCapacitorVersion = "8.5.0"
$AlignedPackages = @(
    "@capacitor/android",
    "@capacitor/cli",
    "@capacitor/core",
    "@capacitor/ios"
)

function Require-File([string]$RelativePath) {
    $Path = Join-Path $AppRoot $RelativePath
    if (!(Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw ("File richiesto mancante: {0}" -f $RelativePath)
    }
    return $Path
}

function Read-Required([string]$RelativePath) {
    return [IO.File]::ReadAllText((Require-File $RelativePath))
}

function Require-Contains([string]$Text,[string]$Needle,[string]$Message) {
    if (!$Text.Contains($Needle)) { throw $Message }
    $script:Checks += 1
}

function Invoke-Checked([scriptblock]$Command,[string]$Message) {
    & $Command
    if ($LASTEXITCODE -ne 0) { throw ("{0}: exit {1}" -f $Message,$LASTEXITCODE) }
    $script:Checks += 1
}

Write-Host "`n=== VERIFICA FAINANCE 2.0 TEST - RC1 ===" -ForegroundColor Cyan

$Package = Read-Required "package.json" | ConvertFrom-Json
Require-File "package-lock.json" | Out-Null

foreach ($Name in $AlignedPackages) {
    $Declared = [string]$Package.dependencies.PSObject.Properties[$Name].Value
    if ($Declared -ne $ExpectedCapacitorVersion) {
        throw ("Dipendenza Capacitor non allineata: {0} (package={1})" -f $Name,$Declared)
    }
    $Checks += 1
}

$ViteTypes = Read-Required "src\vite-env.d.ts"
foreach ($Needle in @('reference types="vite/client"','declare module "*.png"','__fainancePendingWidgetRoute')) {
    Require-Contains $ViteTypes $Needle ("Dichiarazione TypeScript RC assente: {0}" -f $Needle)
}

$TranslationPatches = Read-Required "src\i18n\appTranslationPatches.ts"
foreach ($Needle in @('FAINANCE_I18N_PHRASES','FAINANCE_UI_TRANSLATIONS','let fainanceTranslationCache: Record<string, unknown> = {};')) {
    Require-Contains $TranslationPatches $Needle ("Correzione TypeScript traduzioni assente: {0}" -f $Needle)
}

$Build = Read-Required "tools\BUILD_FAINANCE_ANDROID_TEST.ps1"
foreach ($Needle in @('fAInance-Test-2.0.0-RC1.apk','202001','2.0.0-test-rc1')) {
    Require-Contains $Build $Needle ("Versione Android RC1 assente: {0}" -f $Needle)
}

Require-File "tests\releaseCandidate.test.mjs" | Out-Null
Require-File "tests\typescriptBaseline.test.mjs" | Out-Null
Require-File "tests\typescriptLegacyBaseline.json" | Out-Null

Push-Location $AppRoot
try {
    Invoke-Checked { & npm.cmd run test:release-rc } "Regressione RC fallita"
    Invoke-Checked { & npm.cmd ls @capacitor/core @capacitor/android @capacitor/cli @capacitor/ios --depth=0 } "Albero Capacitor non valido"

    $AuditOk = $false
    for ($Attempt = 1; $Attempt -le 3 -and !$AuditOk; $Attempt++) {
        & npm.cmd audit --omit=dev --audit-level=high
        if ($LASTEXITCODE -eq 0) { $AuditOk = $true; break }
        if ($Attempt -lt 3) { Start-Sleep -Seconds (2 * $Attempt) }
    }
    if (!$AuditOk) { throw "Audit dipendenze runtime fallito dopo 3 tentativi" }
    $Checks += 1
} finally {
    Pop-Location
}

if ($RequireBuildArtifacts) {
    foreach ($Artifact in @("dist\index.html", "dist-test\index.html", "admin-app\dist\index.html")) {
        Require-File $Artifact | Out-Null
        $Checks += 1
    }
}

Write-Host ("[OK] {0} controlli RC1 superati" -f $Checks) -ForegroundColor Green
Write-Host "[OK] Capacitor ufficiale allineato alla versione 8.5.0" -ForegroundColor Green
Write-Host "[OK] Nessuna vulnerabilita alta o critica nelle dipendenze runtime" -ForegroundColor Green
Write-Host "[OK] Debito TypeScript storico ridotto e protetto da limite fail-closed" -ForegroundColor Green
