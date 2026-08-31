$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

function Need([string]$Relative) {
    $full = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $full)) { throw "File Phase 14 mancante: $Relative" }
    return $full
}

$appPath = Need "src\app.tsx"
$syncPath = Need "src\data\syncAlgorithms.ts"

$appText = [IO.File]::ReadAllText($appPath)
$syncText = [IO.File]::ReadAllText($syncPath)

if (!$appText.Contains("from './data/syncAlgorithms'")) {
    throw "app.tsx non usa syncAlgorithms"
}

$mustNotRemainInline = @(
    "function accountSyncErrorInfo(",
    "function accountSyncIsTransientError(",
    "function syncJsonEqual(",
    "function syncRecordTime(",
    "function syncComparableRecord(",
    "function syncTombstoneTime(",
    "function isExplicitSyncTombstone(",
    "function mergeSyncTombstones(",
    "function mergeSyncRecords(",
    "function stampLocalSyncRecords(",
    "function removedSyncRecordTombstones(",
    "function accountSyncRecordKey("
)

foreach ($token in $mustNotRemainInline) {
    if ($appText.Contains($token)) {
        throw "Algoritmo sync ancora inline in app.tsx: $token"
    }
}

$requiredExports = @(
    "export function accountSyncErrorInfo",
    "export function accountSyncIsTransientError",
    "export function syncJsonEqual",
    "export function syncRecordTime",
    "export function syncComparableRecord",
    "export function syncTombstoneTime",
    "export function isExplicitSyncTombstone",
    "export function mergeSyncTombstones",
    "export function mergeSyncRecords",
    "export function stampLocalSyncRecords",
    "export function removedSyncRecordTombstones",
    "export function accountSyncRecordKey"
)

foreach ($token in $requiredExports) {
    if (!$syncText.Contains($token)) {
        throw "syncAlgorithms incompleto: $token"
    }
}

$forbiddenSideEffects = @(
    "firebase",
    "localStorage",
    "sessionStorage",
    "document.",
    "window.",
    "useState(",
    "useEffect("
)

foreach ($token in $forbiddenSideEffects) {
    if ($syncText.IndexOf($token, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
        throw "syncAlgorithms deve restare puro; dipendenza vietata rilevata: $token"
    }
}

Write-Host "[OK] Phase 14: kernel sincronizzazione estratto da app.tsx" -ForegroundColor Green
Write-Host "[OK] Phase 14: merge/tombstone/timestamp algorithms centralizzati" -ForegroundColor Green
Write-Host "[OK] Phase 14: syncAlgorithms privo di side effect React/Firebase/storage" -ForegroundColor Green
