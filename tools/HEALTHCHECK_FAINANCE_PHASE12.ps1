param(
    [string]$AppRoot = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App",
    [int]$Port = 5184,
    [int]$TimeoutSeconds = 45
)

$ErrorActionPreference = "Stop"
$Dist = Join-Path $AppRoot "dist-test"
$Index = Join-Path $Dist "index.html"
$TestProject = "fainance-test-20260823195207"

if (!(Test-Path -LiteralPath $Index -PathType Leaf)) {
    throw "Build Test mancante: dist-test\index.html"
}
if (@(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).Count -gt 0) {
    throw ("Porta health-check già occupata: {0}" -f $Port)
}

$Server = Start-Job -ScriptBlock {
    param($Root, $ListenPort)
    $ErrorActionPreference = "Stop"
    $RootFull = [IO.Path]::GetFullPath($Root).TrimEnd("\") + "\"
    $Listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, [int]$ListenPort)
    $Listener.Start()
    try {
        for ($Served = 0; $Served -lt 2; $Served++) {
            $Client = $Listener.AcceptTcpClient()
            try {
                $Stream = $Client.GetStream()
                $Reader = New-Object IO.StreamReader($Stream, [Text.Encoding]::ASCII, $false, 4096, $true)
                $RequestLine = [string]$Reader.ReadLine()
                while ($true) {
                    $HeaderLine = $Reader.ReadLine()
                    if ($null -eq $HeaderLine -or $HeaderLine -eq "") { break }
                }
                $RequestPath = "/"
                if ($RequestLine -match '^GET\s+([^\s]+)\s+HTTP/') { $RequestPath = [string]$Matches[1] }
                $RequestPath = $RequestPath.Split("?")[0]
                $Relative = [Uri]::UnescapeDataString($RequestPath).TrimStart("/")
                if (!$Relative) { $Relative = "index.html" }
                $Relative = $Relative.Replace("/", "\")
                $Candidate = [IO.Path]::GetFullPath((Join-Path $RootFull $Relative))
                $Allowed = $Candidate.StartsWith($RootFull, [StringComparison]::OrdinalIgnoreCase)
                if ($Allowed -and (Test-Path -LiteralPath $Candidate -PathType Leaf)) {
                    $Body = [IO.File]::ReadAllBytes($Candidate)
                    $Extension = [IO.Path]::GetExtension($Candidate).ToLowerInvariant()
                    $ContentType = switch ($Extension) {
                        ".html" { "text/html; charset=utf-8" }
                        ".js" { "application/javascript; charset=utf-8" }
                        ".css" { "text/css; charset=utf-8" }
                        ".png" { "image/png" }
                        default { "application/octet-stream" }
                    }
                    $Status = "200 OK"
                } else {
                    $Body = [Text.Encoding]::UTF8.GetBytes("Not found")
                    $ContentType = "text/plain; charset=utf-8"
                    $Status = "404 Not Found"
                }
                $Header = "HTTP/1.1 $Status`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
                $HeaderBytes = [Text.Encoding]::ASCII.GetBytes($Header)
                $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
                $Stream.Write($Body, 0, $Body.Length)
                $Stream.Flush()
            } finally {
                $Client.Close()
            }
        }
    } finally {
        $Listener.Stop()
    }
} -ArgumentList $Dist, $Port

try {
    $Url = "http://127.0.0.1:$Port/"
    $Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $Response = $null
    do {
        try {
            $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($Response.StatusCode -eq 200) { break }
        } catch {
            Start-Sleep -Milliseconds 300
        }
    } while ((Get-Date) -lt $Deadline)
    if (!$Response -or $Response.StatusCode -ne 200) { throw "Build Test non raggiungibile via HTTP locale" }
    $Html = [string]$Response.Content
    if ($Html -notmatch '<div\s+id=["'']root["'']') { throw "Contenitore applicazione assente" }
    $AssetMatch = [regex]::Match($Html, '<script[^>]+src=["'']([^"'']+\.js)["'']', 'IgnoreCase')
    if (!$AssetMatch.Success) { throw "Bundle JavaScript Test assente" }
    $AssetUrl = ([Uri]::new([Uri]$Url, $AssetMatch.Groups[1].Value)).AbsoluteUri
    $Asset = Invoke-WebRequest -Uri $AssetUrl -UseBasicParsing -TimeoutSec 30
    if ($Asset.StatusCode -ne 200 -or $Asset.RawContentLength -lt 100000) { throw "Bundle JavaScript Test non valido" }
    if ([string]$Asset.Content -notmatch [regex]::Escape($TestProject)) { throw "Bundle HTTP non collegato a Firebase Test" }
    Write-Host ("[OK] Build Test HTTP 200 senza browser: {0}" -f $Url) -ForegroundColor Green
    Write-Host "[OK] Entry point, bundle e Firebase Test verificati" -ForegroundColor Green
} finally {
    if ($Server.State -eq "Running") {
        for ($Wake = 0; $Wake -lt 2; $Wake++) {
            try { Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 1 | Out-Null } catch {}
        }
    }
    Wait-Job -Job $Server -Timeout 5 -ErrorAction SilentlyContinue | Out-Null
    Remove-Job -Job $Server -Force -ErrorAction SilentlyContinue
}
