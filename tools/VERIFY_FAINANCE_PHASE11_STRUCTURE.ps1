param()

$ErrorActionPreference = "Stop"

$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

function Require-File([string]$RelativePath) {
    $Full = Join-Path $App $RelativePath
    if (!(Test-Path -LiteralPath $Full)) {
        throw "File Phase 11 mancante: $RelativePath"
    }
    return $Full
}

function Require-Contains([string]$Text, [string]$Needle, [string]$Message) {
    if (!$Text.Contains($Needle)) {
        throw $Message
    }
}

function Require-NotContains([string]$Text, [string]$Needle, [string]$Message) {
    if ($Text.Contains($Needle)) {
        throw $Message
    }
}

Write-Host "`n=== VERIFICA STRUTTURA FAINANCE PHASE 11 ===" -ForegroundColor Cyan

$AppFile = Require-File "src\app.tsx"
$PlatformFile = Require-File "src\native\platform.ts"
$ContactsFile = Require-File "src\native\appContacts.ts"
$AdmobFile = Require-File "src\config\admob.ts"
$CountriesFile = Require-File "src\profile\countries.ts"
$PatchesFile = Require-File "src\i18n\appTranslationPatches.ts"

$AppText = [IO.File]::ReadAllText($AppFile)
$PlatformText = [IO.File]::ReadAllText($PlatformFile)
$ContactsText = [IO.File]::ReadAllText($ContactsFile)
$AdmobText = [IO.File]::ReadAllText($AdmobFile)
$CountriesText = [IO.File]::ReadAllText($CountriesFile)
$PatchesText = [IO.File]::ReadAllText($PatchesFile)

Require-Contains $AppText "from './native/appContacts'" "app.tsx non usa il contact picker estratto"
Require-Contains $AppText "from './native/platform'" "app.tsx non usa il modulo native/platform"
Require-Contains $AppText "from './config/admob'" "app.tsx non usa config/admob"
Require-Contains $AppText "from './profile/countries'" "app.tsx non usa profile/countries"
Require-Contains $AppText "from './i18n/appTranslationPatches'" "app.tsx non importa appTranslationPatches"
Require-Contains $AppText "applyAppTranslationPatches();" "app.tsx non applica le patch traduzioni estratte"

Require-NotContains $AppText "async function getFainanceContactsPlugin(){" "Contact picker duplicato ancora presente in app.tsx"
Require-NotContains $AppText "function fainanceIsNativePlatform(){" "Native platform helper duplicato ancora presente in app.tsx"
Require-NotContains $AppText "const ADMOB_APP_ID_ANDROID=" "Costanti AdMob duplicate ancora presenti in app.tsx"
Require-NotContains $AppText "const PROFILE_COUNTRY_OPTIONS=" "Catalogo nazioni duplicato ancora presente in app.tsx"
Require-NotContains $AppText "fAInance - fix urgenti dati/home/modifica entrate." "Patch traduzioni legacy ancora presenti in app.tsx"

Require-Contains $ContactsText '@capgo/capacitor-contacts' "Fallback dinamico contatti legacy non preservato"
Require-Contains $ContactsText 'export async function pickFainanceContact()' "pickFainanceContact non esportato"
Require-Contains $ContactsText 'fainancePickContact=pickFainanceContact' "Bridge window.fainancePickContact non preservato"

Require-Contains $PlatformText 'export function fainanceIsNativePlatform()' "fainanceIsNativePlatform non esportato"
Require-Contains $PlatformText 'export function fainanceSetMetaEventsConsent' "Meta Events consent non esportato"
Require-Contains $PlatformText 'export function fainanceLogMetaEvent' "Meta Events logger non esportato"

Require-Contains $AdmobText 'export const ADMOB_REWARDED_AD_UNIT_ID_ANDROID=' "AdMob Android rewarded mancante"
Require-Contains $AdmobText 'export const ADMOB_INTERSTITIAL_AD_UNIT_ID_IOS=' "AdMob iOS interstitial mancante"

Require-Contains $CountriesText 'export const PROFILE_COUNTRY_OPTIONS=' "Catalogo nazioni non esportato"
Require-Contains $CountriesText 'export function getProfileCountryNames' "getProfileCountryNames non esportato"
Require-Contains $CountriesText 'export function localizeProfileCountryName' "localizeProfileCountryName non esportato"

$CountryCount = ([regex]::Matches($CountriesText, '"code":"[A-Z]{2}"')).Count
if ($CountryCount -lt 200) {
    throw "Catalogo nazioni incompleto: rilevate solo $CountryCount voci"
}

Require-Contains $PatchesText "export function applyAppTranslationPatches()" "Funzione patch traduzioni non esportata"
Require-Contains $PatchesText "fAInance - fix urgenti dati/home/modifica entrate." "Prima patch traduzioni legacy mancante"
Require-Contains $PatchesText "TRANSLATIONS" "Patch traduzioni non collegate a TRANSLATIONS"

$AppBytes = (Get-Item -LiteralPath $AppFile).Length
if ($AppBytes -ge 1300000) {
    throw "app.tsx non risulta realmente decomposto: $AppBytes byte"
}

Write-Host "[OK] app.tsx decomposto: $AppBytes byte" -ForegroundColor Green
Write-Host "[OK] Contact picker app estratto con fallback legacy" -ForegroundColor Green
Write-Host "[OK] Native platform + Meta Events estratti" -ForegroundColor Green
Write-Host "[OK] Configurazione AdMob centralizzata" -ForegroundColor Green
Write-Host "[OK] Catalogo nazioni profilo estratto ($CountryCount voci)" -ForegroundColor Green
Write-Host "[OK] Patch traduzioni legacy estratte" -ForegroundColor Green

exit 0
