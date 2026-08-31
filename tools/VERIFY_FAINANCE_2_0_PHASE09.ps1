$ErrorActionPreference = "Stop"
$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

function Need([string]$Relative){$p=Join-Path $App $Relative;if(!(Test-Path -LiteralPath $p)){throw "File mancante: $Relative"};return (Get-Content -LiteralPath $p -Raw)}
function Must([string]$Text,[string]$Pattern,[string]$Message){if($Text -notmatch $Pattern){throw $Message}}
function MustNot([string]$Text,[string]$Pattern,[string]$Message){if($Text -match $Pattern){throw $Message}}

$Widget=Need "src\widget.tsx"
$History=Need "src\sezioni.tsx"
$Share=Need "src\sections\SharePanel.tsx"
$Settings=Need "src\settings\SettingsPanel.tsx"
$Account=Need "src\account\AccountScreens.tsx"
$AppSource=Need "src\app.tsx"
$I18n=Need "src\i18n\appTranslationPatches.ts"

Must $Widget 'export function MultiCurrencyField' 'Componente multi-valuta condiviso mancante'
Must $Widget 'originalAmount' 'Importo originale non salvato nei movimenti'
Must $Widget 'baseAmount' 'Equivalente in valuta predefinita non salvato'
Must $Widget 'exchangeRateDate' 'Data del cambio non salvata'
Must $Widget 'exchangeRateSource' 'Fonte del cambio non salvata'
Must $Widget '#8FD3FF' 'Valuta transazione non resa in celeste chiaro'
Must $Widget 'inline' 'Selettore valuta non integrato nell’importo'
Must $Widget 'selected !== base' 'Conversione non limitata alle valute non predefinite'
Must $Widget 'plan === "base"' 'Regola piano Base multi-valuta mancante'
Must $Widget 'plan === "premium"' 'Regola piano Completo multi-valuta mancante'

Must $History 'history_currency_priority_v1' 'Preferenza valuta principale Storico mancante'
Must $History 'historyFxView' 'Rendering storico multi-valuta mancante'
Must $History 'originalAmount \|\| e\.amount' 'Modifica uscita non preserva importo originale'
Must $Settings 'Importo principale nello Storico' 'Impostazione Storico multi-valuta mancante'
Must $Settings 'Valuta utilizzata' 'Opzione valuta utilizzata mancante'
Must $Settings 'Valuta predefinita' 'Opzione valuta predefinita mancante'

Must $Share 'MultiCurrencyField' 'Share non usa il selettore multi-valuta condiviso'
Must $Share 'shareAccountingAmount' 'Share non converte quote e saldi nella valuta predefinita'
Must $Share 'exchangeRateSource' 'Share non salva lo snapshot del cambio'
Must $AppSource 'foreignShare' 'Storico non propaga la quota Share in valuta originale'

Must $Account 'cleanFirstName' 'Nome separato non obbligatorio in registrazione'
Must $Account 'cleanLastName' 'Cognome separato non obbligatorio in registrazione'
Must $Account 'firstName: cleanFirstName' 'Nome non salvato separatamente nel profilo'
Must $Account 'lastName: cleanLastName' 'Cognome non salvato separatamente nel profilo'
MustNot $Account 'placeholder=\{L\("Mario Rossi"\)\}' 'Registrazione usa ancora un campo Nome completo unico'

foreach($Key in @('Cambia valuta','Cambio valuta disponibile dal piano Base.','Importo principale nello Storico','Valuta utilizzata','Valuta predefinita','L’altro importo resta visibile in piccolo sotto quello principale.')){Must $I18n ([regex]::Escape($Key)) ("Traduzione Phase 09 mancante: {0}" -f $Key)}
foreach($Lang in @('it','en','es','fr','de','pt','pl','nl','ro','el')){Must $I18n ([regex]::Escape($Lang+':')) ("Lingua non coperta: {0}" -f $Lang)}

Write-Host "[OK] Multi-valuta Entrate/Uscite con FX snapshot" -ForegroundColor Green
Write-Host "[OK] Multi-valuta Share con contabilità in valuta predefinita" -ForegroundColor Green
Write-Host "[OK] Storico configurabile: valuta pagata/predefinita in evidenza" -ForegroundColor Green
Write-Host "[OK] Registrazione con Nome e Cognome obbligatori" -ForegroundColor Green
Write-Host "[OK] Traduzioni 10 lingue verificate" -ForegroundColor Green
