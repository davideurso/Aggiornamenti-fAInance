$ErrorActionPreference = "Stop"
$App = Split-Path -Parent $PSScriptRoot
function Need([string]$R){$P=Join-Path $App $R;if(!(Test-Path -LiteralPath $P)){throw ("File mancante: {0}" -f $R)};return $P}
function Must([string]$T,[string]$V,[string]$M){if($T.IndexOf($V,[System.StringComparison]::Ordinal)-lt 0){throw $M}}
function MustNot([string]$T,[string]$V,[string]$M){if($T.IndexOf($V,[System.StringComparison]::Ordinal)-ge 0){throw $M}}
Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 08 ===" -ForegroundColor Cyan
$Share=[IO.File]::ReadAllText((Need "src\sections\SharePanel.tsx"))
$I18n=[IO.File]::ReadAllText((Need "src\i18n\appTranslationPatches.ts"))
$Main=[IO.File]::ReadAllText((Need "src\main.tsx"))
$Build=[IO.File]::ReadAllText((Need "tools\BUILD_FAINANCE_ANDROID_TEST.ps1"))
$Start=[IO.File]::ReadAllText((Need "tools\START_FAINANCE_TEST.ps1"))
Need "src\assets\fainance-test-icon.png" | Out-Null

Must $Share 'shareProjectLimitReached&&<div style={{background:dark?"#342b16":"#FFF8E1"' 'Avviso limite Share non presente nel popup Progetti'
MustNot $Share '      {shareProjectLimitReached&&<div style={{background:dark?"#342b16":"#FFF8E1"' 'Avviso limite Share ancora visibile nella pagina principale'
Must $Share 'bg={secondaryButtonColor} style={{padding:"7px 11px",fontSize:12,fontWeight:900' 'Bottone Filtri Share non mappato come secondario'
Must $Share 'L("Filtri e ordine")' 'Titolo Filtri e ordine mancante'
Must $Share 'function shareFilterAccordion(id,title,accent,children)' 'Grafica filtri Share stile Storico mancante'
Must $Share 'L("Parola chiave")' 'Blocco parola chiave filtri mancante'
Must $Share 'shareFilterAccordion("period",L("Periodo"),"#7F77DD"' 'Sezione Periodo stile Storico mancante'
Must $Share 'shareFilterAccordion("amount",L("Importo"),"#F59E0B"' 'Sezione Importo stile Storico mancante'
Must $Share 'shareFilterAccordion("payer",L("Pagatore"),"#10B981"' 'Sezione Pagatore stile Storico mancante'
Must $Share 'shareFilterAccordion("order",L("Ordine"),"#3B82F6"' 'Sezione Ordine stile Storico mancante'
Must $Share 'var [shareSortDirection,setShareSortDirection]=useState("desc");' 'Ordine Share default non piu recente'
Must $Share 'function shareReceiptAllowed(){return currentPlan==="base"||currentPlan==="premium";}' 'Funzioni Phase 07 ricevute non preservate'

foreach($Key in @('Filtri e ordine','Spese del progetto','Pagatore','Tutto il periodo','Qualsiasi importo')){Must $I18n $Key ("Traduzione Phase 08 mancante: {0}" -f $Key)}
foreach($Lang in @("'it'","'en'","'es'","'fr'","'de'","'pt'","'pl'","'nl'","'ro'","'el'")){Must $I18n $Lang ("Lingua i18n mancante: {0}" -f $Lang)}

Must $Main "import fainanceTestIcon from './assets/fainance-test-icon.png'" 'Logo Web Test non importato'
Must $Main "document.title = 'fAInance Test'" 'Nome browser Test non applicato'
Must $Main "import.meta.env.MODE === 'test'" 'Branding Web non limitato alla build Test'
Must $Main "icon.href = fainanceTestIcon" 'Favicon Test non applicata'

Must $Build '$TestProject = "fainance-test-20260823195207"' 'Firebase Android Test inatteso'
Must $Build '$ProductionProject = "fainance-a7794"' 'Guard Production Android mancante'
Must $Build '$TestPackage = "it.fainanceapp.app.test"' 'Package Test separato mancante'
Must $Build '$TestBrandIcon = Join-Path $App "src\assets\fainance-test-icon.png"' 'Logo launcher Test non collegato'
Must $Build '<string name="app_name">fAInance Test</string>' 'Nome Android Test non applicato'
Must $Build 'Copy-Item -LiteralPath $TestBrandIcon -Destination $LauncherTarget -Force' 'Logo Android Test non copiato'
Must $Build 'fAInance-Test-2.0.0-P08.apk' 'Nome APK Test inatteso'
Must $Build 'versionCode 200800' 'VersionCode Test inatteso'
Must $Build 'versionName "2.0.0-test-p08"' 'VersionName Test inatteso'
Must $Build 'for ($Attempt = 1; $Attempt -le 3 -and !$SdkOk; $Attempt++)' 'Retry sdkconfig Firebase mancante'
MustNot $Build 'firebase deploy' 'La build Android Test non deve fare deploy Firebase'

Must $Start '[switch]$NoBrowser' 'START Test senza modalità NoBrowser'
Must $Start 'if (!$NoBrowser) { Start-Process $Url }' 'START Test apre sempre il browser'

Write-Host "[OK] Avviso limite spostato nel popup Progetti" -ForegroundColor Green
Write-Host "[OK] Bottone Filtri mappato come Secondario" -ForegroundColor Green
Write-Host "[OK] Filtri e ordine allineati graficamente allo Storico" -ForegroundColor Green
Write-Host "[OK] Branding Web/Android fAInance Test separato" -ForegroundColor Green
Write-Host "[OK] Traduzioni 10 lingue verificate" -ForegroundColor Green
exit 0
