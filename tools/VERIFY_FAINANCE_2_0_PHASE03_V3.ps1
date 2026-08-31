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

function MustNotContain([string]$Text,[string]$Value,[string]$Message) {
    if ($Text.IndexOf($Value,[System.StringComparison]::Ordinal) -ge 0) { throw $Message }
}

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 03 V3 ===" -ForegroundColor Cyan

$AppText = [IO.File]::ReadAllText((Need "src\app.tsx"))
$SectionsText = [IO.File]::ReadAllText((Need "src\sezioni.tsx"))
$AccountText = [IO.File]::ReadAllText((Need "src\account\AccountScreens.tsx"))
$ProfileText = [IO.File]::ReadAllText((Need "src\profile\profileService.ts"))
$PhotoText = [IO.File]::ReadAllText((Need "src\profile\profilePhoto.ts"))
$I18nText = [IO.File]::ReadAllText((Need "src\i18n\appTranslationPatches.ts"))

# Share history: title contains only description; project and payer are metadata on line 2.
MustContain $AppText 'desc:(a.desc||"Spesa condivisa")' "Titolo Share storico non semplificato"
MustNotContain $AppText 'desc:(project.name||"Share")+" · "+(a.desc||"Spesa condivisa")' "Nome progetto Share ancora duplicato nel titolo"
MustContain $SectionsText 'e._share&&e._sharePaidBy&&<span' "Pagante Share non spostato nella seconda riga"
MustContain $SectionsText '{L("Pagata da")} <strong' "Etichetta Pagata da non separata dal nome"

# Web category defaults/order: immediate persistence is web-only and leaves native unchanged.
MustContain $AppText 'function queueWebCategoryPreferencePatch(patch:any)' "Persistenza preferenze categorie Web mancante"
MustContain $AppText 'fainanceIsNativePlatform())return' "Guardia Web-only preferenze categorie mancante"
MustContain $AppText 'categoryPreferencesV2:prefs' "Persistenza Firestore preferenze categorie Web mancante"
MustContain $AppText 'queueWebCategoryPreferencePatch({catOrder:next})' "Ordine categorie Web non collegato alla persistenza"
MustContain $AppText 'queueWebCategoryPreferencePatch({defaultExpenseCat:next})' "Categoria predefinita Web non collegata alla persistenza"

# Profile layout/newsletter.
MustContain $AccountText 'gridTemplateColumns:"repeat(2,minmax(0,1fr))"' "Nome e Cognome non sono sulla stessa riga"
MustContain $AccountText 'flexDirection:"column"' "Newsletter non predisposta su due righe"
# The source uses the localized string; verify by stable suffix to avoid PowerShell encoding fragility.
MustContain $AccountText 'L("Non sar' "Seconda riga Newsletter mancante"

# Automatic username: user id fallback + single-name rule.
MustContain $AccountText 'var accountUid=String((currentUser&&((currentUser as any).id||(currentUser as any).uid))||"")' "Username automatico non gestisce id/uid"
MustContain $AccountText 'ensureDefaultUsernameForExistingUser(accountUid' "Generazione automatica username non collegata al Profilo"
MustContain $ProfileText 'let candidate = first && !last ? first :' "Regola username con solo Nome non presente"

# Profile photo: robust decoder + resized JPEG output.
MustContain $PhotoText 'createImageBitmap' "Decoder foto moderno mancante"
MustContain $PhotoText 'FileReader' "Fallback decoder foto mancante"
MustContain $PhotoText 'canvas.toDataURL("image/jpeg"' "Compressione foto profilo JPEG mancante"
MustContain $PhotoText 'data.length > 130000' "Limite dimensione foto profilo mancante"
MustContain $AccountText 'Profile photo processing failed' "Diagnostica caricamento foto mancante"

# New user-facing photo errors are translated.
MustContain $I18nText 'Formato HEIC/HEIF non supportato in questo browser.' "Traduzione errore HEIC mancante"
MustContain $I18nText 'Dimensione massima: 15 MB.' "Traduzione limite foto mancante"

Write-Host "[OK] Storico Share: titolo e seconda riga corretti" -ForegroundColor Green
Write-Host "[OK] Categorie Web: default e ordine persistenti" -ForegroundColor Green
Write-Host "[OK] Profilo: Nome/Cognome + Newsletter" -ForegroundColor Green
Write-Host "[OK] Username automatico: Nome.Cognome / Nome" -ForegroundColor Green
Write-Host "[OK] Foto profilo: decoder + resize/compressione robusti" -ForegroundColor Green
exit 0
