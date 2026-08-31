$ErrorActionPreference = "Stop"

$App = "C:\Users\Davide\Documents\Progetti\01 - fAInance\App"

function Need([string]$Relative) {
    $Path = Join-Path $App $Relative
    if (!(Test-Path -LiteralPath $Path)) { throw ("File mancante: {0}" -f $Relative) }
    return $Path
}

function MustContain([string]$Text,[string]$Value,[string]$Message) {
    if ($Text.IndexOf($Value,[System.StringComparison]::Ordinal) -lt 0) { throw $Message }
}

function MustNotContain([string]$Text,[string]$Value,[string]$Message) {
    if ($Text.IndexOf($Value,[System.StringComparison]::Ordinal) -ge 0) { throw $Message }
}

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 01 V4 ===" -ForegroundColor Cyan

$WidgetText = [IO.File]::ReadAllText((Need "src\widget.tsx"))
$ShareText = [IO.File]::ReadAllText((Need "src\sections\SharePanel.tsx"))

# Baseline Phase 01
MustContain $WidgetText 'min={form.frequency==="monthly"?0:1}' "Supporto giorno 0 assente"
MustContain $WidgetText 'height:isMobile?42:46' "Altezza Categoria/Metodo non ridotta"
MustContain $WidgetText '0 16px 38px rgba(83,74,183,.12)' "Profondita grafica movimenti non presente"

# Calculator stays available in Share; Share lives in its own extracted module.
MustContain $ShareText 'AmountCalculatorButton' "Import calcolatrice Share assente"
MustContain $ShareText '<AmountCalculatorButton value={shareAmount}' "Calcolatrice Share assente"

# Shared system for info buttons and their informational popups.
MustContain $WidgetText 'export function FainanceInfoPopover({label,title,body,children,size,popupWidth,popupOffsetY,popupAlign,buttonStyle,popupStyle}:any)' "Componente condiviso info-popup mancante"
MustContain $WidgetText 'function fainancePopupSurfaceStyle(dark,variant)' "Sistema condiviso popup mancante"
MustContain $WidgetText 'buttonBg:dark?"#5B4918":"#FFF3BF"' "Tema giallo chiaro della i mancante"
MustContain $WidgetText 'background:dark?"#3B3014":"#FFF8D8"' "Sfondo giallo chiaro del popup informativo mancante"

# Calculator icon replaces the wallet icon in standard Income/Expense amount card.
MustContain $WidgetText 'export function AmountCalculatorButton({value,onApply,inverse,compact,iconOnly,iconSize}:any)' "Calcolatrice icon-only non predisposta"
MustContain $WidgetText 'iconOnly iconSize={isMobile?34:46}' "Icona calcolatrice non posizionata al posto del portafoglio"
MustNotContain $WidgetText '<svg width={isMobile?20:28} height={isMobile?20:28} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 7.5h13.8c1.1 0 2 .9 2 2v8.2c0 1.1-.9 2-2 2H4.5' "Vecchia icona portafoglio ancora presente nella card importo"

# Recurring-day info now uses the shared system.
MustContain $WidgetText 'label={L("Informazioni sul giorno della ricorrente")}' "Info giorno ricorrente non agganciata al sistema condiviso"
MustContain $WidgetText 'body={L("Inserendo 0 verrà utilizzato l''ultimo giorno del mese.")}' "Testo info giorno ricorrente assente"
MustContain $WidgetText 'popupOffsetY={24}' "Popup informativo giorno ricorrente non allineato"
MustNotContain $WidgetText 'setDayInfoOpen' "Vecchia gestione locale della i ricorrente ancora presente"

# Other existing info buttons converted to the same shared component.
MustContain $WidgetText 'body={L("Avanti: la rata parte dal mese selezionato e continua nei mesi successivi. Indietro: la rata parte dal mese selezionato e viene distribuita anche nei mesi precedenti.")}' "Info rateizzazione non convertita al sistema condiviso"
MustContain $WidgetText 'title={L("Reddito di riferimento")}' "Info budget non convertita al sistema condiviso"

Write-Host "[OK] Calcolatrice Entrate/Uscite: icona al posto del portafoglio" -ForegroundColor Green
Write-Host "[OK] Calcolatrice Share verificata nel modulo SharePanel" -ForegroundColor Green
Write-Host "[OK] Sistema condiviso per i e popup informativi" -ForegroundColor Green
Write-Host "[OK] Colore giallo chiaro per i e popup informativi" -ForegroundColor Green
Write-Host "[OK] Ricorrenti, rateizzazione e Budget uniformati" -ForegroundColor Green
exit 0
