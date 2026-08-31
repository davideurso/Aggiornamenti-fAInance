$ErrorActionPreference = "Stop"

$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

function Require-File([string]$Relative) {
    $full = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $full)) {
        throw "File Phase 12 mancante: $Relative"
    }
    return $full
}

$appPath = Require-File "src\app.tsx"
$uiPath = Require-File "src\ui\appInfrastructure.tsx"
$runtimePath = Require-File "src\utils\appRuntime.ts"
$identityPath = Require-File "src\auth\accountIdentity.ts"
$base64Path = Require-File "src\utils\base64.ts"
$envPath = Require-File "src\config\runtimeEnvironment.ts"
$codecPath = Require-File "src\data\accountCloudCodec.ts"
$sensitivePath = Require-File "src\security\sensitiveStorage.ts"

$appText = [IO.File]::ReadAllText($appPath)

$requiredImports = @(
    "from './ui/appInfrastructure'",
    "from './utils/appRuntime'",
    "from './auth/accountIdentity'",
    "from './data/accountCloudCodec'",
    "from './config/runtimeEnvironment'",
    "from './security/sensitiveStorage'"
)

foreach ($needle in $requiredImports) {
    if (!$appText.Contains($needle)) {
        throw "app.tsx non usa il modulo estratto: $needle"
    }
}

$movedDefinitions = @(
    "var FAINANCE_TOAST_CURRENT:any=null;",
    "function publishFainanceToast(",
    "function GlobalToastHost(",
    "function GlobalNumericInputAssist(",
    "function StableCurrencyPicker(",
    "function focusFainanceInput(",
    "function fainancePromiseTimeout(",
    "function fainanceMinimalAuthUser(",
    "function fainanceResolveLegalAcceptance(",
    "const FAINANCE_ACCOUNT_DATA_COMPRESSION_V5=",
    "function fainanceBytesToBase64(",
    "function fainanceBase64ToBytes(",
    "function useFainanceSensitiveStorage(",
    "function numOr(v:any,f:any)",
    "function readFainanceStoredLang("
)

foreach ($needle in $movedDefinitions) {
    if ($appText.Contains($needle)) {
        throw "Definizione ancora monolitica in app.tsx: $needle"
    }
}

$uiText = [IO.File]::ReadAllText($uiPath)
foreach ($needle in @("export var FAINANCE_TOAST_CURRENT", "export function publishFainanceToast", "export function GlobalToastHost", "export function GlobalNumericInputAssist", "export function StableCurrencyPicker")) {
    if (!$uiText.Contains($needle)) { throw "Modulo UI incompleto: $needle" }
}

$runtimeText = [IO.File]::ReadAllText($runtimePath)
foreach ($needle in @("export function focusFainanceInput", "export function fainancePromiseTimeout", "export function numOr", "export function readFainanceStoredLang")) {
    if (!$runtimeText.Contains($needle)) { throw "Modulo runtime incompleto: $needle" }
}

$identityText = [IO.File]::ReadAllText($identityPath)
foreach ($needle in @("export function fainanceMinimalAuthUser", "export function fainanceResolveLegalAcceptance")) {
    if (!$identityText.Contains($needle)) { throw "Modulo account identity incompleto: $needle" }
}

$codecText = [IO.File]::ReadAllText($codecPath)
foreach ($needle in @("export async function fainanceCompressAccountDataV5", "export async function fainanceExpandAccountCloudDataV5")) {
    if (!$codecText.Contains($needle)) { throw "Modulo cloud codec incompleto: $needle" }
}

$envText = [IO.File]::ReadAllText($envPath)
if (!$envText.Contains("export async function fainanceIsTestBuild")) {
    throw "Modulo runtime environment incompleto"
}

$sensitiveText = [IO.File]::ReadAllText($sensitivePath)
if (!$sensitiveText.Contains("export function useFainanceSensitiveStorage")) {
    throw "Modulo sensitive storage incompleto"
}

$base64Text = [IO.File]::ReadAllText($base64Path)
foreach ($needle in @("export function fainanceBytesToBase64", "export function fainanceBase64ToBytes")) {
    if (!$base64Text.Contains($needle)) { throw "Modulo Base64 incompleto: $needle" }
}

$appBytes = (Get-Item -LiteralPath $appPath).Length
if ($appBytes -ge 1225043) {
    throw "app.tsx non risulta ridotto rispetto alla Phase 11"
}

Write-Host "[OK] Phase 12 structure: app infrastructure estratta" -ForegroundColor Green
Write-Host "[OK] Toast + numeric assist + currency picker modularizzati" -ForegroundColor Green
Write-Host "[OK] Runtime helpers + account identity modularizzati" -ForegroundColor Green
Write-Host "[OK] Cloud codec + runtime environment modularizzati" -ForegroundColor Green
Write-Host "[OK] Sensitive storage + Base64 modularizzati" -ForegroundColor Green
Write-Host "[OK] app.tsx ridotto a $appBytes byte" -ForegroundColor Green
