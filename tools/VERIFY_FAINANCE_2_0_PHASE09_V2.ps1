$ErrorActionPreference = "Stop"

$App = Split-Path $PSScriptRoot -Parent
$Widget = Join-Path $App "src\widget.tsx"
$AndroidBuilder = Join-Path $App "tools\BUILD_FAINANCE_ANDROID_TEST.ps1"

function Require-File([string]$Path, [string]$Message) {
    if (!(Test-Path -LiteralPath $Path -PathType Leaf)) { throw $Message }
}

function Require-Text([string]$Source, [string]$Needle, [string]$Message) {
    if ($Source.IndexOf($Needle, [StringComparison]::Ordinal) -lt 0) { throw $Message }
}

Require-File $Widget "src\widget.tsx mancante"
Require-File $AndroidBuilder "tools\BUILD_FAINANCE_ANDROID_TEST.ps1 mancante"
$Source = Get-Content -LiteralPath $Widget -Raw
$BuilderSource = Get-Content -LiteralPath $AndroidBuilder -Raw

Require-Text $Source 'text: L("Cambio valuta disponibile dal piano Base.")' "Avviso piano valuta non trovato"
Require-Text $Source 'color: "#FFD84D"' "Sfondo giallo dell'avviso valuta non trovato"
Require-Text $Source 'textColor: "#5B3A00"' "Contrasto testo dell'avviso giallo non trovato"

$AmountRow = $Source.IndexOf('gap: isMobile ? 6 : 9', [StringComparison]::Ordinal)
if ($AmountRow -lt 0) { throw "Riga importo/valuta affiancata non trovata" }
$AmountContextStart = [Math]::Max(0, $AmountRow - 300)
$AmountContext = $Source.Substring($AmountContextStart, $AmountRow - $AmountContextStart)
if ($AmountContext.IndexOf('alignItems: "center"', [StringComparison]::Ordinal) -lt 0) {
    throw "Valuta non centrata verticalmente con l'importo"
}
$CurrencyField = $Source.IndexOf('<MultiCurrencyField', $AmountRow, [StringComparison]::Ordinal)
if ($CurrencyField -lt 0 -or ($CurrencyField - $AmountRow) -gt 5000) {
    throw "Valuta non posizionata accanto all'importo"
}

$ConditionalConversion = $Source.IndexOf(
    'String(f.currency || ctx.currency) !== String(ctx.currency)',
    $CurrencyField,
    [StringComparison]::Ordinal
)
if ($ConditionalConversion -lt 0 -or ($ConditionalConversion - $CurrencyField) -gt 3000) {
    throw "Conversione condizionale nella valuta predefinita non trovata"
}
Require-Text $Source '≈ {Number(f.baseAmount).toFixed(2)} {String(ctx.currency || "EUR")}' "Importo convertito nella valuta predefinita non trovato"

if ($Source.IndexOf('justifyContent: "center", marginTop: 5', [StringComparison]::Ordinal) -ge 0) {
    throw "Rilevato il vecchio posizionamento della valuta sotto l'importo"
}

Require-Text $BuilderSource '[int]$VersionCode = 200800' "VersionCode parametrico APK Test non trovato"
Require-Text $BuilderSource '[string]$VersionName = "2.0.0-test-p08"' "VersionName parametrico APK Test non trovato"
Require-Text $BuilderSource '$CandidateProjectOk -and $CandidatePackageOk' "Validazione fail-closed configurazione Firebase Test non trovata"
Require-Text $BuilderSource "errore di chiusura della CLI" "Gestione errore transitorio Firebase CLI non trovata"

Write-Host "[OK] Popup limite valuta con sfondo giallo" -ForegroundColor Green
Write-Host "[OK] Valuta selezionata affiancata all'importo" -ForegroundColor Green
Write-Host "[OK] Conversione in valuta predefinita solo quando necessaria" -ForegroundColor Green
Write-Host "[OK] Builder APK versionato e resistente alla chiusura anomala Firebase CLI" -ForegroundColor Green
