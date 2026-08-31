$ErrorActionPreference = "Stop"

$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

function Require-File([string]$Relative) {
    $Path = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $Path)) { throw "File mancante: $Relative" }
    return $Path
}

function Assert-Match([string]$Text,[string]$Pattern,[string]$Message) {
    if ($Text -notmatch $Pattern) { throw $Message }
}

function Assert-NoMatch([string]$Text,[string]$Pattern,[string]$Message) {
    if ($Text -match $Pattern) { throw $Message }
}

Write-Host "`n=== VERIFICA FAINANCE PHASE 15 V4 ===" -ForegroundColor Cyan

$AppPath = Require-File "src\app.tsx"
$PolicyPath = Require-File "src\finance\bulkMovementPolicy.ts"
Require-File "src\finance\movementRules.ts" | Out-Null
Require-File "src\finance\recurringRules.ts" | Out-Null
Require-File "src\finance\historySorting.ts" | Out-Null
Require-File "src\finance\debtCredit.ts" | Out-Null
Require-File "src\finance\paymentCards.ts" | Out-Null

$Text = [IO.File]::ReadAllText($AppPath)
$Policy = [IO.File]::ReadAllText($PolicyPath)

Assert-Match $Text 'from\s+[''"]\./finance/movementRules[''"]' "Import movementRules mancante"
Assert-Match $Text 'from\s+[''"]\./finance/recurringRules[''"]' "Import recurringRules mancante"
Assert-Match $Text 'from\s+[''"]\./finance/historySorting[''"]' "Import historySorting mancante"
Assert-Match $Text 'from\s+[''"]\./finance/debtCredit[''"]' "Import debtCredit mancante"
Assert-Match $Text 'from\s+[''"]\./finance/paymentCards[''"]' "Import paymentCards mancante"
Assert-Match $Text 'import\s*\{[^}]*nextBulkMovementAllowedAt[^}]*isBulkMovementLocked[^}]*\}\s*from\s*[''"]\./finance/bulkMovementPolicy[''"]' "Import bulkMovementPolicy incompleto"

Assert-Match $Text 'function\s+bulkMovementNextAllowedAt\(\)\s*\{\s*return\s+nextBulkMovementAllowedAt\(currentPlan\s*,\s*bulkMovementLastAt\(\)\)\s*;\s*\}' "bulkMovementNextAllowedAt non delega al dominio"
Assert-Match $Text 'function\s+bulkMovementLocked\(\)\s*\{\s*return\s+isBulkMovementLocked\(currentPlan\s*,\s*bulkMovementLastAt\(\)\s*,\s*Date\.now\(\)\)\s*;\s*\}' "bulkMovementLocked non delega al dominio"
Assert-Match $Text 'function\s+recurringDueInCurrentMonth\(r\)\s*\{\s*return\s+isRecurringDueInMonth\(r\s*,\s*now\s*,\s*curMonthKey\)\s*;\s*\}' "Ricorrenze non delegate a recurringRules"
Assert-Match $Text 'return\s+sortFinancialHistoryItems\(' "Storico non delegato a historySorting"
Assert-Match $Text 'function\s+maskCreditCardNumber\(n\)\s*\{\s*return\s+maskPaymentCardNumber\(n\)\s*;\s*\}' "Mascheratura carte non delegata a paymentCards"
Assert-Match $Text 'function\s+balance\(item\)\s*\{\s*return\s+debtCreditBalance\(item\)\s*;\s*\}' "Saldo Debiti/Crediti duplicato nel pannello"
Assert-NoMatch $Text 'function\s+balance\(item\)\s*\{\s*var\s+v\s*=\s*Number\(item\.initialAmount' "Vecchio algoritmo saldo Debiti/Crediti ancora inline"
Assert-NoMatch $Text 'function\s+bulkMovementNextAllowedAt\(\)[\s\S]*?return\s+addMonthsSafe\(last\s*,\s*months\)' "Vecchio calcolo bulkMovementNextAllowedAt ancora inline in app.tsx"

Assert-Match $Policy 'export\s+function\s+nextBulkMovementAllowedAt' "nextBulkMovementAllowedAt mancante"
Assert-Match $Policy 'export\s+function\s+isBulkMovementLocked' "isBulkMovementLocked mancante"
Assert-NoMatch $Policy 'firebase|firestore|localStorage|sessionStorage|useState|useEffect|document\.|window\.' "bulkMovementPolicy deve restare puro"

Write-Host "[OK] Movement rules modularizzate" -ForegroundColor Green
Write-Host "[OK] Bulk movement policy estratta" -ForegroundColor Green
Write-Host "[OK] Recurring rules modularizzate" -ForegroundColor Green
Write-Host "[OK] History sorting modularizzato" -ForegroundColor Green
Write-Host "[OK] Debt/Credit balance centralizzato" -ForegroundColor Green
Write-Host "[OK] Payment card masking centralizzato" -ForegroundColor Green
Write-Host "[OK] Nessun algoritmo duplicato rilevato nei residui Phase 15" -ForegroundColor Green
exit 0
