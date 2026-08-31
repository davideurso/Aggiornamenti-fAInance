param(
    [string]$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"
)

$ErrorActionPreference = "Stop"
$Index = Join-Path $App "index.html"
$Marker = "fainance-bootstrap-fatal-guard"
$OldMessage = "Il bundle JavaScript non ha montato React entro 20 secondi."
$NewMessage = "Il bundle JavaScript non ha montato React entro 120 secondi."

if (!(Test-Path -LiteralPath $Index)) { throw "index.html non trovato: $Index" }
$text = [System.IO.File]::ReadAllText($Index)

if ($text.Contains($NewMessage) -and $text.Contains($Marker)) {
    Write-Host "[OK] Watchdog bootstrap gia aggiornato" -ForegroundColor Green
    exit 0
}

if (!$text.Contains($OldMessage)) {
    throw "Watchdog atteso non riconosciuto: frase dei 20 secondi non trovata. Nessuna modifica applicata."
}

$messagePosition = $text.IndexOf($OldMessage)
$windowStart = [Math]::Max(0, $messagePosition - 5000)
$windowLength = [Math]::Min($text.Length - $windowStart, 10000)
$window = $text.Substring($windowStart, $windowLength)

$timeoutPatterns = @(
    '(?<!\d)20000(?!\d)',
    '(?<!\d)20\s*\*\s*1000(?!\d)'
)
$chosenPattern = $null
foreach ($pattern in $timeoutPatterns) {
    $matches = [regex]::Matches($window, $pattern)
    if ($matches.Count -eq 1) { $chosenPattern = $pattern; break }
    if ($matches.Count -gt 1) { throw "Watchdog ambiguo: trovati piu timeout candidati. Nessuna modifica applicata." }
}
if (!$chosenPattern) { throw "Timeout 20 secondi del watchdog non trovato vicino al messaggio. Nessuna modifica applicata." }

$backup = "$Index.backup_phase10_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -LiteralPath $Index -Destination $backup -Force

$patchedWindow = [regex]::Replace($window, $chosenPattern, '120000', 1)
$patchedWindow = $patchedWindow.Replace($OldMessage, $NewMessage)
$text = $text.Substring(0, $windowStart) + $patchedWindow + $text.Substring($windowStart + $windowLength)

if (!$text.Contains($Marker)) {
$guard = @'
<script id="fainance-bootstrap-fatal-guard">
(function () {
  if (window.__FAINANCE_FATAL_GUARD_INSTALLED__) return;
  window.__FAINANCE_FATAL_GUARD_INSTALLED__ = true;

  function alreadyMounted() {
    if (window.__FAINANCE_REACT_MOUNTED__) return true;
    var root = document.getElementById('root');
    return !!(root && root.childElementCount > 0);
  }

  function errorText(reason) {
    try {
      if (!reason) return 'Errore JavaScript durante l'avvio.';
      if (reason.message) return String(reason.message);
      return String(reason);
    } catch (_) {
      return 'Errore JavaScript durante l'avvio.';
    }
  }

  function renderFatal(reason) {
    if (alreadyMounted()) return;
    var root = document.getElementById('root');
    if (!root) return;
    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.minHeight = '100vh';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.padding = '24px';
    wrap.style.boxSizing = 'border-box';
    var card = document.createElement('div');
    card.style.maxWidth = '560px';
    card.style.background = '#fff';
    card.style.border = '1px solid #fecaca';
    card.style.borderRadius = '20px';
    card.style.padding = '24px';
    card.style.boxShadow = '0 18px 50px rgba(0,0,0,.10)';
    var title = document.createElement('div');
    title.textContent = "Errore durante l'avvio";
    title.style.fontWeight = '800';
    title.style.fontSize = '22px';
    title.style.color = '#b91c1c';
    var detail = document.createElement('div');
    detail.textContent = errorText(reason);
    detail.style.marginTop = '10px';
    detail.style.color = '#7f1d1d';
    detail.style.whiteSpace = 'pre-wrap';
    card.appendChild(title);
    card.appendChild(detail);
    wrap.appendChild(card);
    root.appendChild(wrap);
  }

  window.addEventListener('error', function (event) {
    if (alreadyMounted()) return;
    window.__FAINANCE_BOOT_FATAL__ = event.error || event.message || 'BOOT_ERROR';
    setTimeout(function () { renderFatal(window.__FAINANCE_BOOT_FATAL__); }, 0);
  });

  window.addEventListener('unhandledrejection', function (event) {
    if (alreadyMounted()) return;
    window.__FAINANCE_BOOT_FATAL__ = event.reason || 'UNHANDLED_REJECTION';
    setTimeout(function () { renderFatal(window.__FAINANCE_BOOT_FATAL__); }, 0);
  });
})();
</script>
'@

    $bodyClose = $text.LastIndexOf('</body>')
    if ($bodyClose -lt 0) { throw "</body> non trovato. Ripristinare il backup: $backup" }
    $text = $text.Insert($bodyClose, $guard + [Environment]::NewLine)
}

if (!$text.Contains($NewMessage)) { throw "Verifica watchdog 120 secondi fallita. Ripristinare il backup: $backup" }
if (!$text.Contains($Marker)) { throw "Verifica fatal guard fallita. Ripristinare il backup: $backup" }

[System.IO.File]::WriteAllText($Index, $text, (New-Object System.Text.UTF8Encoding($false)))

$verify = [System.IO.File]::ReadAllText($Index)
if (!$verify.Contains($NewMessage) -or !$verify.Contains($Marker)) {
    Copy-Item -LiteralPath $backup -Destination $Index -Force
    throw "Verifica post-scrittura watchdog fallita; index.html ripristinato."
}

Write-Host "[OK] Watchdog bootstrap: timeout falso positivo 20s rimosso" -ForegroundColor Green
Write-Host "[OK] Fatal guard JavaScript installata" -ForegroundColor Green
Write-Host "Backup index.html: $backup" -ForegroundColor DarkGray
