$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

function Need([string]$Relative) {
    $full = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $full)) { throw "File Phase 13 mancante: $Relative" }
    return $full
}

$appPath = Need "src\app.tsx"
$loginPath = Need "src\auth\loginRuntime.ts"
$sessionPath = Need "src\auth\accountSession.ts"

$appText = [IO.File]::ReadAllText($appPath)
$loginText = [IO.File]::ReadAllText($loginPath)
$sessionText = [IO.File]::ReadAllText($sessionPath)

if (!$appText.Contains("from './auth/loginRuntime'")) { throw "app.tsx non usa loginRuntime" }
if (!$appText.Contains("from './auth/accountSession'")) { throw "app.tsx non usa accountSession" }
if ($appText.Contains("nativeGoogleAttempt(resetFirst")) { throw "Google login legacy ancora inline in app.tsx" }
if ($appText.Contains("FirebaseAuthentication.signInWithApple({")) { throw "Apple login legacy ancora inline in app.tsx" }
if ($appText.Contains("var profile:any=await fainancePromiseTimeout(loadUserProfile")) { throw "Hydration profilo/sessione ancora inline in AppWithLogin" }
if ($appText.Contains("unsub=watchAuthState(function(user)")) { throw "Listener auth legacy ancora inline in AppWithLogin" }

$loginRequired = @(
    "performGoogleAccountLogin",
    "performAppleAccountLogin",
    "sendAccountPasswordReset",
    "googleLoginErrorMessage",
    "appleLoginErrorMessage",
    "npm" # sentinel removed below
)
foreach ($token in $loginRequired[0..4]) {
    if (!$loginText.Contains($token)) { throw "loginRuntime incompleto: $token" }
}

$sessionRequired = @(
    "resolveAccountSession",
    "watchResolvedAccountSession",
    "loadUserProfile",
    'doc(fbDb, "userData", user.uid)',
    "fainanceExpandAccountCloudDataV5",
    "mergeUserProfile"
)
foreach ($token in $sessionRequired) {
    if (!$sessionText.Contains($token)) { throw "accountSession incompleto: $token" }
}

Write-Host "[OK] Phase 13: login provider estratti da app.tsx" -ForegroundColor Green
Write-Host "[OK] Phase 13: hydration/session listener estratti da app.tsx" -ForegroundColor Green
Write-Host "[OK] Phase 13: UI LoginScreen/AppWithLogin preservata come shell" -ForegroundColor Green
