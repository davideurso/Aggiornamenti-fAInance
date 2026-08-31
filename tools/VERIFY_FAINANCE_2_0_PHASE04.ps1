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

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 04 ===" -ForegroundColor Cyan

$AppText       = [IO.File]::ReadAllText((Need "src\app.tsx"))
$AccountText   = [IO.File]::ReadAllText((Need "src\account\AccountScreens.tsx"))
$SessionText   = [IO.File]::ReadAllText((Need "src\auth\accountSession.ts"))
$SettingsText  = [IO.File]::ReadAllText((Need "src\settings\SettingsPanel.tsx"))
$DeviceText    = [IO.File]::ReadAllText((Need "src\security\deviceSessions.ts"))
$LifecycleText = [IO.File]::ReadAllText((Need "src\security\accountLifecycle.ts"))
$CenterText    = [IO.File]::ReadAllText((Need "src\security\AccountSecurityCenter.tsx"))
$RulesText     = [IO.File]::ReadAllText((Need "firestore_share_rules_1.3.25.rules"))
$I18nText      = [IO.File]::ReadAllText((Need "src\i18n\appTranslationPatches.ts"))

# Account deletion lifecycle: no immediate delete path remains exposed.
MustContain $LifecycleText 'ACCOUNT_DELETION_GRACE_DAYS = 15' "Periodo di ripensamento 15 giorni mancante"
MustContain $LifecycleText 'requestAccountDeletion' "Richiesta cancellazione account mancante"
MustContain $LifecycleText 'cancelAccountDeletion' "Annullamento cancellazione account mancante"
MustContain $LifecycleText 'finalizeDueAccountDeletion' "Finalizzazione account scaduto mancante"
MustContain $LifecycleText 'isRecentAuthentication' "Controllo autenticazione recente mancante"
MustContain $AppText 'requestCurrentAccountDeletion' "Handler richiesta cancellazione non collegato all'app"
MustContain $AppText 'cancelCurrentAccountDeletion' "Handler annullamento cancellazione non collegato all'app"
MustContain $AppText 'watchAccountDeletionState' "Watch scadenza cancellazione non collegato"
MustNotContain $AppText 'async function deleteCurrentAccount(password?:string)' "Vecchia cancellazione immediata ancora presente"

# Device management and remote sign-out.
MustContain $DeviceText 'currentFainanceDeviceId' "Identita dispositivo mancante"
MustContain $DeviceText 'startCurrentDeviceSession' "Registrazione/watch dispositivo corrente mancante"
MustContain $DeviceText 'revokeDeviceSession' "Revoca singolo dispositivo mancante"
MustContain $DeviceText 'revokeAllOtherDeviceSessions' "Revoca altri dispositivi mancante"
MustContain $DeviceText 'existingData.active === false || existingData.revokedAt' "Sessione revocata potrebbe riattivarsi al reload"
MustContain $DeviceText 'localStorage.removeItem(DEVICE_ID_KEY)' "Rotazione device session al logout mancante"
MustContain $AppText 'startCurrentDeviceSession(uid,function(){void forceLogout();}' "Logout automatico dispositivo revocato non collegato"
MustContain $AppText 'closeCurrentDeviceSession(uid)' "Chiusura sessione dispositivo al logout mancante"

# Profile UI.
MustContain $AccountText 'AccountSecurityCenter' "Centro sicurezza account non collegato al Profilo"
MustContain $SettingsText 'onRequestAccountDeletion={requestCurrentAccountDeletion}' "Settings non collega richiesta cancellazione"
MustContain $SettingsText 'onCancelAccountDeletion={cancelCurrentAccountDeletion}' "Settings non collega annullamento cancellazione"
MustContain $CenterText 'Dispositivi associati' "UI dispositivi associati mancante"
MustContain $CenterText 'Disconnetti tutti gli altri dispositivi' "UI disconnessione altri dispositivi mancante"
MustContain $CenterText 'Programma cancellazione tra 15 giorni' "UI cancellazione 15 giorni mancante"
MustContain $CenterText 'Annulla cancellazione account' "UI annullamento cancellazione mancante"
MustContain $CenterText 'FainancePickerModal' "Popup cancellazione non usa il popup condiviso"

# Firestore Test rules.
MustContain $RulesText 'match /users/{userId}/devices/{deviceId}' "Regole devices mancanti"
MustContain $RulesText 'match /accountDeletionRequests/{userId}' "Regole richieste cancellazione mancanti"
MustContain $RulesText 'allow get, delete: if signedIn() && resource.data.uid == request.auth.uid;' "Cleanup userLookup non autorizzato"
MustContain $RulesText 'resource.data.invitedUid == request.auth.uid' "Cleanup inviti ricevuti non autorizzato"

# Translation patch.
MustContain $I18nText 'fAInance 2.0 Phase 04' "Patch traduzioni Phase 04 mancante"
MustContain $I18nText 'Dispositivi associati' "Traduzioni dispositivi mancanti"
MustContain $I18nText 'Cancellazione programmata per' "Traduzioni cancellazione mancanti"
MustContain $I18nText 'Annulla cancellazione account' "Traduzioni annullamento mancanti"

# Session carries deletion state so login can enforce due deletion.
MustContain $SessionText 'deletionStatus: string;' "Stato cancellazione non presente nella sessione"
MustContain $SessionText 'deletionScheduledAt: string;' "Scadenza cancellazione non presente nella sessione"
MustContain $AppText 'finalizeDueAccountDeletion(user)' "Finalizzazione post-login non collegata"

Write-Host "[OK] Cancellazione account con 15 giorni e annullamento" -ForegroundColor Green
Write-Host "[OK] Gestione dispositivi + revoca singola/tutti gli altri" -ForegroundColor Green
Write-Host "[OK] Logout remoto dispositivo revocato" -ForegroundColor Green
Write-Host "[OK] Regole Firestore Phase 04" -ForegroundColor Green
Write-Host "[OK] Traduzioni Phase 04" -ForegroundColor Green
exit 0
