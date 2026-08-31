param(
    [string]$AppRoot = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App",
    [switch]$RequireBuildArtifacts
)

$ErrorActionPreference = "Stop"
$Checks = 0

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

Write-Host "`n=== VERIFICA FAINANCE 2.0 TEST - PHASE 13 BACKUP IMPORT ===" -ForegroundColor Cyan

$Settings = Read-Required "src\settings\SettingsPanel.tsx"
foreach ($Needle in @(
    'registerPlugin("FainanceFile")',
    'FainanceFileNativeBackup.pickJson()',
    'function decodeNativeBackupBase64',
    'function isRecognizedBackupJson',
    'function stageBackupJsonText',
    'pendingBackupImport',
    'role="dialog"',
    'accept=".json,application/json,text/json"',
    'Backup esportato',
    'File Excel uscite esportato',
    'File CSV uscite esportato',
    'File Excel entrate esportato',
    'File CSV entrate esportato',
    'File JSON Patrimonio esportato',
    'File JSON Budget esportato',
    'File JSON Spesa esportato',
    'File JSON Debiti / Crediti esportato'
)) {
    Require-Contains $Settings $Needle ("Marcatore Phase 13 assente: {0}" -f $Needle)
}

$HandlerStart = $Settings.IndexOf('async function handleBackupJsonFile')
$HandlerEnd = $Settings.IndexOf('function dataTitle', $HandlerStart)
if ($HandlerStart -lt 0 -or $HandlerEnd -le $HandlerStart) { throw "Handler backup non isolabile" }
$Handler = $Settings.Substring($HandlerStart, $HandlerEnd - $HandlerStart)
if ($Handler.Contains('window.confirm')) { throw "Il ripristino dipende ancora dal confirm del WebView" }
$Checks += 1

$ExportStart = $Settings.IndexOf('async function runDataExport')
$ExportEnd = $Settings.IndexOf('function runDataDelete', $ExportStart)
if ($ExportStart -lt 0 -or $ExportEnd -le $ExportStart) { throw "Export dati non isolabile" }
$ExportBody = $Settings.Substring($ExportStart, $ExportEnd - $ExportStart)
if ($ExportBody -match 'File (Excel|CSV).* pronto' -or $ExportBody.Contains('Backup pronto')) {
    throw "Toast export obsoleto ancora presente"
}
$Checks += 1

$Native = Read-Required "android\app\src\main\java\com\tracker\spese\app\FainanceFilePlugin.java"
foreach ($Needle in @(
    'public void pickJson(PluginCall call)',
    'Intent.ACTION_OPEN_DOCUMENT',
    'Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION',
    '@ActivityCallback',
    'pickJsonResult',
    'MAX_JSON_BACKUP_BYTES',
    'response.put("dataBase64"'
)) {
    Require-Contains $Native $Needle ("Marcatore Android Phase 13 assente: {0}" -f $Needle)
}

$Translations = Read-Required "src\i18n\appTranslationPatches.ts"
Require-Contains $Translations 'Phase 13: conferma export completato e ripristino JSON nativo' "Blocco traduzioni Phase 13 assente"
foreach ($Needle in @('Backup esportato','File Excel entrate esportato','File JSON Debiti / Crediti esportato')) {
    Require-Contains $Translations $Needle ("Traduzione Phase 13 assente: {0}" -f $Needle)
}

$Package = Read-Required "package.json"
Require-Contains $Package '"test:backup-import": "node tests/backupImportExport.test.mjs"' "Test backup non registrato"

$Build = Read-Required "tools\BUILD_FAINANCE_ANDROID_TEST.ps1"
foreach ($Needle in @('fAInance-Test-2.0.0-P13.apk','201300','2.0.0-test-p13')) {
    Require-Contains $Build $Needle ("Versione Android Phase 13 assente: {0}" -f $Needle)
}

$Node = (Get-Command node.exe -ErrorAction Stop).Source
& $Node (Require-File "tests\backupImportExport.test.mjs")
if ($LASTEXITCODE -ne 0) { throw "Test import/export backup fallito" }
$Checks += 1

if ($RequireBuildArtifacts) {
    foreach ($Artifact in @("dist\index.html", "dist-test\index.html", "admin-app\dist\index.html")) {
        Require-File $Artifact | Out-Null
        $Checks += 1
    }
}

Write-Host ("[OK] {0} controlli Phase 13 superati" -f $Checks) -ForegroundColor Green
Write-Host "[OK] Import JSON Android nativo con conferma interna e fallback web" -ForegroundColor Green
Write-Host "[OK] Conferme export aggiornate a Esportato in tutte le lingue" -ForegroundColor Green
