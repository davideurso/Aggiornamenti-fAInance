param(
    [string]$OutputName = "fAInance-Test-2.0.0-RC1.apk",
    [int]$VersionCode = 202001,
    [string]$VersionName = "2.0.0-test-rc1"
)

$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$Download = Join-Path $env:USERPROFILE "Downloads"
$TestProject = "fainance-test-20260823195207"
$ProductionProject = "fainance-a7794"
$TestPackage = "it.fainanceapp.app.test"
$BuildGradle = Join-Path $App "android\app\build.gradle"
$GoogleServices = Join-Path $App "android\app\google-services.json"
$Manifest = Join-Path $App "android\app\src\main\AndroidManifest.xml"
$StringsXml = Join-Path $App "android\app\src\main\res\values\strings.xml"
$TestBrandIcon = Join-Path $App "src\assets\fainance-test-icon.png"
$LauncherTargets = @(
    "android\app\src\main\res\mipmap-ldpi\ic_launcher.png",
    "android\app\src\main\res\mipmap-ldpi\ic_launcher_round.png",
    "android\app\src\main\res\mipmap-ldpi\ic_launcher_foreground.png",
    "android\app\src\main\res\mipmap-mdpi\ic_launcher.png",
    "android\app\src\main\res\mipmap-mdpi\ic_launcher_round.png",
    "android\app\src\main\res\mipmap-mdpi\ic_launcher_foreground.png",
    "android\app\src\main\res\mipmap-hdpi\ic_launcher.png",
    "android\app\src\main\res\mipmap-hdpi\ic_launcher_round.png",
    "android\app\src\main\res\mipmap-hdpi\ic_launcher_foreground.png",
    "android\app\src\main\res\mipmap-xhdpi\ic_launcher.png",
    "android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png",
    "android\app\src\main\res\mipmap-xhdpi\ic_launcher_foreground.png",
    "android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png",
    "android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png",
    "android\app\src\main\res\mipmap-xxhdpi\ic_launcher_foreground.png",
    "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png",
    "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png",
    "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.png"
) | ForEach-Object { Join-Path $App $_ }
$NativeBrandFiles = @($StringsXml) + @($LauncherTargets)
$BackupDir = Join-Path $env:TEMP ("FAINANCE_ANDROID_TEST_" + [guid]::NewGuid().ToString("N"))
$OutputApk = Join-Path $Download $OutputName
$OutputSha = $OutputApk + ".sha256.txt"
$Success = $false

if ($VersionCode -lt 1) { throw "VersionCode Android non valido" }
if ($VersionName -notmatch '^[0-9A-Za-z._-]+$') { throw "VersionName Android non valido" }

function Require-File([string]$Path,[string]$Message) {
    if (!(Test-Path -LiteralPath $Path)) { throw $Message }
}

function Command-Path([string]$Name) {
    return (Get-Command $Name -ErrorAction Stop).Source
}

function Quote-CmdArgument([string]$Value) {
    if ($null -eq $Value) { return '""' }
    return '"' + $Value.Replace('"','""') + '"'
}

function Invoke-FirebaseCaptured([string[]]$Arguments,[string]$Operation) {
    $StdoutFile = Join-Path $env:TEMP ("FAINANCE_FIREBASE_STDOUT_" + [guid]::NewGuid().ToString("N") + ".txt")
    $StderrFile = Join-Path $env:TEMP ("FAINANCE_FIREBASE_STDERR_" + [guid]::NewGuid().ToString("N") + ".txt")
    try {
        $ArgText = (@($Arguments | ForEach-Object { Quote-CmdArgument ([string]$_) }) -join " ")
        $CommandLine = 'call ' + (Quote-CmdArgument $Firebase) + ' ' + $ArgText +
            ' 1>' + (Quote-CmdArgument $StdoutFile) + ' 2>' + (Quote-CmdArgument $StderrFile)

        & $env:ComSpec /d /s /c $CommandLine
        $ExitCode = $LASTEXITCODE

        $Stdout = if (Test-Path -LiteralPath $StdoutFile) {
            [IO.File]::ReadAllText($StdoutFile)
        } else { "" }
        $Stderr = if (Test-Path -LiteralPath $StderrFile) {
            [IO.File]::ReadAllText($StderrFile)
        } else { "" }

        if ($ExitCode -ne 0) {
            $Detail = $Stderr.Trim()
            if (!$Detail) { $Detail = $Stdout.Trim() }
            throw ("{0} fallito: exit {1}. {2}" -f $Operation,$ExitCode,$Detail)
        }

        return [pscustomobject]@{
            ExitCode = $ExitCode
            Stdout = $Stdout
            Stderr = $Stderr
        }
    } finally {
        Remove-Item -LiteralPath $StdoutFile,$StderrFile -Force -ErrorAction SilentlyContinue
    }
}

function Json-From-Output($Lines) {
    $Text = (@($Lines) -join "`n").Trim()
    $Start = $Text.IndexOf("{")
    $End = $Text.LastIndexOf("}")
    if ($Start -lt 0 -or $End -le $Start) { throw "Output JSON Firebase non riconosciuto" }
    return $Text.Substring($Start, $End - $Start + 1) | ConvertFrom-Json
}

function Find-JavaHome {
    $Candidates = @(
        $env:JAVA_HOME,
        "C:\Programmi\Android\Android Studio\jbr",
        "C:\Program Files\Android\Android Studio\jbr"
    ) | Where-Object { $_ }
    foreach ($Candidate in $Candidates) {
        if (Test-Path -LiteralPath (Join-Path $Candidate "bin\java.exe")) { return $Candidate }
    }
    throw "Java Android Studio non trovato. Installazione APK bloccata."
}

function Find-PackageName($AppRow) {
    try { if ($AppRow.packageName) { return [string]$AppRow.packageName } } catch {}
    try { if ($AppRow.androidPackageName) { return [string]$AppRow.androidPackageName } } catch {}
    try { if ($AppRow.platformInfo.android.packageName) { return [string]$AppRow.platformInfo.android.packageName } } catch {}
    return ""
}

function Restore-NativeProject {
    if (Test-Path -LiteralPath (Join-Path $BackupDir "build.gradle")) {
        Copy-Item -LiteralPath (Join-Path $BackupDir "build.gradle") -Destination $BuildGradle -Force
    }
    if (Test-Path -LiteralPath (Join-Path $BackupDir "google-services.json")) {
        Copy-Item -LiteralPath (Join-Path $BackupDir "google-services.json") -Destination $GoogleServices -Force
    } elseif (Test-Path -LiteralPath $GoogleServices) {
        Remove-Item -LiteralPath $GoogleServices -Force
    }
    foreach ($NativePath in $NativeBrandFiles) {
        $Relative = $NativePath.Substring($App.Length).TrimStart("\")
        $Saved = Join-Path (Join-Path $BackupDir "native") $Relative
        if (Test-Path -LiteralPath $Saved) {
            New-Item -ItemType Directory -Force -Path (Split-Path $NativePath -Parent) | Out-Null
            Copy-Item -LiteralPath $Saved -Destination $NativePath -Force
        }
    }
}

try {
    Write-Host "`n=== BUILD FAINANCE ANDROID TEST ===" -ForegroundColor Cyan
    Require-File (Join-Path $App "package.json") "Progetto fAInance non trovato"
    Require-File (Join-Path $App ".env.test.local") ".env.test.local mancante"
    Require-File $BuildGradle "android\app\build.gradle mancante"
    Require-File $Manifest "AndroidManifest.xml mancante"
    Require-File $StringsXml "strings.xml Android mancante"
    Require-File $TestBrandIcon "Logo dedicato fAInance Test mancante"
    Require-File (Join-Path $App "android\gradlew.bat") "gradlew.bat mancante"

    $EnvText = [IO.File]::ReadAllText((Join-Path $App ".env.test.local"))
    if ($EnvText -notmatch "VITE_FIREBASE_TEST_PROJECT_ID=$TestProject") { throw "Firebase Test inatteso: build APK bloccata" }
    if ($EnvText -match "VITE_FIREBASE_TEST_PROJECT_ID=$ProductionProject") { throw "BLOCCO SICUREZZA: APK Test punta alla Production" }

    $Npx = Command-Path "npx.cmd"
    $Npm = Command-Path "npm.cmd"
    $Firebase = Command-Path "firebase.cmd"
    $JavaHome = Find-JavaHome

    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Copy-Item -LiteralPath $BuildGradle -Destination (Join-Path $BackupDir "build.gradle") -Force
    if (Test-Path -LiteralPath $GoogleServices) {
        Copy-Item -LiteralPath $GoogleServices -Destination (Join-Path $BackupDir "google-services.json") -Force
    }
    foreach ($NativePath in $NativeBrandFiles) {
        if (Test-Path -LiteralPath $NativePath) {
            $Relative = $NativePath.Substring($App.Length).TrimStart("\")
            $Saved = Join-Path (Join-Path $BackupDir "native") $Relative
            New-Item -ItemType Directory -Force -Path (Split-Path $Saved -Parent) | Out-Null
            Copy-Item -LiteralPath $NativePath -Destination $Saved -Force
        }
    }

    Set-Location -LiteralPath $App
    $env:VITE_APP_ENV = "test"

    Write-Host "`n=== BUILD WEB TEST PER APK ===" -ForegroundColor Cyan
    & $Npx vite build --mode test --outDir dist --emptyOutDir
    if ($LASTEXITCODE -ne 0) { throw ("Build Vite Test fallita: exit {0}" -f $LASTEXITCODE) }
    Require-File (Join-Path $App "dist\index.html") "dist\index.html Test non prodotto"

    $BundleFiles = @(Get-ChildItem -LiteralPath (Join-Path $App "dist\assets") -File -Filter "*.js" -ErrorAction Stop)
    $TestMarkerFound = $false
    foreach ($Bundle in $BundleFiles) {
        if (Select-String -LiteralPath $Bundle.FullName -SimpleMatch $TestProject -Quiet) { $TestMarkerFound = $true; break }
    }
    if (!$TestMarkerFound) { throw "Build web Test non contiene il project-id Firebase Test" }
    Write-Host "[OK] Bundle web collegato a Firebase Test" -ForegroundColor Green

    Write-Host "`n=== CAPACITOR SYNC ANDROID ===" -ForegroundColor Cyan
    & $Npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw ("cap sync android fallito: exit {0}" -f $LASTEXITCODE) }

    Write-Host "`n=== BRANDING FAINANCE TEST ===" -ForegroundColor Cyan
    $StringsText = [IO.File]::ReadAllText($StringsXml)
    $StringsText = [regex]::Replace($StringsText, '<string name="app_name">[^<]*</string>', '<string name="app_name">fAInance Test</string>', 1)
    $StringsText = [regex]::Replace($StringsText, '<string name="title_activity_main">[^<]*</string>', '<string name="title_activity_main">fAInance Test</string>', 1)
    $StringsText = [regex]::Replace($StringsText, '<string name="package_name">[^<]*</string>', '<string name="package_name">it.fainanceapp.app.test</string>', 1)
    $StringsText = [regex]::Replace($StringsText, '<string name="custom_url_scheme">[^<]*</string>', '<string name="custom_url_scheme">it.fainanceapp.app.test</string>', 1)
    [IO.File]::WriteAllText($StringsXml, $StringsText, (New-Object System.Text.UTF8Encoding($false)))
    foreach ($LauncherTarget in $LauncherTargets) {
        New-Item -ItemType Directory -Force -Path (Split-Path $LauncherTarget -Parent) | Out-Null
        Copy-Item -LiteralPath $TestBrandIcon -Destination $LauncherTarget -Force
    }
    Write-Host "[OK] Nome app: fAInance Test" -ForegroundColor Green
    Write-Host "[OK] Logo launcher Test dedicato applicato" -ForegroundColor Green

    Write-Host "`n=== CONFIG FIREBASE ANDROID TEST ===" -ForegroundColor Cyan
    $ListResult = Invoke-FirebaseCaptured @("apps:list","ANDROID","--project",$TestProject,"--json") "firebase apps:list ANDROID"
    $ListJson = Json-From-Output $ListResult.Stdout
    $Apps = @()
    try { $Apps = @($ListJson.result) } catch {}
    if (!$Apps.Count) { try { $Apps = @($ListJson.apps) } catch {} }
    $AndroidApp = $null
    foreach ($Row in $Apps) {
        if ((Find-PackageName $Row) -eq $TestPackage) { $AndroidApp = $Row; break }
    }

    if (!$AndroidApp) {
        Write-Host "Creo l'app Android dedicata nel progetto Firebase Test..." -ForegroundColor Yellow
        $CreateResult = Invoke-FirebaseCaptured @("apps:create","ANDROID","fAInance Test","--package-name",$TestPackage,"--project",$TestProject,"--json") "firebase apps:create ANDROID"
        $CreateJson = Json-From-Output $CreateResult.Stdout
        try { $AndroidApp = $CreateJson.result } catch {}
    }

    $FirebaseAppId = ""
    try { $FirebaseAppId = [string]$AndroidApp.appId } catch {}
    if (!$FirebaseAppId) { try { $FirebaseAppId = [string]$AndroidApp.app_id } catch {} }
    if (!$FirebaseAppId) { throw "Firebase Android Test appId non trovato" }

    # Su Windows/Node 24 la CLI può terminare con un'asserzione libuv mentre chiude
    # lo spinner di apps:sdkconfig. Evitiamo lo stream catturato e chiediamo alla CLI
    # di scrivere direttamente il file in modalità CI/non-interattiva.
    $SdkTemp = Join-Path $env:TEMP ("FAINANCE_GOOGLE_SERVICES_TEST_" + [guid]::NewGuid().ToString("N") + ".json")
    $OldCI = $env:CI
    try {
        $env:CI = "1"
        $SdkOk = $false
        for ($Attempt = 1; $Attempt -le 3 -and !$SdkOk; $Attempt++) {
            Remove-Item -LiteralPath $SdkTemp -Force -ErrorAction SilentlyContinue
            Write-Host ("Download google-services.json Test - tentativo {0}/3..." -f $Attempt) -ForegroundColor Yellow
            & $Firebase apps:sdkconfig ANDROID $FirebaseAppId --project $TestProject --non-interactive -o $SdkTemp
            $SdkExit = $LASTEXITCODE
            if (Test-Path -LiteralPath $SdkTemp) {
                try {
                    $CandidateText = [IO.File]::ReadAllText($SdkTemp)
                    $CandidateConfig = $CandidateText | ConvertFrom-Json
                    $CandidateProjectOk = [string]$CandidateConfig.project_info.project_id -eq $TestProject
                    $CandidatePackageOk = $false
                    foreach ($CandidateClient in @($CandidateConfig.client)) {
                        if ([string]$CandidateClient.client_info.android_client_info.package_name -eq $TestPackage) {
                            $CandidatePackageOk = $true
                            break
                        }
                    }
                    if ($CandidateProjectOk -and $CandidatePackageOk) {
                        $SdkOk = $true
                        if ($SdkExit -ne 0) {
                            Write-Host "[OK] Configurazione Firebase Test valida nonostante l'errore di chiusura della CLI" -ForegroundColor Yellow
                        }
                        break
                    }
                } catch {}
            }
            if ($Attempt -lt 3) { Start-Sleep -Seconds (2 * $Attempt) }
        }
        if (!$SdkOk) { throw "firebase apps:sdkconfig ANDROID fallito dopo 3 tentativi" }

        $SdkText = [IO.File]::ReadAllText($SdkTemp)
        $SdkConfig = $SdkText | ConvertFrom-Json
        if ([string]$SdkConfig.project_info.project_id -ne $TestProject) { throw "google-services.json non appartiene al Firebase Test" }
        $PackageMatch = $false
        foreach ($Client in @($SdkConfig.client)) {
            if ([string]$Client.client_info.android_client_info.package_name -eq $TestPackage) { $PackageMatch = $true; break }
        }
        if (!$PackageMatch) { throw "google-services.json non contiene il package Android Test" }
        [IO.File]::WriteAllText($GoogleServices, $SdkText, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "[OK] google-services.json dedicato al Firebase Test" -ForegroundColor Green
    } finally {
        if ($null -eq $OldCI) { Remove-Item Env:CI -ErrorAction SilentlyContinue } else { $env:CI = $OldCI }
        Remove-Item -LiteralPath $SdkTemp -Force -ErrorAction SilentlyContinue
    }

    $GradleText = [IO.File]::ReadAllText($BuildGradle)
    if ($GradleText -notmatch 'applicationId\s+"it\.fainanceapp\.app"') { throw "applicationId Android inatteso" }
    $GradleText = [regex]::Replace($GradleText, 'applicationId\s+"it\.fainanceapp\.app"', 'applicationId "it.fainanceapp.app.test"', 1)
    $GradleText = [regex]::Replace($GradleText, 'versionCode\s+\d+', ('versionCode ' + $VersionCode), 1)
    $GradleText = [regex]::Replace($GradleText, 'versionName\s+"[^"]+"', ('versionName "' + $VersionName + '"'), 1)
    [IO.File]::WriteAllText($BuildGradle, $GradleText, (New-Object System.Text.UTF8Encoding($false)))

    Write-Host "`n=== GRADLE ASSEMBLE DEBUG TEST ===" -ForegroundColor Cyan
    $env:JAVA_HOME = $JavaHome
    Push-Location (Join-Path $App "android")
    try {
        & .\gradlew.bat clean
        if ($LASTEXITCODE -ne 0) { throw ("gradlew clean fallito: exit {0}" -f $LASTEXITCODE) }
        & .\gradlew.bat assembleDebug
        if ($LASTEXITCODE -ne 0) { throw ("gradlew assembleDebug fallito: exit {0}" -f $LASTEXITCODE) }
    } finally { Pop-Location }

    $Apks = @(Get-ChildItem -LiteralPath (Join-Path $App "android\app\build\outputs\apk\debug") -Filter "*.apk" -File -ErrorAction Stop | Sort-Object LastWriteTime -Descending)
    if (!$Apks.Count) { throw "APK Test non prodotto" }
    Copy-Item -LiteralPath $Apks[0].FullName -Destination $OutputApk -Force
    $ApkHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutputApk).Hash.ToLowerInvariant()
    [IO.File]::WriteAllText($OutputSha, $ApkHash + "  " + (Split-Path $OutputApk -Leaf), (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ("[OK] APK Test: {0}" -f $OutputApk) -ForegroundColor Green
    Write-Host ("[OK] SHA-256 APK: {0}" -f $ApkHash) -ForegroundColor Green

    Restore-NativeProject

    Write-Host "`n=== RIPRISTINO ASSET ANDROID PRODUCTION LOCALI ===" -ForegroundColor Cyan
    Remove-Item Env:VITE_APP_ENV -ErrorAction SilentlyContinue
    & $Npm run build
    if ($LASTEXITCODE -ne 0) { throw ("Ripristino build Production fallito: exit {0}" -f $LASTEXITCODE) }
    & $Npx cap copy android
    if ($LASTEXITCODE -ne 0) { throw ("Ripristino asset Android Production fallito: exit {0}" -f $LASTEXITCODE) }
    Write-Host "[OK] Progetto Android locale ripristinato alla configurazione Production" -ForegroundColor Green

    $Success = $true
    Write-Host "`n======================================================" -ForegroundColor Green
    Write-Host "FAINANCE TEST ANDROID APK PRONTO" -ForegroundColor Green
    Write-Host ("APK: {0}" -f $OutputApk) -ForegroundColor Green
    Write-Host "FIREBASE: TEST" -ForegroundColor Green
    Write-Host "NOME APP: fAInance Test" -ForegroundColor Green
    Write-Host "PACKAGE: it.fainanceapp.app.test" -ForegroundColor Green
    Write-Host "======================================================" -ForegroundColor Green
} finally {
    try { Restore-NativeProject } catch {}
    if (!$Success) {
        Remove-Item -LiteralPath $OutputApk,$OutputSha -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $BackupDir -Recurse -Force -ErrorAction SilentlyContinue
}
