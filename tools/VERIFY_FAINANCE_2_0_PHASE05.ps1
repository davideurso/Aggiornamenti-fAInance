$ErrorActionPreference = "Stop"
$App = Split-Path -Parent $PSScriptRoot

function Need([string]$Relative) {
    $Path = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $Path)) { throw ("File mancante: {0}" -f $Relative) }
    return $Path
}
function Must([string]$Text,[string]$Value,[string]$Message) {
    if ($Text.IndexOf($Value,[System.StringComparison]::Ordinal) -lt 0) { throw $Message }
}
function MustNot([string]$Text,[string]$Value,[string]$Message) {
    if ($Text.IndexOf($Value,[System.StringComparison]::Ordinal) -ge 0) { throw $Message }
}

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 05 ===" -ForegroundColor Cyan

$Account = [IO.File]::ReadAllText((Need "src\account\AccountScreens.tsx"))
$Settings = [IO.File]::ReadAllText((Need "src\settings\SettingsPanel.tsx"))
$Security = [IO.File]::ReadAllText((Need "src\security\AccountSecurityCenter.tsx"))
$Lifecycle = [IO.File]::ReadAllText((Need "src\security\accountLifecycle.ts"))
$AppText = [IO.File]::ReadAllText((Need "src\app.tsx"))
$Backups = [IO.File]::ReadAllText((Need "src\data\automaticBackups.ts"))
$Logs = [IO.File]::ReadAllText((Need "src\observability\technicalLogs.ts"))
$Translations = [IO.File]::ReadAllText((Need "src\i18n\appTranslationPatches.ts"))
$Rules = [IO.File]::ReadAllText((Need "firestore_share_rules_1.3.25.rules"))
$AdminApi = [IO.File]::ReadAllText((Need "admin-app\src\adminApi.ts"))
$AdminTypes = [IO.File]::ReadAllText((Need "admin-app\src\types.ts"))
$AdminSecurity = [IO.File]::ReadAllText((Need "admin-app\src\security.ts"))
$AdminMain = [IO.File]::ReadAllText((Need "admin-app\src\main.tsx"))

# UI correction requested after Phase 04.
Must $Settings 'showDevices={true} showDeletion={false}' "Dispositivi associati non spostati in Sicurezza"
Must $Account 'showDevices={false} showDeletion={true}' "Cancellazione account non mantenuta nel Profilo"
Must $Security 'showDevices = true' "AccountSecurityCenter non modularizzato per dispositivi"
Must $Security 'showDeletion = true' "AccountSecurityCenter non modularizzato per cancellazione"
Must $Security 'L("Cancella Account")' "Etichetta Cancella Account mancante"
MustNot $Security 'L("Richiedi cancellazione account")' "Vecchia etichetta Richiedi cancellazione account ancora attiva"
MustNot $Security 'L("Programma cancellazione tra 15 giorni")' "Vecchia etichetta bottone conferma ancora attiva"
Must $Translations 'add("Cancella Account"' "Traduzioni Cancella Account mancanti"

# Automatic backup infrastructure.
Must $Backups 'const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;' "Intervallo backup automatico non impostato a 6 ore"
Must $Backups 'const MAX_BACKUPS = 12;' "Retention backup automatici non impostata"
Must $Backups 'fainanceCompressAccountDataV5' "Compressione backup automatica mancante"
Must $Backups 'collection(fbDb, "users", uid, "backups")' "Archivio privato backup utente mancante"
Must $Backups 'doc(fbDb, "accountBackupMetadata", id)' "Metadata backup Admin mancanti"
Must $AppText 'createAutomaticAccountBackup' "Backup automatici non collegati al runtime account"
Must $Lifecycle 'accountBackupMetadata' "Cleanup metadata backup in cancellazione account mancante"

# Technical logging infrastructure and core hooks.
foreach ($Category in @('AUTH_SUCCESS','AUTH_FAILURE','SYNC_ERROR','RESTORE_VERSION','RESTORE_TRASH','PLAN_CHANGED','ADMIN_ACTION','AI_FAILURE','UPLOAD_ERROR','DOWNLOAD_ERROR','BACKUP_CREATED','BACKUP_ERROR')) {
    Must $Logs ('| "' + $Category + '"') ("Categoria log tecnica mancante: {0}" -f $Category)
}
Must $Logs 'sanitizeMetadata' "Sanitizzazione metadata log mancante"
Must $Logs 'password|token|secret|authorization|credential' "Filtro dati sensibili log mancante"
Must $Logs 'fainance_technical_logs_preauth_v1' "Coda log pre-auth mancante"
Must $Account 'writeTechnicalLog({category:"AUTH_SUCCESS"' "Hook login riuscito mancante"
Must $Account 'queuePreAuthTechnicalLog' "Hook login fallito mancante"
Must $AppText 'category:"SYNC_ERROR"' "Hook errore sync mancante"
Must $AppText 'category:"PLAN_CHANGED"' "Hook cambio piano mancante"
Must $Settings 'operation:"manual-backup-restore"' "Hook recupero backup/versione mancante"

# Firestore privacy rules.
Must $Rules 'match /users/{userId}/backups/{backupId}' "Regole payload backup mancanti"
Must $Rules 'match /accountBackupMetadata/{backupId}' "Regole metadata backup mancanti"
Must $Rules 'match /technicalLogs/{logId}' "Regole log tecnici mancanti"
Must $Rules "request.resource.data.keys().hasOnly(['uid','deviceId','category','operation','result','severity','errorCode','metadata','appVersion','environment','createdAtIso','createdAtMs','createdAt'])" "Whitelist campi log tecnici mancante"

# Admin expansion.
Must $AdminTypes '"technicalLogs" | "backups"' "Nuove sezioni Admin non tipizzate"
Must $AdminSecurity '"technical_logs.read"' "Capability log tecnici mancante"
Must $AdminSecurity '"backups.read"' "Capability backup mancante"
Must $AdminApi 'listRecentTechnicalLogs' "API Admin log tecnici mancante"
Must $AdminApi 'listRecentBackupMetadata' "API Admin metadata backup mancante"
Must $AdminMain 'function TechnicalLogs' "Pannello Admin log tecnici mancante"
Must $AdminMain 'function Backups' "Pannello Admin backup mancante"
Must $AdminMain 'technicalLogs: "Log tecnici"' "Navigazione Admin log tecnici mancante"
Must $AdminMain 'backups: "Backup"' "Navigazione Admin backup mancante"

Write-Host "[OK] Dispositivi associati spostati in Sicurezza" -ForegroundColor Green
Write-Host "[OK] Cancella Account: etichette aggiornate" -ForegroundColor Green
Write-Host "[OK] Backup automatici Firestore: infrastruttura verificata" -ForegroundColor Green
Write-Host "[OK] Log tecnici: infrastruttura + eventi core verificati" -ForegroundColor Green
Write-Host "[OK] Privacy regole Firestore backup/log verificata" -ForegroundColor Green
Write-Host "[OK] fAInance Admin: Log tecnici + Backup verificati" -ForegroundColor Green
exit 0
