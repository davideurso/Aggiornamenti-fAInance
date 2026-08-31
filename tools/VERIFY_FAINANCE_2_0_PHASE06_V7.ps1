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

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 06 V7 ===" -ForegroundColor Cyan

$Settings = [IO.File]::ReadAllText((Need "src\settings\SettingsPanel.tsx"))
$Library = [IO.File]::ReadAllText((Need "src\icons\customIconLibrary.tsx"))
$Translations = [IO.File]::ReadAllText((Need "src\i18n\appTranslationPatches.ts"))
$AndroidBuild = [IO.File]::ReadAllText((Need "tools\BUILD_FAINANCE_ANDROID_TEST.ps1"))

Must $Settings 'useState, useEffect, useRef' 'useRef non importato'
Must $Settings 'pickNativeCustomIconFile' 'Picker nativo non collegato'
Must $Settings 'var iconFileInputRef=useRef<any>(null);' 'Input file Web non inizializzato'
Must $Settings 'input.click();' 'File picker Web non aperto esplicitamente'
Must $Settings 'onClick={chooseIcon}' 'Bottone upload non collegato'
Must $Settings 'accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.jfif"' 'Formati immagine non configurati'
MustNot $Settings '<label style={{height:48' 'Vecchio uploader label ancora presente'

Must $Library 'await import("@capacitor/camera")' 'Capacitor Camera mancante'
Must $Library 'Camera.pickImages({ limit: 1, quality: 100 })' 'Galleria Android mancante'
Must $Library 'return new File([blob], name, { type, lastModified: Date.now() });' 'Conversione Android File mancante'
Must $Library 'CUSTOM_ICON_CANCELLED' 'Gestione annullamento mancante'
Must $Library 'await setDoc(doc(fbDb, "users", user.uid, "customIcons", id), row' 'Salvataggio Firestore icone mancante'

foreach($Key in @(
  'Icone personali',
  'Carica nuova icona',
  'Icona personale caricata',
  "Impossibile caricare l'icona personale.",
  'Disponibile per tutti i piani.'
)){
    Must $Translations $Key ("Traduzione mancante: {0}" -f $Key)
}

Must $AndroidBuild '$TestProject = "fainance-test-20260823195207"' 'Firebase Test Android inatteso'
Must $AndroidBuild '$ProductionProject = "fainance-a7794"' 'Guard Production mancante'
Must $AndroidBuild '$TestPackage = "it.fainanceapp.app.test"' 'Package Test separato mancante'
Must $AndroidBuild 'fAInance-2.0.0-TEST-P06V7.apk' 'Nome APK Test inatteso'
Must $AndroidBuild 'assembleDebug' 'assembleDebug mancante'

Must $AndroidBuild 'function Invoke-FirebaseCaptured([string[]]$Arguments,[string]$Operation)' 'Wrapper Firebase robusto mancante'
Must $AndroidBuild '$StdoutFile = Join-Path $env:TEMP' 'Cattura stdout Firebase mancante'
Must $AndroidBuild '$StderrFile = Join-Path $env:TEMP' 'Cattura stderr Firebase mancante'
Must $AndroidBuild '& $env:ComSpec /d /s /c $CommandLine' 'firebase.cmd non isolato tramite cmd.exe'
Must $AndroidBuild '$ExitCode = $LASTEXITCODE' 'Exit code Firebase non catturato'
Must $AndroidBuild 'if ($ExitCode -ne 0)' 'Firebase CLI non fail-closed'
Must $AndroidBuild '$ListResult = Invoke-FirebaseCaptured @("apps:list","ANDROID","--project",$TestProject,"--json")' 'apps:list non usa il wrapper'
Must $AndroidBuild '$ListJson = Json-From-Output $ListResult.Stdout' 'apps:list non usa solo stdout JSON'
Must $AndroidBuild '$CreateResult = Invoke-FirebaseCaptured @("apps:create","ANDROID","fAInance Test","--package-name",$TestPackage,"--project",$TestProject,"--json")' 'apps:create non usa il wrapper'
Must $AndroidBuild '$SdkResult = Invoke-FirebaseCaptured @("apps:sdkconfig","ANDROID",$FirebaseAppId,"--project",$TestProject)' 'sdkconfig non usa il wrapper'
Must $AndroidBuild '$SdkText = [string]$SdkResult.Stdout' 'sdkconfig non usa stdout separato'
MustNot $AndroidBuild '& $Firebase apps:list ANDROID' 'Vecchio apps:list diretto presente'
MustNot $AndroidBuild '& $Firebase apps:sdkconfig ANDROID' 'Vecchio sdkconfig diretto presente'

Must $AndroidBuild 'function Restore-NativeProject' 'Ripristino Android mancante'
Must $AndroidBuild 'try { Restore-NativeProject } catch {}' 'Ripristino Android finally mancante'
MustNot $AndroidBuild 'firebase deploy' 'Build APK non deve fare deploy Firebase'

Write-Host "[OK] Upload icone Web/Android verificato" -ForegroundColor Green
Write-Host "[OK] Firebase CLI stdout/stderr separati" -ForegroundColor Green
Write-Host "[OK] Exit code Firebase fail-closed" -ForegroundColor Green
Write-Host "[OK] APK Test separato verificato" -ForegroundColor Green
Write-Host "[OK] Phase 06 V7 verificata" -ForegroundColor Green
exit 0
