param(
    [string]$LegacyTestRoot = "C:\Users\Davide\Downloads\fAinance - Test"
)

$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$ProductionProjectId = "fainance-a7794"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function First-SourceConfigValue([string]$Root, [string]$Property) {
    $files = Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -in @('.ts','.tsx','.js','.jsx','.mjs','.cjs') -and $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\|\\.gradle\\' }
    $pattern = '(?m)\b' + [regex]::Escape($Property) + '\s*:\s*["'']([^"'']+)["'']'
    foreach ($file in $files) {
        $text = [System.IO.File]::ReadAllText($file.FullName)
        $match = [regex]::Match($text, $pattern)
        if ($match.Success) { return $match.Groups[1].Value.Trim() }
    }
    return ""
}

Write-Host "`n=== CONFIGURAZIONE FAINANCE TEST ===" -ForegroundColor Cyan

if (!(Test-Path -LiteralPath (Join-Path $App "package.json"))) {
    throw "Progetto fAInance non trovato: $App"
}
if (!(Test-Path -LiteralPath $LegacyTestRoot)) {
    throw "Sorgente fAInance Test non trovata: $LegacyTestRoot"
}

$GoogleServices = Join-Path $LegacyTestRoot "android\app\google-services.json"
$Gs = $null
if (Test-Path -LiteralPath $GoogleServices) {
    $Gs = Get-Content -LiteralPath $GoogleServices -Raw | ConvertFrom-Json
}

$SourceProjectId = First-SourceConfigValue $LegacyTestRoot "projectId"
$SourceApiKey = First-SourceConfigValue $LegacyTestRoot "apiKey"
$SourceAuthDomain = First-SourceConfigValue $LegacyTestRoot "authDomain"
$SourceStorageBucket = First-SourceConfigValue $LegacyTestRoot "storageBucket"
$SourceMessagingSenderId = First-SourceConfigValue $LegacyTestRoot "messagingSenderId"
$SourceAppId = First-SourceConfigValue $LegacyTestRoot "appId"

$ProjectId = ""
$ApiKey = ""
$StorageBucket = ""
$MessagingSenderId = ""
$AppId = ""
if ($Gs) {
    $ProjectId = [string]$Gs.project_info.project_id
    $StorageBucket = [string]$Gs.project_info.storage_bucket
    $MessagingSenderId = [string]$Gs.project_info.project_number
    if ($Gs.client.Count -gt 0 -and $Gs.client[0].api_key.Count -gt 0) { $ApiKey = [string]$Gs.client[0].api_key[0].current_key }
    if ($Gs.client.Count -gt 0) { $AppId = [string]$Gs.client[0].client_info.mobilesdk_app_id }
}
if (!$ProjectId) { $ProjectId = $SourceProjectId }
if (!$ApiKey) { $ApiKey = $SourceApiKey }
if (!$StorageBucket) { $StorageBucket = $SourceStorageBucket }
if (!$MessagingSenderId) { $MessagingSenderId = $SourceMessagingSenderId }
if (!$AppId) { $AppId = $SourceAppId }
$AuthDomain = if ($ProjectId) { "$ProjectId.firebaseapp.com" } else { $SourceAuthDomain }

if ($SourceProjectId -and $ProjectId -and $SourceProjectId -ne $ProjectId) {
    Write-Host "[INFO] Config sorgente e google-services.json differiscono; uso google-services.json come riferimento Test." -ForegroundColor Yellow
}

$ProjectId = [string]$ProjectId.Trim()
$ApiKey = [string]$ApiKey.Trim()
$AuthDomain = [string]$AuthDomain.Trim()
$StorageBucket = [string]$StorageBucket.Trim()
$MessagingSenderId = [string]$MessagingSenderId.Trim()
$AppId = [string]$AppId.Trim()

if (!$ProjectId) { throw "Project ID Firebase Test non rilevato" }
if ($ProjectId -eq $ProductionProjectId) { throw "BLOCCO SICUREZZA: il progetto Test rilevato coincide con Production ($ProductionProjectId)" }
if (!$ApiKey) { throw "Firebase Test apiKey non rilevata" }
if (!$AuthDomain) { throw "Firebase Test authDomain non rilevato" }
if (!$StorageBucket) { throw "Firebase Test storageBucket non rilevato" }
if (!$MessagingSenderId) { throw "Firebase Test messagingSenderId non rilevato" }
if (!$AppId) { throw "Firebase Test appId non rilevato" }

$RootEnv = @(
    "VITE_APP_ENV=test",
    "VITE_FIREBASE_TEST_API_KEY=$ApiKey",
    "VITE_FIREBASE_TEST_AUTH_DOMAIN=$AuthDomain",
    "VITE_FIREBASE_TEST_PROJECT_ID=$ProjectId",
    "VITE_FIREBASE_TEST_STORAGE_BUCKET=$StorageBucket",
    "VITE_FIREBASE_TEST_MESSAGING_SENDER_ID=$MessagingSenderId",
    "VITE_FIREBASE_TEST_APP_ID=$AppId",
    "VITE_FIREBASE_FUNCTIONS_REGION=europe-west1"
) -join "`r`n"

$AdminEnv = @(
    "VITE_ADMIN_ENV=test",
    "VITE_FIREBASE_TEST_API_KEY=$ApiKey",
    "VITE_FIREBASE_TEST_AUTH_DOMAIN=$AuthDomain",
    "VITE_FIREBASE_TEST_PROJECT_ID=$ProjectId",
    "VITE_FIREBASE_TEST_STORAGE_BUCKET=$StorageBucket",
    "VITE_FIREBASE_TEST_MESSAGING_SENDER_ID=$MessagingSenderId",
    "VITE_FIREBASE_TEST_APP_ID=$AppId"
) -join "`r`n"

$RootEnvPath = Join-Path $App ".env.test.local"
$AdminEnvPath = Join-Path $App "admin-app\.env.test.local"
Write-Utf8NoBom $RootEnvPath ($RootEnv + "`r`n")
Write-Utf8NoBom $AdminEnvPath ($AdminEnv + "`r`n")

$InfoDir = Join-Path $App "test-env"
New-Item -ItemType Directory -Force -Path $InfoDir | Out-Null
$Info = [ordered]@{
    environment = "test"
    productionProjectId = $ProductionProjectId
    testProjectId = $ProjectId
    source = $LegacyTestRoot
    configuredAt = (Get-Date).ToString("o")
}
$InfoJson = $Info | ConvertTo-Json -Depth 3
Write-Utf8NoBom (Join-Path $InfoDir "environment.json") ($InfoJson + "`r`n")

Write-Host "[OK] Firebase Test rilevato: $ProjectId" -ForegroundColor Green
Write-Host "[OK] Production separata: $ProductionProjectId" -ForegroundColor Green
Write-Host "[OK] .env.test.local App creato" -ForegroundColor Green
Write-Host "[OK] .env.test.local Admin creato" -ForegroundColor Green
