param([switch]$Deploy)

$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
$Rules = Join-Path $App "firestore_share_rules_1.3.25.rules"
$FirebaseJson = Join-Path $App "firebase.json"
$MarkerStart = "// === FAINANCE USERNAME SECURITY START ==="
$MarkerEnd = "// === FAINANCE USERNAME SECURITY END ==="
$AdminEnd = "// === FAINANCE ADMIN SECURITY END ==="

$Block = @'
    // === FAINANCE USERNAME SECURITY START ===
    match /usernames/{usernameLower} {
      allow read: if isFainanceAdmin();
      allow create, update, delete: if isFainanceSuperadmin();
    }

    match /users/{userId} {
      allow create: if isFainanceSuperadmin()
        && request.resource.data.keys().hasOnly(['username', 'usernameLower', 'updatedAt']);
      allow update: if isFainanceSuperadmin()
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['username', 'usernameLower', 'updatedAt']);
    }
    // === FAINANCE USERNAME SECURITY END ===
'@

try {
    Write-Host "`n=== fAInance Username Firestore Security ===" -ForegroundColor Cyan
    if (!(Test-Path -LiteralPath $Rules)) { throw "Regole Production non trovate: $Rules" }
    if (!(Test-Path -LiteralPath $FirebaseJson)) { throw "firebase.json non trovato" }

    $config = Get-Content -LiteralPath $FirebaseJson -Raw | ConvertFrom-Json
    if ($config.firestore.rules -ne "firestore_share_rules_1.3.25.rules") {
        throw "firebase.json punta a regole inattese: $($config.firestore.rules)"
    }

    $text = [System.IO.File]::ReadAllText($Rules)
    if ($text.Contains($MarkerStart)) {
        Write-Host "[OK] Regole Username gia presenti" -ForegroundColor Green
    } else {
        if (!$text.Contains($AdminEnd)) { throw "Marker Admin Security non trovato: nessuna modifica eseguita" }
        $backup = "$Rules.backup_pre_username_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item -LiteralPath $Rules -Destination $backup -Force
        $updated = $text.Replace($AdminEnd, "$Block`r`n    $AdminEnd")
        [System.IO.File]::WriteAllText($Rules, $updated, (New-Object System.Text.UTF8Encoding($false)))
        $verify = [System.IO.File]::ReadAllText($Rules)
        if (!$verify.Contains($MarkerStart) -or !$verify.Contains($MarkerEnd)) { throw "Verifica post-patch regole Username fallita" }
        Write-Host "[OK] Regole Username aggiunte" -ForegroundColor Green
        Write-Host "[OK] Backup: $backup" -ForegroundColor Green
    }

    if ($Deploy) {
        Set-Location -LiteralPath $App
        npx firebase-tools deploy --only firestore:rules --project fainance-a7794
        if ($LASTEXITCODE -ne 0) { throw "Deploy Firestore Rules fallito" }
        Write-Host "[OK] Firestore Username Rules distribuite" -ForegroundColor Green
    }
}
catch {
    Write-Host "`nUSERNAME FIRESTORE SECURITY INTERROTTA" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
