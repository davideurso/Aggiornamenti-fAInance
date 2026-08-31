param([switch]$Deploy)

$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$Rules = Join-Path $App "firestore.rules"
$FirebaseJson = Join-Path $App "firebase.json"
$MarkerStart = "// === FAINANCE ADMIN SECURITY START ==="
$MarkerEnd   = "// === FAINANCE ADMIN SECURITY END ==="

$Block = @'
    // === FAINANCE ADMIN SECURITY START ===
    function fainanceAdminRole() {
      return request.auth != null ? request.auth.token.fainanceAdminRole : null;
    }
    function isFainanceAdmin() {
      return fainanceAdminRole() in ['support', 'analyst', 'admin', 'superadmin'];
    }
    function canReadFainanceAudit() {
      return fainanceAdminRole() in ['analyst', 'admin', 'superadmin'];
    }
    function canWriteFainanceConfig() {
      return fainanceAdminRole() in ['admin', 'superadmin'];
    }
    function isFainanceSuperadmin() {
      return fainanceAdminRole() == 'superadmin';
    }

    match /adminUserMetadata/{uid} {
      allow read: if isFainanceAdmin();
      allow create, update, delete: if isFainanceSuperadmin();
    }

    match /systemConfig/{document=**} {
      allow read: if isFainanceAdmin();
      allow create, update: if canWriteFainanceConfig();
      allow delete: if isFainanceSuperadmin();
    }

    match /adminAudit/{auditId} {
      allow read: if canReadFainanceAudit();
      allow create: if canWriteFainanceConfig()
        && request.resource.data.actorUid == request.auth.uid;
      allow update, delete: if false;
    }
    // === FAINANCE ADMIN SECURITY END ===
'@

try {
    Write-Host "`n=== FAINANCE ADMIN - FIRESTORE SECURITY ===" -ForegroundColor Cyan
    if (!(Test-Path $Rules)) { throw "firestore.rules non trovato: $Rules" }
    $text = Get-Content $Rules -Raw

    if ($text.Contains($MarkerStart)) {
        Write-Host "[OK] Regole Admin gia presenti" -ForegroundColor Green
    } else {
        $pattern = "(?s)(\r?\n\s*}\s*\r?\n\s*}\s*)$"
        if ($text -notmatch $pattern) {
            throw "Struttura firestore.rules non riconosciuta. Nessuna modifica eseguita."
        }
        $backup = "$Rules.backup_phase6_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item $Rules $backup -Force
        $replacement = "`r`n$Block`r`n  }`r`n}`r`n"
        $updated = [regex]::Replace($text, $pattern, $replacement)
        Set-Content -LiteralPath $Rules -Value $updated -Encoding UTF8
        Write-Host "[OK] Regole Admin inserite" -ForegroundColor Green
        Write-Host "[OK] Backup: $backup" -ForegroundColor Green
    }

    if ($Deploy) {
        if (!(Test-Path $FirebaseJson)) { throw "firebase.json non trovato: impossibile distribuire le regole" }
        Set-Location $App
        Write-Host "Deploy Firestore Rules..." -ForegroundColor Cyan
        npx firebase-tools deploy --only firestore:rules
        if ($LASTEXITCODE -ne 0) { throw "Deploy Firestore Rules fallito" }
        Write-Host "[OK] Firestore Rules distribuite" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Regole preparate ma NON distribuite. Per il deploy usare lo stesso script con -Deploy." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "`nOPERAZIONE FIRESTORE INTERROTTA" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
