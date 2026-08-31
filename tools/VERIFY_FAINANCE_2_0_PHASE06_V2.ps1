$ErrorActionPreference = "Stop"
$App = Split-Path -Parent $PSScriptRoot

function Need([string]$Relative) {
    $Path = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $Path)) { throw ("File mancante: {0}" -f $Relative) }
    return $Path
}
function MustContain([string]$Text,[string]$Value,[string]$Message) {
    if ($Text.IndexOf($Value,[System.StringComparison]::Ordinal) -lt 0) { throw $Message }
}

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 06 V2 ===" -ForegroundColor Cyan

$Library = [IO.File]::ReadAllText((Need "src\icons\customIconLibrary.tsx"))
$Widget = [IO.File]::ReadAllText((Need "src\widget.tsx"))
$Settings = [IO.File]::ReadAllText((Need "src\settings\SettingsPanel.tsx"))
$Share = [IO.File]::ReadAllText((Need "src\sections\SharePanel.tsx"))
$Sections = [IO.File]::ReadAllText((Need "src\sezioni.tsx"))
$Lifecycle = [IO.File]::ReadAllText((Need "src\security\accountLifecycle.ts"))
$Rules = [IO.File]::ReadAllText((Need "firestore_share_rules_1.3.25.rules"))
$TranslationsPath = Need "src\i18n\appTranslationPatches.ts"
$TranslationLines = @(Get-Content -LiteralPath $TranslationsPath -Encoding UTF8)

MustContain $Library 'export const CUSTOM_ICON_PREFIX = "fai-icon:";' "Prefisso icone personali mancante"
MustContain $Library 'export async function resizeCustomIcon' "Resize icona personale mancante"
MustContain $Library 'export async function uploadCustomIcon' "Upload icona personale mancante"
MustContain $Library 'export async function deleteCustomIconRecord' "Eliminazione icona personale mancante"
MustContain $Library 'export function FainanceIcon' "Renderer centralizzato icone mancante"
MustContain $Library 'CUSTOM_ICON_MAX_DATA_URL_LENGTH = 120000' "Limite dimensionale icona non configurato"
MustContain $Library 'writeTechnicalLog({ category:"UPLOAD_ERROR"' "Logging anomalie upload icona mancante"

MustContain $Widget 'L2("Icone standard")' "Tab icone standard mancante"
MustContain $Widget 'L2("Le mie icone")' "Tab icone personali mancante"
MustContain $Widget 'L2("Carica icona personale")' "Upload nel picker condiviso mancante"
MustContain $Widget '<FainanceIcon value={selected}' "Anteprima selettore non usa renderer condiviso"
MustContain $Widget '<FainanceIcon value={ref} size={42}/>' "Anteprima icona personale mancante"
MustContain $Widget 'Math.max(20,Math.round(iconSize*0.62))' "Icona calcolatrice Phase 03 non preservata"
MustContain $Widget 'export function FainanceInfoPopover' "Sistema condiviso info/popup Phase 01 non preservato"
MustContain $Settings 'FainanceIcon' "Settings non usa renderer icone condiviso"
MustContain $Share 'FainanceIcon' "Share non usa renderer icone condiviso"
MustContain $Sections 'FainanceIcon' "Sezioni app non usano renderer icone condiviso"
MustContain $Lifecycle 'getDocs(collection(fbDb, "users", uid, "customIcons"))' "Cleanup customIcons cancellazione account mancante"
MustContain $Lifecycle 'customIcons.docs.forEach' "Eliminazione customIcons account mancante"

MustContain $Rules 'match /users/{userId}/customIcons/{iconId}' "Regole customIcons mancanti"
MustContain $Rules 'allow get: if signedIn();' "Lettura puntuale customIcons condivisi mancante"
MustContain $Rules 'allow list: if isOwner(userId);' "Enumerazione customIcons non limitata al proprietario"
MustContain $Rules 'request.resource.data.dataUrl.size() <= 120000' "Limite Firestore customIcons mancante"

$TranslationKeys = @(
  'Icone standard',
  'Le mie icone',
  'Carica icona personale',
  'Ottimizzazione icona...',
  "L'icona viene ritagliata, ridimensionata e compressa automaticamente per occupare meno spazio.",
  'Hai raggiunto il limite di icone personali.',
  "L'immagine selezionata è troppo grande.",
  "Impossibile elaborare l'icona. Prova con JPG, PNG o WebP.",
  "Impossibile caricare l'icona personale.",
  'Eliminare questa icona personale?',
  "Impossibile eliminare l'icona personale.",
  'Caricamento icone...',
  'Non hai ancora caricato icone personali.',
  'Icona personale'
)
$Languages = @('it:','en:','es:','fr:','de:','pt:','pl:','nl:','ro:','el:')
foreach ($Key in $TranslationKeys) {
    $Needle = 'add("' + $Key + '"'
    $Line = $TranslationLines | Where-Object { ([string]$_).IndexOf($Needle,[System.StringComparison]::Ordinal) -ge 0 } | Select-Object -First 1
    if (!$Line) { throw ("Traduzione Phase 06 mancante: {0}" -f $Key) }
    foreach ($Lang in $Languages) {
        if (([string]$Line).IndexOf($Lang,[System.StringComparison]::Ordinal) -lt 0) {
            throw ("Traduzione {0} incompleta: lingua {1} mancante" -f $Key,$Lang.TrimEnd(':'))
        }
    }
}

Write-Host "[OK] Libreria icone personali centralizzata" -ForegroundColor Green
Write-Host "[OK] Upload + resize/compressione + eliminazione" -ForegroundColor Green
Write-Host "[OK] Picker condiviso standard/personali" -ForegroundColor Green
Write-Host "[OK] Correzioni UI precedenti preservate nel widget" -ForegroundColor Green
Write-Host "[OK] Rendering integrato in impostazioni, Share e sezioni principali" -ForegroundColor Green
Write-Host "[OK] Cleanup cancellazione account" -ForegroundColor Green
Write-Host "[OK] Regole Firestore customIcons" -ForegroundColor Green
Write-Host "[OK] Traduzioni complete IT/EN/ES/FR/DE/PT/PL/NL/RO/EL" -ForegroundColor Green
exit 0
