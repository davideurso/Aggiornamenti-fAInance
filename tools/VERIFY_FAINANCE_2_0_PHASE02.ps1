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

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 02 ===" -ForegroundColor Cyan

$AppText = [IO.File]::ReadAllText((Need "src\app.tsx"))
$WidgetText = [IO.File]::ReadAllText((Need "src\widget.tsx"))

MustContain $AppText 'var setupChoiceRadius=10;' "Raggio bottoni configurazione guidata non aggiornato"
MustContain $AppText 'var setupActionRadius=10;' "Raggio azioni configurazione guidata non aggiornato"
MustContain $AppText 'var guideButtonRadius=10;' "Raggio bottoni introduzione non aggiornato"
MustContain $AppText 'var guideCloseRadius=11;' "Raggio chiusura introduzione non aggiornato"
MustContain $AppText 'Categoria ENTRATE predefinita' "ENTRATE non in maiuscolo nella configurazione"
MustContain $AppText 'Categoria USCITE predefinita' "USCITE non in maiuscolo nella configurazione"
MustContain $AppText 'Metodo di PAGAMENTO predefinito' "PAGAMENTO non in maiuscolo nella configurazione"

MustContain $WidgetText 'var calculatorGlyph=<svg width={iconOnly?(iconSize?Math.max(18,Math.round(iconSize*0.58)):24):14}' "Nuova icona calcolatrice non presente"
MustContain $WidgetText 'style={{display:"block"}}><rect x="5" y="3.25" width="14" height="17.5" rx="3.4"' "Grafica icona calcolatrice non aggiornata"
MustContain $WidgetText 'style={{display:"inline-flex",alignItems:"center",justifyContent:"center",lineHeight:0,transform:iconOnly?"translateY(0)":"none"}}' "Centratura icona calcolatrice non presente"
MustContain $WidgetText 'overflow:"hidden"' "Contenitore icona calcolatrice non rifinito"

Write-Host "[OK] Configurazione guidata: bottoni meno arrotondati" -ForegroundColor Green
Write-Host "[OK] Introduzione: bottoni meno arrotondati" -ForegroundColor Green
Write-Host "[OK] ENTRATE / USCITE / PAGAMENTO in maiuscolo" -ForegroundColor Green
Write-Host "[OK] Icona calcolatrice migliorata e centrata" -ForegroundColor Green
exit 0
