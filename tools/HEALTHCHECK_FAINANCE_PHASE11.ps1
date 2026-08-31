param(
    [string]$Url = "http://127.0.0.1:5174/",
    [int]$TimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"
$Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$Response = $null
do {
    try {
        $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        if ($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 400) { break }
    } catch {
        Start-Sleep -Seconds 2
    }
} while ((Get-Date) -lt $Deadline)

if (!$Response -or $Response.StatusCode -lt 200 -or $Response.StatusCode -ge 400) {
    throw ("Health-check non superato: {0}" -f $Url)
}
$Html = [string]$Response.Content
if ($Html -notmatch '<div\s+id=["'']root["'']') {
    throw "Health-check non valido: contenitore applicazione assente"
}
$AssetMatch = [regex]::Match($Html, '<script[^>]+src=["'']([^"'']+\.(?:js|tsx?))["'']', [Text.RegularExpressions.RegexOptions]::IgnoreCase)
if (!$AssetMatch.Success) { throw "Health-check non valido: punto di ingresso JavaScript/TypeScript assente" }
$AssetUrl = ([Uri]::new([Uri]$Url, $AssetMatch.Groups[1].Value)).AbsoluteUri
$Asset = Invoke-WebRequest -Uri $AssetUrl -UseBasicParsing -TimeoutSec 30
if ($Asset.StatusCode -ne 200 -or $Asset.RawContentLength -lt 100) {
    throw "Health-check non valido: punto di ingresso non raggiungibile o vuoto"
}
Write-Host ("[OK] fAInance risponde senza apertura del browser: {0}" -f $Url) -ForegroundColor Green
