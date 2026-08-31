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

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 06 V3 ===" -ForegroundColor Cyan

$Settings = [IO.File]::ReadAllText((Need "src\settings\SettingsPanel.tsx"))
$Widget = [IO.File]::ReadAllText((Need "src\widget.tsx"))
$I18n = [IO.File]::ReadAllText((Need "src\i18n\appTranslationPatches.ts"))

# Gestione centralizzata in Impostazioni > Aspetto.
MustContain $Settings 'function CustomIconAppearancePanel(){' "Pannello libreria icone personali mancante"
MustContain $Settings 'id:"appearance_icons"' "Voce Icone personali mancante in Aspetto"
MustContain $Settings 'settingsPage==="appearance_icons"' "Pagina Icone personali non collegata"
MustContain $Settings 'uploadCustomIcon(file)' "Upload icona non collegato alla pagina Aspetto"
MustContain $Settings 'deleteCustomIconRecord(item.id)' "Eliminazione icona non collegata alla pagina Aspetto"
MustContain $Settings 'Disponibile per tutti i piani.' "Disponibilita tutti i piani non dichiarata"

# Nessun gating di piano sulla pagina icone personali.
MustNotContain $Settings 'if(settingsPage==="appearance_icons"){if(!settingAllowed' "Icone personali ancora bloccate da piano"
MustNotContain $Settings 'if(settingsPage==="appearance_icons")return <div><PageHeader title={L("Aspetto / Icone personali")}/><LockedFeatureCard' "Pagina icone personali bloccata da piano"

# Picker contestuale: selezione sì, upload/eliminazione no.
MustContain $Widget 'Puoi caricare e gestire le icone personali da Impostazioni > Aspetto > Icone personali.' "Indicazione percorso libreria mancante nel picker"
MustContain $Widget 'var customLibrary=useCustomIconLibrary();' "Libreria personale non disponibile nel picker"
MustNotContain $Widget 'uploadCustomIcon(file)' "Upload duplicato ancora presente nel picker contestuale"
MustNotContain $Widget 'deleteCustomIconRecord(item.id)' "Eliminazione duplicata ancora presente nel picker contestuale"
MustNotContain $Widget 'Carica icona personale")' "Bottone upload ancora presente nel picker contestuale"

# Verifica esplicita dei nuovi testi tradotti nelle 10 lingue supportate.
$TranslationKeys = @(
    'Icone personali',
    'Aspetto / Icone personali',
    'Carica e gestisci le icone personali disponibili in tutta l''app',
    'Carica qui le tue icone personali. Saranno disponibili in tutti i selettori di icone compatibili dell''app, indipendentemente dal piano.',
    'Carica nuova icona',
    'Disponibile per tutti i piani.',
    'La mia libreria',
    'Icona personale caricata',
    'Icona personale eliminata',
    'Puoi caricare e gestire le icone personali da Impostazioni > Aspetto > Icone personali.'
)
$I18nLines = $I18n -split "`r?`n"
foreach ($Key in $TranslationKeys) {
    $Needle = 'add("' + $Key + '",'
    $Line = @($I18nLines | Where-Object { $_.IndexOf($Needle,[System.StringComparison]::Ordinal) -ge 0 } | Select-Object -First 1)
    if ($Line.Count -ne 1) { throw ("Traduzione mancante: {0}" -f $Key) }
    foreach ($LangToken in @('it:','en:','es:','fr:','de:','pt:','pl:','nl:','ro:','el:')) {
        if ([string]$Line[0] -notmatch [regex]::Escape($LangToken)) {
            throw ("Traduzione {0} incompleta per lingua {1}" -f $Key,$LangToken)
        }
    }
}

Write-Host "[OK] Upload icone spostato in Impostazioni / Aspetto" -ForegroundColor Green
Write-Host "[OK] Libreria personale disponibile per tutti i piani" -ForegroundColor Green
Write-Host "[OK] Picker contestuale solo selezione, senza upload/eliminazione" -ForegroundColor Green
Write-Host "[OK] Traduzioni 10 lingue verificate" -ForegroundColor Green
exit 0
