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

function Require-Regex([string]$RelativePath, [string[]]$Patterns) {
    $Path = Require-File $RelativePath
    $Text = [IO.File]::ReadAllText($Path)
    foreach ($Pattern in $Patterns) {
        if ($Text -notmatch $Pattern) {
            throw ("Verifica fallita in {0}: regola assente [{1}]" -f $RelativePath, $Pattern)
        }
        $script:Checks += 1
    }
}

Write-Host "`n=== VERIFICA FAINANCE 2.0 TEST - PHASE 11 ===" -ForegroundColor Cyan
Require-File "package.json" | Out-Null
Require-Text ".env.test.local" @("VITE_FIREBASE_TEST_PROJECT_ID=$TestProject")
if ([IO.File]::ReadAllText((Require-File ".env.test.local")) -match [regex]::Escape("VITE_FIREBASE_TEST_PROJECT_ID=$ProductionProject")) {
    throw "BLOCCO SICUREZZA: configurazione Test collegata a Production"
}

Require-Text "src\share\shareAttachments.ts" @(
    "SHARE_ATTACHMENT_RETENTION_MONTHS = 6",
    "SHARE_ATTACHMENT_MAX_DATA_URL_CHARS = 700000",
    'collection(fbDb, "shareAttachments")',
    "expiresAtMs"
)
Require-Text "src\sections\SharePanel.tsx" @(
    "watchShareAttachments",
    "saveShareAttachment",
    "Email o @username",
    "shareReceiptPreview"
)
Require-Text "src\notifications\appNotifications.ts" @(
    'collection(fbDb, "appNotifications")',
    "markAppNotificationRead"
)
Require-Text "src\notifications\NotificationCenter.tsx" @(
    "watchAppNotifications",
    "Centro notifiche",
    "Segna tutte come lette"
)
Require-Text "src\app.tsx" @(
    "<NotificationCenter",
    'doc(fbDb, "usernames", un)',
    'doc(fbDb, "appNotifications", "share_invite_" + inviteId)'
)
Require-Text "src\sections\DebtCreditsPanel.tsx" @(
    'field("Cerca utente"',
    'placeholder={L("@username")}',
    "counterpartyUsername",
    "findRegisteredUserForShare"
)

Require-Text "src\auth\authService.ts" @(
    "EMAIL_VERIFICATION_POLICY_VERSION = 2",
    'appEnvironment === "test"',
    'cloudFunctionUrl("sendCustomVerificationEmail")',
    "Custom Test verification email unavailable; Firebase fallback used.",
    "await sendEmailVerification(user"
)
Require-Text "functions\index.js" @(
    'const FAINANCE_TEST_PROJECT_ID = "fainance-test-20260823195207"',
    "secrets: [RESEND_API_KEY]",
    "exports.sendCustomVerificationEmail",
    "generateEmailVerificationLink",
    "verificationEmailHtml",
    "resend.emails.send",
    "exports.notifyShareInviteCreated",
    "exports.fanOutImportantCommunication",
    "exports.cleanupExpiredShareAttachments",
    "exports.processDueAccountDeletions",
    'schedule: "30 3 * * *"',
    "deletionGraceDays: Number(profile.deletionGraceDays || 15)"
)
Require-Regex "functions\index.js" @(
    'function requireTestBackend\(response\)[\s\S]*projectId !== FAINANCE_TEST_PROJECT_ID',
    'exports\.sendCustomVerificationEmail[\s\S]*if \(!requireTestBackend\(res\)\) return',
    'exports\.processDueAccountDeletions[\s\S]*if \(!requireTestBackend\(\)\) return'
)

Require-Text "src\account\AccountScreens.tsx" @(
    "useState(false)",
    "newsletterConsentAt",
    'newsletterConsentVersion: "2026-08-27-v1"'
)
Require-Text "src\profile\types.ts" @(
    "newsletterConsentAt?: string",
    "newsletterConsentVersion?: string"
)
Require-Text "src\settings\SettingsPanel.tsx" @(
    'history_currency_priority_v1',
    'L("Importo principale nello Storico")',
    'L("Valuta utilizzata")',
    'L("Valuta predefinita")'
)
Require-Text "src\sezioni.tsx" @(
    "function historyFxView(item)",
    'String(historyCurrencyPriority) === "default"'
)
Require-Text "src\core.tsx" @(
    "shareReceiptScans:0,shareReceiptRetentionMonths:0",
    "shareReceiptScans:2,shareReceiptRetentionMonths:6"
)

Require-Text "admin-app\src\main.tsx" @(
    "publishImportantCommunication",
    'section === "communications"',
    "Pubblica comunicazione",
    "pending_deletion"
)
Require-Text "admin-app\src\adminApi.ts" @(
    'collection(adminDb, "adminCommunications")',
    'environment: "test"'
)
Require-Text "admin-app\src\security.ts" @('"communications.write"')
Require-Text "admin-tools\index-admin-users.mjs" @(
    "deletionStatus",
    "deletionScheduledAt"
)

Require-Text "firestore_share_rules_1.3.25.rules" @(
    "match /shareAttachments/{attachmentId}",
    "match /appNotifications/{notificationId}",
    "match /adminCommunications/{communicationId}",
    "request.resource.data.environment == 'test'",
    "match /usernames/{usernameLower}"
)

$TranslationPath = Require-File "src\i18n\appTranslationPatches.ts"
$TranslationText = [IO.File]::ReadAllText($TranslationPath)
foreach ($Language in @("en", "es", "fr", "de", "pt", "pl", "nl", "ro", "el")) {
    if ($TranslationText -notmatch ("(?m)\b" + [regex]::Escape($Language) + ":")) {
        throw ("Traduzione {0} assente" -f $Language)
    }
    $Checks += 1
}
foreach ($Key in @("Centro notifiche", "Email o @username", "Cerca utente", "6 mesi dalla data di caricamento")) {
    if (!$TranslationText.Contains($Key)) { throw ("Chiave i18n Phase 11 assente: {0}" -f $Key) }
    $Checks += 1
}

$Node = (Get-Command node.exe -ErrorAction Stop).Source
& $Node --check (Require-File "functions\index.js")
if ($LASTEXITCODE -ne 0) { throw "Controllo sintassi Cloud Functions fallito" }
$Checks += 1

if ($RequireBuildArtifacts) {
    foreach ($Artifact in @("dist\index.html", "dist-test\index.html", "admin-app\dist\index.html")) {
        Require-File $Artifact | Out-Null
        $Checks += 1
    }
}

Write-Host ("[OK] {0} controlli superati" -f $Checks) -ForegroundColor Green
Write-Host "[OK] Allegati Share, email, cancellazione 15 giorni, multivaluta, newsletter, notifiche e username" -ForegroundColor Green
Write-Host "[OK] Guardie fail-closed Test/Production" -ForegroundColor Green
