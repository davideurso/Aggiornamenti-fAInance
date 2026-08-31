$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
function Need([string]$Relative){$p=Join-Path $App $Relative;if(!(Test-Path -LiteralPath $p)){throw ("File mancante: {0}" -f $Relative)};return $p}
function Must([string]$Text,[string]$Value,[string]$Message){if($Text.IndexOf($Value,[System.StringComparison]::Ordinal)-lt 0){throw $Message}}
Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 03 V2 ===" -ForegroundColor Cyan
$Account=[IO.File]::ReadAllText((Need "src\account\AccountScreens.tsx"))
$Session=[IO.File]::ReadAllText((Need "src\auth\accountSession.ts"))
$Profile=[IO.File]::ReadAllText((Need "src\profile\profileService.ts"))
$Photo=[IO.File]::ReadAllText((Need "src\profile\profilePhoto.ts"))
$Types=[IO.File]::ReadAllText((Need "src\profile\types.ts"))
$Translations=[IO.File]::ReadAllText((Need "src\i18n\appTranslationPatches.ts"))
$Rules=[IO.File]::ReadAllText((Need "firestore_share_rules_1.3.25.rules"))
Must $Account 'pFirstName' "Campo Nome separato mancante"
Must $Account 'pLastName' "Campo Cognome separato mancante"
Must $Account 'resizeProfilePhoto(file,256,0.76)' "Resize foto profilo non collegato"
Must $Account 'role="checkbox" aria-checked={pNewsletter}' "Checkbox newsletter personalizzato mancante"
Must $Profile 'ensureDefaultUsernameForExistingUser' "Username automatico utenti esistenti mancante"
Must $Profile 'defaultUsernameFromName' "Generazione Nome.Cognome mancante"
Must $Session 'ensureDefaultUsernameForExistingUser(user.uid,firstName,lastName,displayName)' "Username automatico non collegato alla sessione"
Must $Photo 'const outSide = Math.min(maxSide, side);' "Resize immagine non verificato"
Must $Photo 'canvas.toDataURL("image/webp", quality)' "Compressione immagine non verificata"
Must $Types 'firstName?: string;' "Tipo firstName mancante"
Must $Types 'lastName?: string;' "Tipo lastName mancante"
Must $Types 'profilePhotoDataUrl?: string;' "Tipo foto profilo mancante"
Must $Translations "'Cognome':" "Traduzioni Cognome mancanti"
Must $Translations "'Foto profilo':" "Traduzioni Foto profilo mancanti"
Must $Rules 'request.resource.data.uid == request.auth.uid' "Regole username utente mancanti"
Must $Rules 'allow list: if isFainanceAdmin();' "Protezione enumerazione username mancante"
Must $Account 'sendAccountEmailVerification' "Validazione email Phase 03 non preservata"
Write-Host "[OK] Nome e Cognome separati" -ForegroundColor Green
Write-Host "[OK] Username automatico Nome.Cognome per utenti esistenti" -ForegroundColor Green
Write-Host "[OK] Foto profilo ridimensionata/compressa" -ForegroundColor Green
Write-Host "[OK] Newsletter checkbox visibile" -ForegroundColor Green
Write-Host "[OK] Regole username Test predisposte" -ForegroundColor Green
exit 0
