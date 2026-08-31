$ErrorActionPreference = "Stop"
$App = Split-Path -Parent $PSScriptRoot

function Need([string]$R){
    $P = Join-Path $App $R
    if(!(Test-Path -LiteralPath $P)){ throw ("File mancante: {0}" -f $R) }
    return $P
}
function Must([string]$T,[string]$V,[string]$M){
    if($T.IndexOf($V,[System.StringComparison]::Ordinal) -lt 0){ throw $M }
}
function MustNot([string]$T,[string]$V,[string]$M){
    if($T.IndexOf($V,[System.StringComparison]::Ordinal) -ge 0){ throw $M }
}

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 03 V8 ===" -ForegroundColor Cyan

$Account = [IO.File]::ReadAllText((Need "src\account\AccountScreens.tsx"))
$Auth = [IO.File]::ReadAllText((Need "src\auth\authService.ts"))
$Session = [IO.File]::ReadAllText((Need "src\auth\accountSession.ts"))
$Types = [IO.File]::ReadAllText((Need "src\profile\types.ts"))
$Start = [IO.File]::ReadAllText((Need "tools\START_FAINANCE_TEST.ps1"))

# Login identifier stays email OR username.
Must $Account 'signInWithAccountIdentifier(email,password)' "Login email/username non collegato"
Must $Auth 'getDoc(doc(fbDb, "usernameLogin", key))' "Lookup username login mancante"

# Verification must be policy-driven, never blanket on every unverified legacy account.
Must $Auth 'export const EMAIL_VERIFICATION_POLICY_VERSION = 1;' "Versione policy verifica email mancante"
Must $Auth 'export async function accountRequiresEmailVerification(user: User): Promise<boolean>' "Resolver policy verifica email mancante"
Must $Auth 'if (!profileSnap.exists()) return false;' "Migrazione legacy non fail-safe"
Must $Auth 'version >= EMAIL_VERIFICATION_POLICY_VERSION && data.emailVerificationRequired === true' "Policy verifica email non versionata"
Must $Account 'var requiresVerification=hasPasswordProvider&&!authUser.emailVerified?await accountRequiresEmailVerification(authUser):false;' "Login non usa la policy verifica email"
MustNot $Account 'if(hasPasswordProvider&&!authUser.emailVerified){' "Blocco indiscriminato degli account legacy ancora presente"
Must $Account 'setVerificationEmail("");setLoading(true);' "Stato avviso verifica email non azzerato al nuovo login"

# Only accounts created from this policy onward are explicitly marked v1.
Must $Account 'emailVerificationPolicyVersion:EMAIL_VERIFICATION_POLICY_VERSION,emailVerificationRequired:true' "Nuovi account non marcati come soggetti a verifica email"
Must $Account 'emailVerificationRequiredAt:new Date().toISOString()' "Timestamp policy verifica nuovi account mancante"

# Existing users are explicitly migrated to v0 and must not be blocked.
Must $Session 'profile.emailVerificationPolicyVersion = 0;' "Migrazione account legacy a policy v0 mancante"
Must $Session 'profile.emailVerificationRequired = false;' "Account legacy non marcati come esenti dalla verifica"
Must $Session 'profileUpdate.emailVerificationMigratedAt = new Date().toISOString();' "Timestamp migrazione legacy mancante"

Must $Types 'emailVerificationPolicyVersion?: number;' "Tipo policy verifica email mancante"
Must $Types 'emailVerificationRequired?: boolean;' "Tipo flag verifica email mancante"

# V7 startup fix must remain intact.
Must $Start '[OK] fAInance Test HTTP 200' "START_FAINANCE_TEST non certifica HTTP 200"

Write-Host "[OK] Login email/username invariato" -ForegroundColor Green
Write-Host "[OK] Verifica email obbligatoria SOLO per nuovi account policy v1" -ForegroundColor Green
Write-Host "[OK] Account legacy migrati a policy v0 senza blocco" -ForegroundColor Green
Write-Host "[OK] Falsi avvisi verifica email rimossi dal login legacy" -ForegroundColor Green
Write-Host "[OK] Phase 03 V8 verificata" -ForegroundColor Green
exit 0
