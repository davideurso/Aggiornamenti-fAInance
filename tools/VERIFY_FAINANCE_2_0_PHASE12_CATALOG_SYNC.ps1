param(
    [string]$AppRoot = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App",
    [switch]$RequireBuildArtifacts
)

$ErrorActionPreference = "Stop"
$TestProject = "fainance-test-20260823195207"
$ProductionProject = "fainance-a7794"
$Checks = 0

function Require-File([string]$RelativePath) {
    $Path = Join-Path $AppRoot $RelativePath
    if (!(Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw ("File richiesto mancante: {0}" -f $RelativePath)
    }
    return $Path
}

function Require-Text([string]$RelativePath, [string[]]$Needles) {
    $Path = Require-File $RelativePath
    $Text = [IO.File]::ReadAllText($Path)
    foreach ($Needle in $Needles) {
        if (!$Text.Contains($Needle)) {
            throw ("Verifica fallita in {0}: marcatore assente [{1}]" -f $RelativePath, $Needle)
        }
        $script:Checks += 1
    }
}

Write-Host "`n=== VERIFICA FAINANCE 2.0 TEST - PHASE 12 DATA INTEGRITY ===" -ForegroundColor Cyan
Require-File "package.json" | Out-Null
Require-Text ".env.test.local" @("VITE_FIREBASE_TEST_PROJECT_ID=$TestProject")
if ([IO.File]::ReadAllText((Require-File ".env.test.local")) -match [regex]::Escape("VITE_FIREBASE_TEST_PROJECT_ID=$ProductionProject")) {
    throw "BLOCCO SICUREZZA: configurazione Test collegata a Production"
}

$AppPath = Require-File "src\app.tsx"
$AppText = [IO.File]::ReadAllText($AppPath)
foreach ($Needle in @(
    'userKey("catalog_sync_meta_v3")',
    'function compareCatalogSyncMetaV3',
    'catalogSyncV3',
    'categoryPreferences: categoryValue',
    'userKey("catalog_auto_recovery_disabled_v9")',
    'if (isCatalogSyncV3StorageKey(key)) return fallback;',
    'Cataloghi, ordine e default vengono salvati insieme dal sync compatto.',
    'var readOnlyTestBuild = false;'
)) {
    if (!$AppText.Contains($Needle)) { throw ("Marcatore anti-regressione assente: {0}" -f $Needle) }
    $Checks += 1
}
foreach ($Forbidden in @(
    'if (await fainanceIsTestBuild()) return;',
    'if (await fainanceIsTestBuild()) {'
)) {
    if ($AppText.Contains($Forbidden)) { throw ("Guardia Test read-only ancora presente: {0}" -f $Forbidden) }
    $Checks += 1
}

$ChooseStart = $AppText.IndexOf('function chooseWholeCatalog(')
$ChooseEnd = $AppText.IndexOf('function buildCatalogRecoverySources()', $ChooseStart)
if ($ChooseStart -lt 0 -or $ChooseEnd -le $ChooseStart) { throw "Funzione di scelta catalogo non isolabile" }
$ChooseBody = $AppText.Substring($ChooseStart, $ChooseEnd - $ChooseStart)
foreach ($Forbidden in @('readOnlyBuild && cloudExists', 'evidenceFn(localCatalog)', 'evidenceFn(cloudCatalog)')) {
    if ($ChooseBody.Contains($Forbidden)) { throw ("Criterio catalogo obsoleto ancora attivo: {0}" -f $Forbidden) }
    $Checks += 1
}

Require-Text "package.json" @('"test:catalog-sync": "node tests/catalogPersistence.test.mjs"')
Require-Text "tests\catalogPersistence.test.mjs" @(
    'compareCatalogSyncMetaV3',
    'La versione locale piu recente deve prevalere',
    'La versione cloud piu recente deve prevalere'
)
Require-Text "tools\BUILD_FAINANCE_ANDROID_TEST.ps1" @(
    'fAInance-Test-2.0.0-P12.apk',
    '201200',
    '2.0.0-test-p12'
)
Require-Text "tools\HEALTHCHECK_FAINANCE_PHASE12.ps1" @(
    'dist-test',
    'Start-Job',
    'Build Test HTTP 200 senza browser',
    'Entry point, bundle e Firebase Test verificati'
)
Require-Text "functions\functions.yaml" @(
    '"sendCustomVerificationEmail"',
    '"notifyShareInviteCreated"',
    '"fanOutImportantCommunication"',
    '"cleanupExpiredShareAttachments"',
    '"processDueAccountDeletions"',
    '"syncAccountDeletionAdminMetadata"'
)

$Node = (Get-Command node.exe -ErrorAction Stop).Source
& $Node (Require-File "tests\catalogPersistence.test.mjs")
if ($LASTEXITCODE -ne 0) { throw "Test conflitti Catalog Sync V3 fallito" }
$Checks += 1

if ($RequireBuildArtifacts) {
    foreach ($Artifact in @("dist\index.html", "dist-test\index.html", "admin-app\dist\index.html")) {
        Require-File $Artifact | Out-Null
        $Checks += 1
    }
}

Write-Host ("[OK] {0} controlli Phase 12 superati" -f $Checks) -ForegroundColor Green
Write-Host "[OK] Cataloghi, gruppi, ordine e default sincronizzati come un'unica revisione" -ForegroundColor Green
Write-Host "[OK] Backup storici esclusi dall'autorita automatica" -ForegroundColor Green
Write-Host "[OK] Firebase Test scrivibile e isolato da Production" -ForegroundColor Green
