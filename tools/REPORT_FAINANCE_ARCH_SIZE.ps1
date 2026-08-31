$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
Write-Host "`n=== FAINANCE ARCHITECTURE SIZE REPORT ===" -ForegroundColor Cyan
$files = @(
    "src\app.tsx",
    "src\sezioni.tsx",
    "src\traduzioni.tsx",
    "src\data\syncAlgorithms.ts",
    "src\finance\movementRules.ts",
    "src\finance\recurringRules.ts",
    "src\finance\historySorting.ts",
    "src\finance\debtCredit.ts",
    "src\finance\paymentCards.ts",
    "src\auth\loginRuntime.ts",
    "src\auth\accountSession.ts",
    "src\data\accountCloudCodec.ts",
    "src\auth\authService.ts",
    "src\profile\profileService.ts",
    "src\ui\appInfrastructure.tsx",
    "src\i18n\translationData.ts"
)
foreach ($relative in $files) {
    $path = Join-Path $App $relative
    if (Test-Path -LiteralPath $path) {
        $kb = [math]::Round((Get-Item -LiteralPath $path).Length / 1KB, 1)
        Write-Host ($relative.PadRight(42) + $kb.ToString().PadLeft(10) + " KB")
    }
}
