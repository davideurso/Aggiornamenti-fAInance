$ErrorActionPreference = "Stop"

$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

function Require-File([string]$Relative) {
    $Path = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $Path)) {
        throw ("File mancante: {0}" -f $Relative)
    }
    return $Path
}

function Assert-Match([string]$Text,[string]$Pattern,[string]$Message) {
    if ($Text -notmatch $Pattern) { throw $Message }
}

function Assert-NoMatch([string]$Text,[string]$Pattern,[string]$Message) {
    if ($Text -match $Pattern) { throw $Message }
}

Write-Host "`n=== VERIFICA FAINANCE PHASE 16-20 ===" -ForegroundColor Cyan

$AppPath = Require-File "src\app.tsx"
$SezioniPath = Require-File "src\sezioni.tsx"
$SensitivePath = Require-File "src\security\sensitiveStorage.ts"
$AccountPath = Require-File "src\account\AccountScreens.tsx"
$SettingsPath = Require-File "src\settings\SettingsPanel.tsx"

$AppText = [IO.File]::ReadAllText($AppPath)
$SezioniText = [IO.File]::ReadAllText($SezioniPath)
$SensitiveText = [IO.File]::ReadAllText($SensitivePath)
$AccountText = [IO.File]::ReadAllText($AccountPath)
$SettingsText = [IO.File]::ReadAllText($SettingsPath)

$MovedPanels = @(
    "AppuntiPanel",
    "DebtCreditsPanel",
    "ShoppingPanel",
    "CopyMonthWidget",
    "PatrimonioPanel",
    "SharePanel",
    "MorePanel",
    "SettingsPanel"
)

foreach ($Name in $MovedPanels) {
    Assert-NoMatch $AppText ("(?m)^\s*function\s+" + [regex]::Escape($Name) + "\s*\(") ("Pannello ancora inline in app.tsx: {0}" -f $Name)
}

$AccountFunctions = @(
    "fainanceBasicUserPayload",
    "LoginScreen",
    "ContactForm",
    "ChangePwdSection",
    "ProfilePlacePromptField",
    "ProfileLocalPromptField",
    "ProfileCard"
)
foreach ($Name in $AccountFunctions) {
    Assert-NoMatch $AppText ("(?m)^function\s+" + [regex]::Escape($Name) + "\s*\(") ("Account UI ancora inline in app.tsx: {0}" -f $Name)
}

$ExpectedModules = @{
    "src\sections\AppuntiPanel.tsx" = "AppuntiPanel"
    "src\sections\DebtCreditsPanel.tsx" = "DebtCreditsPanel"
    "src\sections\ShoppingPanel.tsx" = "ShoppingPanel"
    "src\sections\CopyMonthWidget.tsx" = "CopyMonthWidget"
    "src\sections\PatrimonioPanel.tsx" = "PatrimonioPanel"
    "src\sections\SharePanel.tsx" = "SharePanel"
    "src\sections\MorePanel.tsx" = "MorePanel"
    "src\settings\SettingsPanel.tsx" = "SettingsPanel"
}
foreach ($Relative in $ExpectedModules.Keys) {
    $Path = Require-File $Relative
    $Text = [IO.File]::ReadAllText($Path)
    $Name = [string]$ExpectedModules[$Relative]
    Assert-Match $Text ("export\s+function\s+" + [regex]::Escape($Name) + "\s*\(") ("Export mancante: {0}" -f $Name)
    Assert-Match $Text "useApp\s*\(" ("Context bridge mancante: {0}" -f $Name)
}

Assert-Match $AccountText "export\s+function\s+LoginScreen\s*\(" "LoginScreen non estratto"
Assert-Match $AccountText "export\s+function\s+ProfileCard\s*\(" "ProfileCard non estratto"
Assert-Match $AccountText "export\s+function\s+ContactForm\s*\(" "ContactForm non estratto"

Assert-Match $SensitiveText "export\s+async\s+function\s+fainanceEncryptSensitiveData\s*\(" "Encrypt sensitive non esportato"
Assert-Match $SensitiveText "export\s+async\s+function\s+fainanceDecryptSensitiveData\s*\(" "Decrypt sensitive non esportato"
Assert-Match $AppText "useFainanceSensitiveStorage\s*,\s*fainanceEncryptSensitiveData\s*,\s*fainanceDecryptSensitiveData" "Import sensitive helpers mancante in app.tsx"
Assert-Match $SettingsText "fainanceEncryptSensitiveData\s*,\s*fainanceDecryptSensitiveData" "Import sensitive helpers mancante in SettingsPanel"

Assert-Match $AppText "from\s+['""]\./sections/AppuntiPanel['""]" "Import AppuntiPanel mancante"
Assert-Match $AppText "from\s+['""]\./sections/DebtCreditsPanel['""]" "Import DebtCreditsPanel mancante"
Assert-Match $AppText "from\s+['""]\./sections/ShoppingPanel['""]" "Import ShoppingPanel mancante"
Assert-Match $AppText "from\s+['""]\./sections/PatrimonioPanel['""]" "Import PatrimonioPanel mancante"
Assert-Match $AppText "from\s+['""]\./sections/SharePanel['""]" "Import SharePanel mancante"
Assert-Match $AppText "from\s+['""]\./sections/MorePanel['""]" "Import MorePanel mancante"
Assert-Match $AppText "from\s+['""]\./settings/SettingsPanel['""]" "Import SettingsPanel mancante"
Assert-Match $AppText "from\s+['""]\./account/AccountScreens['""]" "Import AccountScreens mancante"

Assert-Match $AppText "shoppingAreaColors\s*,\s*shoppingDeletedRecords" "shoppingAreaColors non esposto nel bridge"
Assert-Match $AppText "setShoppingAreaColors" "setShoppingAreaColors non esposto nel bridge"

$CtxIndex = $AppText.IndexOf("var ctxValue={")
$NavIndex = $AppText.IndexOf("var mobileAllNavDefaultOrder=")
$MenuIndex = $AppText.IndexOf("function buildMobileMenuItems")
if ($CtxIndex -lt 0 -or $NavIndex -lt 0 -or $MenuIndex -lt 0) {
    throw "Struttura navigazione/context non riconosciuta"
}
if ($CtxIndex -lt $NavIndex -or $CtxIndex -lt $MenuIndex) {
    throw "ctxValue viene creato troppo presto: rischio valori undefined nei pannelli estratti"
}

foreach ($Name in @("CopyMonthWidget","PatrimonioPanel","SharePanel","MorePanel","DebtCreditsPanel","ShoppingPanel")) {
    Assert-NoMatch $SezioniText ("export\s+function\s+" + [regex]::Escape($Name) + "\s*\(") ("Duplicato ancora presente in sezioni.tsx: {0}" -f $Name)
}

$AppLines = (Get-Content -LiteralPath $AppPath).Count
$SezioniLines = (Get-Content -LiteralPath $SezioniPath).Count
if ($AppLines -gt 6000) { throw ("app.tsx ancora troppo grande: {0} linee" -f $AppLines) }
if ($SezioniLines -gt 2200) { throw ("sezioni.tsx ancora troppo grande: {0} linee" -f $SezioniLines) }

Write-Host ("[OK] app.tsx: {0} linee" -f $AppLines) -ForegroundColor Green
Write-Host ("[OK] sezioni.tsx: {0} linee" -f $SezioniLines) -ForegroundColor Green
Write-Host "[OK] Phase 16 - Debiti/Crediti + Spesa estratti" -ForegroundColor Green
Write-Host "[OK] Phase 17 - Patrimonio + Share + More estratti" -ForegroundColor Green
Write-Host "[OK] Phase 18 - Appunti estratto" -ForegroundColor Green
Write-Host "[OK] Phase 19 - Login/profilo/account estratti" -ForegroundColor Green
Write-Host "[OK] Phase 20 - Impostazioni estratte + duplicati rimossi" -ForegroundColor Green
Write-Host "[OK] Sensitive storage export/import corretto" -ForegroundColor Green
Write-Host "[OK] Context bridge costruito dopo le dipendenze tardive" -ForegroundColor Green

exit 0
