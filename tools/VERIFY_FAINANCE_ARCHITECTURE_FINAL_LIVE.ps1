$ErrorActionPreference = "Stop"

$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

function Need([string]$Relative) {
    $Path = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $Path)) { throw ("File mancante: {0}" -f $Relative) }
    return $Path
}

function Text([string]$Relative) {
    return [System.IO.File]::ReadAllText((Need $Relative))
}

function Must([string]$Value,[string]$Pattern,[string]$Message) {
    if ($Value -notmatch $Pattern) { throw $Message }
}

function MustNot([string]$Value,[string]$Pattern,[string]$Message) {
    if ($Value -match $Pattern) { throw $Message }
}

Write-Host "`n=== VERIFICA ARCHITETTURA FAINANCE FINALE ===" -ForegroundColor Cyan

$AppText = Text "src\app.tsx"
$SezioniText = Text "src\sezioni.tsx"
$SensitiveText = Text "src\security\sensitiveStorage.ts"
$RulesText = Text "firestore_share_rules_1.3.25.rules"
$GitIgnoreText = Text ".gitignore"

foreach ($Name in @("AppuntiPanel","DebtCreditsPanel","ShoppingPanel","CopyMonthWidget","PatrimonioPanel","SharePanel","MorePanel","SettingsPanel")) {
    MustNot $AppText (("(?m)^\s*function\s+{0}\s*\(" -f [regex]::Escape($Name))) ("Pannello ancora inline in app.tsx: {0}" -f $Name)
}

foreach ($Name in @("fainanceBasicUserPayload","LoginScreen","ContactForm","ChangePwdSection","ProfilePlacePromptField","ProfileLocalPromptField","ProfileCard")) {
    MustNot $AppText (("(?m)^function\s+{0}\s*\(" -f [regex]::Escape($Name))) ("Account UI ancora inline in app.tsx: {0}" -f $Name)
}

$Modules = @{
    "src\account\AccountScreens.tsx" = "LoginScreen"
    "src\sections\AppuntiPanel.tsx" = "AppuntiPanel"
    "src\sections\DebtCreditsPanel.tsx" = "DebtCreditsPanel"
    "src\sections\ShoppingPanel.tsx" = "ShoppingPanel"
    "src\sections\CopyMonthWidget.tsx" = "CopyMonthWidget"
    "src\sections\PatrimonioPanel.tsx" = "PatrimonioPanel"
    "src\sections\SharePanel.tsx" = "SharePanel"
    "src\sections\MorePanel.tsx" = "MorePanel"
    "src\settings\SettingsPanel.tsx" = "SettingsPanel"
}
foreach ($Relative in $Modules.Keys) {
    $ModuleText = Text $Relative
    Must $ModuleText (("export\s+function\s+{0}\s*\(" -f [regex]::Escape([string]$Modules[$Relative]))) ("Export mancante: {0}" -f $Relative)
}

Must $SensitiveText 'export\s+async\s+function\s+fainanceEncryptSensitiveData\s*\(' "Encrypt sensitive non esportato"
Must $SensitiveText 'export\s+async\s+function\s+fainanceDecryptSensitiveData\s*\(' "Decrypt sensitive non esportato"
Must $AppText 'useFainanceSensitiveStorage\s*,\s*fainanceEncryptSensitiveData\s*,\s*fainanceDecryptSensitiveData' "Import sensitive helpers mancante"
Must $AppText 'shoppingAreaColors\s*,\s*shoppingDeletedRecords' "shoppingAreaColors non esposto nel context bridge"
Must $AppText 'setShoppingAreaColors' "setShoppingAreaColors non esposto nel context bridge"

foreach ($Name in @("CopyMonthWidget","PatrimonioPanel","SharePanel","MorePanel","DebtCreditsPanel","ShoppingPanel")) {
    MustNot $SezioniText (("export\s+function\s+{0}\s*\(" -f [regex]::Escape($Name))) ("Duplicato ancora presente in sezioni.tsx: {0}" -f $Name)
}

Must $RulesText 'FAINANCE ADMIN SECURITY START' "Regole Admin Firestore mancanti"
Must $RulesText 'FAINANCE USERNAME SECURITY START' "Regole Username Firestore mancanti"
Must $RulesText 'fainanceAdminRole' "Claim amministrativo Firestore non rilevato"

$Rc = Get-Content -LiteralPath (Need ".firebaserc") -Raw | ConvertFrom-Json
$ProdProject = [string]$Rc.projects.default
if ($ProdProject -ne "fainance-a7794") { throw ("Firebase Production inatteso: {0}" -f $ProdProject) }
$PinnedTest = ([System.IO.File]::ReadAllText((Need ".fainance-test-project-id"))).Trim()
if (!$PinnedTest) { throw "Firebase Test project ID vuoto" }
if ($PinnedTest -eq $ProdProject) { throw "BLOCCO: Test e Production coincidono" }

$GitIgnoreLines = @(
    (Get-Content -LiteralPath (Need ".gitignore")) |
        ForEach-Object { ([string]$_).Trim() } |
        Where-Object { $_ -ne "" -and -not $_.StartsWith("#") }
)

function MustGitIgnoreEntry([string]$Entry,[string]$Message) {
    if ($GitIgnoreLines -notcontains $Entry) { throw $Message }
}

MustGitIgnoreEntry "node_modules/" ".gitignore non esclude node_modules"
MustGitIgnoreEntry ".env" ".gitignore non esclude .env"
MustGitIgnoreEntry ".gradle-local/" ".gitignore non esclude .gradle-local"
MustGitIgnoreEntry "BU/" ".gitignore non esclude BU"
MustGitIgnoreEntry "*.p12" ".gitignore non esclude chiavi P12"

$AppLines = (Get-Content -LiteralPath (Need "src\app.tsx")).Count
$SezioniLines = (Get-Content -LiteralPath (Need "src\sezioni.tsx")).Count
if ($AppLines -gt 6000) { throw ("app.tsx oltre il limite architetturale: {0} linee" -f $AppLines) }
if ($SezioniLines -gt 2200) { throw ("sezioni.tsx oltre il limite architetturale: {0} linee" -f $SezioniLines) }

Write-Host ("[OK] app.tsx: {0} linee" -f $AppLines) -ForegroundColor Green
Write-Host ("[OK] sezioni.tsx: {0} linee" -f $SezioniLines) -ForegroundColor Green
Write-Host "[OK] Moduli estratti e duplicati rimossi" -ForegroundColor Green
Write-Host "[OK] Sensitive storage collegato esplicitamente" -ForegroundColor Green
Write-Host "[OK] Firestore Admin + Username Security presenti" -ForegroundColor Green
Write-Host ("[OK] Production: {0}" -f $ProdProject) -ForegroundColor Green
Write-Host ("[OK] Test separato: {0}" -f $PinnedTest) -ForegroundColor Green
Write-Host "[OK] Esclusioni Git per cache/segreti presenti" -ForegroundColor Green
exit 0
