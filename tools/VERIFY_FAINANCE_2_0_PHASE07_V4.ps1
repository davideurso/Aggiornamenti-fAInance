$ErrorActionPreference = "Stop"
$App = Split-Path -Parent $PSScriptRoot
function Need([string]$R){$P=Join-Path $App $R;if(!(Test-Path -LiteralPath $P)){throw ("File mancante: {0}" -f $R)};return $P}
function Must([string]$T,[string]$V,[string]$M){if($T.IndexOf($V,[System.StringComparison]::Ordinal)-lt 0){throw $M}}
function MustNot([string]$T,[string]$V,[string]$M){if($T.IndexOf($V,[System.StringComparison]::Ordinal)-ge 0){throw $M}}

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 07 V4 ===" -ForegroundColor Cyan
$Share=[IO.File]::ReadAllText((Need "src\sections\SharePanel.tsx"))
$I18n=[IO.File]::ReadAllText((Need "src\i18n\appTranslationPatches.ts"))
$Android=[IO.File]::ReadAllText((Need "tools\BUILD_FAINANCE_ANDROID_TEST.ps1"))
$Start=[IO.File]::ReadAllText((Need "tools\START_FAINANCE_TEST.ps1"))

Must $Share 'gridTemplateColumns:"44px minmax(0,1fr) 44px"' 'Layout Importo Share errato'
Must $Share '<AmountCalculatorButton value={shareAmount} onApply={function(next){setShareAmount(next);}} inverse compact iconOnly iconSize={34}/><div style={{minWidth:0,textAlign:"center"}}>' 'Calcolatrice Share non a sinistra'
Must $Share 'var [shareSortDirection,setShareSortDirection]=useState("desc");' 'Ordinamento Share default errato'
Must $Share 'var shareFilteredActivities=shareAllActivities.filter(function(a)' 'Filtri Share assenti'
Must $Share 'comment:String(settlementComment||"").trim()' 'Commento rimborso assente'
Must $Share 'function shareReceiptAllowed(){return currentPlan==="base"||currentPlan==="premium";}' 'Gate ricevute errato'
Must $Share 'expiresAt:addSixMonthsIso()' 'Retention ricevuta 6 mesi assente'
Must $I18n 'Carica ricevuta' 'Traduzioni ricevuta assenti'
Must $I18n 'Funzione disponibile a partire dal piano Base' 'Traduzione piano Base assente'

Must $Start '[switch]$NoBrowser' 'NoBrowser non implementato'
Must $Start 'if (!$NoBrowser) { Start-Process $Url }' 'Apertura browser non protetta'
Must $Start '[int]$HttpRequestTimeoutSeconds = 15' 'Timeout HTTP START assente'

Must $Android 'fAInance-2.0.0-TEST-P07V4.apk' 'Nome APK V2 errato'
Must $Android 'versionCode 200704' 'versionCode V2 errato'
Must $Android 'versionName "2.0.0-test-p07v4"' 'versionName V2 errato'
Must $Android '$env:CI = "1"' 'Modalita CI Firebase assente'
Must $Android 'apps:sdkconfig ANDROID $FirebaseAppId --project $TestProject --non-interactive -o $SdkTemp' 'sdkconfig diretto su file assente'
Must $Android 'for ($Attempt = 1; $Attempt -le 3 -and !$SdkOk; $Attempt++)' 'Retry sdkconfig assente'
MustNot $Android '$SdkResult = Invoke-FirebaseCaptured @("apps:sdkconfig"' 'Vecchio sdkconfig catturato ancora presente'

Write-Host "[OK] Phase 07 V2 verificata" -ForegroundColor Green
exit 0
