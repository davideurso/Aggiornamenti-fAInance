param(
    [string]$BackupDirectory = "",
    [string]$RestoreFrom = ""
)

$ErrorActionPreference = "Stop"
$App = Split-Path $PSScriptRoot -Parent
$TemplatePath = Join-Path $App "config\firebase-auth-test-email-template.json"
$ExpectedTestProject = "fainance-test-20260823195207"
$ExpectedTestProjectNumber = "537576395820"
$ProductionProject = "fainance-a7794"
$Root = "C:\Users\Davide\Documents\Progetti\01 - fAInance"

function Require-File([string]$Path, [string]$Message) {
    if (!(Test-Path -LiteralPath $Path -PathType Leaf)) { throw $Message }
}

function Get-AccessToken {
    $Gcloud = Get-Command gcloud.cmd -ErrorAction SilentlyContinue
    if ($null -eq $Gcloud -or [string]::IsNullOrWhiteSpace([string]$Gcloud.Source)) {
        throw "Google Cloud CLI non disponibile. Configurazione Firebase Test non modificata."
    }
    $TokenOutput = @(& $Gcloud.Source auth print-access-token --quiet 2>$null)
    $TokenExitCode = $LASTEXITCODE
    $Token = [string]($TokenOutput | Select-Object -First 1)
    if ($TokenExitCode -ne 0 -or [string]::IsNullOrWhiteSpace([string]$Token)) {
        throw "Token Google non disponibile. Configurazione Firebase Test non modificata."
    }
    return [string]$Token
}

function Get-AuthConfig([string]$ProjectId, [string]$Token) {
    $Headers = @{
        Authorization = "Bearer $Token"
        "X-Goog-User-Project" = $ExpectedTestProject
    }
    $Uri = "https://identitytoolkit.googleapis.com/admin/v2/projects/$ProjectId/config"
    return Invoke-RestMethod -Method Get -Uri $Uri -Headers $Headers
}

function Get-EmailConfigFingerprint($Config) {
    $Relevant = [ordered]@{
        callbackUri = [string]$Config.notification.sendEmail.callbackUri
        defaultLocale = [string]$Config.notification.defaultLocale
        verifyEmailTemplate = $Config.notification.sendEmail.verifyEmailTemplate
    } | ConvertTo-Json -Depth 20 -Compress
    $Sha = [Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($Sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Relevant)))).Replace("-", "").ToLowerInvariant()
    } finally {
        $Sha.Dispose()
    }
}

function Set-TestEmailConfig([string]$Token, $Payload) {
    $Mask = "notification.sendEmail.callbackUri,notification.sendEmail.verifyEmailTemplate,notification.defaultLocale"
    $Uri = "https://identitytoolkit.googleapis.com/admin/v2/projects/$ExpectedTestProject/config?updateMask=$([Uri]::EscapeDataString($Mask))"
    $Headers = @{
        Authorization = "Bearer $Token"
        "X-Goog-User-Project" = $ExpectedTestProject
        "Content-Type" = "application/json; charset=utf-8"
    }
    $Json = $Payload | ConvertTo-Json -Depth 30 -Compress
    return Invoke-RestMethod -Method Patch -Uri $Uri -Headers $Headers -Body ([Text.Encoding]::UTF8.GetBytes($Json))
}

Require-File $TemplatePath "Template email Test mancante"
$Template = Get-Content -LiteralPath $TemplatePath -Raw | ConvertFrom-Json
if ([string]$Template.projectId -ne $ExpectedTestProject) { throw "Project ID Test inatteso nel template" }
if ([string]$Template.productionProjectId -ne $ProductionProject) { throw "Project ID Production di controllo inatteso" }
if ([string]$Template.callbackUri -notlike "https://$ExpectedTestProject.web.app/*") { throw "Callback email fuori dal dominio Test" }
if ([string]$Template.verifyEmailTemplate.body -notmatch [regex]::Escape("%LINK%")) { throw "Placeholder %LINK% mancante" }
if ([string]$Template.verifyEmailTemplate.senderDisplayName -ne "fAInance Test") { throw "Mittente Test inatteso" }

if (![string]::IsNullOrWhiteSpace($RestoreFrom)) {
    $RestoreFull = [IO.Path]::GetFullPath($RestoreFrom)
    $RootFullForRestore = [IO.Path]::GetFullPath($Root).TrimEnd("\") + "\"
    if (!$RestoreFull.StartsWith($RootFullForRestore, [StringComparison]::OrdinalIgnoreCase)) { throw "Backup Firebase fuori dal progetto fAInance" }
    Require-File $RestoreFull "Backup Firebase Test non trovato"
    $Saved = Get-Content -LiteralPath $RestoreFull -Raw | ConvertFrom-Json
    if ([string]$Saved.projectId -ne $ExpectedTestProject) { throw "Backup riferito a un progetto Firebase inatteso" }
    $RestoreToken = Get-AccessToken
    $RestoreProductionBefore = Get-AuthConfig $ProductionProject $RestoreToken
    $RestoreProductionFingerprint = Get-EmailConfigFingerprint $RestoreProductionBefore
    [void](Set-TestEmailConfig $RestoreToken ([ordered]@{ notification = $Saved.notification }))
    $Restored = Get-AuthConfig $ExpectedTestProject $RestoreToken
    if ([string]$Restored.notification.sendEmail.callbackUri -ne [string]$Saved.notification.sendEmail.callbackUri) { throw "Rollback callback Firebase Test non verificato" }
    $RestoreProductionAfter = Get-AuthConfig $ProductionProject $RestoreToken
    if ((Get-EmailConfigFingerprint $RestoreProductionAfter) -ne $RestoreProductionFingerprint) { throw "Configurazione email Production cambiata durante il rollback" }
    Write-Host "[OK] Configurazione email Firebase Test ripristinata" -ForegroundColor Green
    Write-Host "[OK] Firebase Production non modificato" -ForegroundColor Green
    exit 0
}

if ([string]::IsNullOrWhiteSpace($BackupDirectory)) {
    $BackupDirectory = Join-Path $Root ("Backup_FAINANCE_2.0_Phase10_Email_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
}
$BackupFull = [IO.Path]::GetFullPath($BackupDirectory)
$RootFull = [IO.Path]::GetFullPath($Root).TrimEnd("\") + "\"
if (!$BackupFull.StartsWith($RootFull, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Directory backup fuori dal progetto fAInance"
}

$Token = Get-AccessToken
$BeforeTest = Get-AuthConfig $ExpectedTestProject $Token
$BeforeProduction = Get-AuthConfig $ProductionProject $Token
if ([string]$BeforeTest.name -ne "projects/$ExpectedTestProjectNumber/config") { throw "Configurazione Firebase Test inattesa" }
$ProductionFingerprint = Get-EmailConfigFingerprint $BeforeProduction

New-Item -ItemType Directory -Force -Path $BackupFull | Out-Null
$RollbackPayload = [ordered]@{
    projectId = $ExpectedTestProject
    capturedAt = (Get-Date).ToString("o")
    notification = [ordered]@{
        defaultLocale = [string]$BeforeTest.notification.defaultLocale
        sendEmail = [ordered]@{
            callbackUri = [string]$BeforeTest.notification.sendEmail.callbackUri
            verifyEmailTemplate = $BeforeTest.notification.sendEmail.verifyEmailTemplate
        }
    }
}
$RollbackPath = Join-Path $BackupFull "firebase-auth-test-email-before.json"
$RollbackPayload | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $RollbackPath -Encoding UTF8

$ApplyPayload = [ordered]@{
    notification = [ordered]@{
        defaultLocale = [string]$Template.defaultLocale
        sendEmail = [ordered]@{
            callbackUri = [string]$Template.callbackUri
            verifyEmailTemplate = $Template.verifyEmailTemplate
        }
    }
}

try {
    [void](Set-TestEmailConfig $Token $ApplyPayload)
    $AfterTest = Get-AuthConfig $ExpectedTestProject $Token
    if ([string]$AfterTest.notification.sendEmail.callbackUri -ne [string]$Template.callbackUri) { throw "Callback Test non applicata" }
    if ([string]$AfterTest.notification.sendEmail.verifyEmailTemplate.subject -ne [string]$Template.verifyEmailTemplate.subject) { throw "Oggetto email Test non applicato" }
    if ([string]$AfterTest.notification.sendEmail.verifyEmailTemplate.senderDisplayName -ne "fAInance Test") { throw "Nome mittente Test non applicato" }
    if ([string]$AfterTest.notification.sendEmail.verifyEmailTemplate.body -notmatch "Verifica il mio indirizzo email") { throw "Corpo HTML Test non applicato" }
    $AfterProduction = Get-AuthConfig $ProductionProject $Token
    if ((Get-EmailConfigFingerprint $AfterProduction) -ne $ProductionFingerprint) { throw "Configurazione email Production cambiata" }
    Write-Host "[OK] Template HTML fAInance Test configurato" -ForegroundColor Green
    Write-Host "[OK] Handler: $($Template.callbackUri)" -ForegroundColor Green
    Write-Host "[OK] Firebase Production non modificato" -ForegroundColor Green
    Write-Host "[OK] Backup rollback: $RollbackPath" -ForegroundColor Green
} catch {
    Write-Host "Configurazione non completata. Ripristino automatico del template Test..." -ForegroundColor Yellow
    try {
        $RestorePayload = [ordered]@{ notification = $RollbackPayload.notification }
        [void](Set-TestEmailConfig $Token $RestorePayload)
        Write-Host "[OK] Template Firebase Test ripristinato" -ForegroundColor Green
    } catch {
        Write-Host "[ERRORE] Rollback Firebase Test non completato: $($_.Exception.Message)" -ForegroundColor Red
    }
    throw
}
