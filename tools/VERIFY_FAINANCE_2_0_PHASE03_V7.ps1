$ErrorActionPreference = "Stop"
$App = Split-Path -Parent $PSScriptRoot

function Need([string]$R){
    $P = Join-Path $App $R
    if(!(Test-Path -LiteralPath $P)){ throw ("File mancante: {0}" -f $R) }
    return $P
}

function Must([string]$T,[string]$V,[string]$M){
    if($T.IndexOf($V,[System.StringComparison]::Ordinal) -lt 0){ throw $M }
}

function MustNot([string]$T,[string]$V,[string]$M){
    if($T.IndexOf($V,[System.StringComparison]::Ordinal) -ge 0){ throw $M }
}

Write-Host "`n=== VERIFICA FAINANCE 2.0 - PHASE 03 V7 ===" -ForegroundColor Cyan

$A       = [IO.File]::ReadAllText((Need "src\account\AccountScreens.tsx"))
$Auth    = [IO.File]::ReadAllText((Need "src\auth\authService.ts"))
$Session = [IO.File]::ReadAllText((Need "src\auth\accountSession.ts"))
$Profile = [IO.File]::ReadAllText((Need "src\profile\profileService.ts"))
$Photo   = [IO.File]::ReadAllText((Need "src\profile\ProfilePhotoEditor.tsx"))
$Rules   = [IO.File]::ReadAllText((Need "firestore_share_rules_1.3.25.rules"))
$Start   = [IO.File]::ReadAllText((Need "tools\START_FAINANCE_TEST.ps1"))

Must $A 'signInWithAccountIdentifier(email,password)' 'Login email/username non collegato'
Must $A '{PL("Nome")} *' 'Nome non obbligatorio'
Must $A '{PL("Cognome")} *' 'Cognome non obbligatorio'
Must $A '{PL("Username")} *' 'Username non obbligatorio'
Must $A '<ProfilePhotoEditor file={photoEditorFile}' 'Editor foto non collegato'
Must $A 'gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginTop:12' 'Email/password non affiancati'

Must $Auth 'getDoc(doc(fbDb, "usernameLogin", key))' 'Lookup username Spark mancante'
MustNot $Auth 'signInWithCustomToken' 'Dipendenza custom token ancora presente'
MustNot $Auth 'cloudFunctionUrl("loginWithUsername")' 'Dipendenza Cloud Function ancora presente'

Must $Profile 'const USERNAME_LOGIN = "usernameLogin";' 'Alias username login mancante'
Must $Profile 'first && !last ? first :' 'Regola username solo Nome mancante'
Must $Session 'ensureUsernameLoginAlias' 'Migrazione alias username utenti esistenti mancante'

Must $Photo 'const [zoom, setZoom] = useState(1);' 'Zoom foto profilo mancante'
Must $Photo 'onPointerMove={pointerMove}' 'Centratura foto mancante'

Must $Rules 'match /usernameLogin/{usernameLower}' 'Regole usernameLogin mancanti'
Must $Rules 'allow get: if true;' 'Lookup puntuale username non leggibile prima del login'
Must $Rules 'allow list: if false;' 'Enumerazione usernameLogin non bloccata'

Must $Start '[int]$StartupTimeoutSeconds = 420' 'Timeout startup Test non aggiornato'
Must $Start '[int]$HttpRequestTimeoutSeconds = 90' 'Timeout HTTP Test non aggiornato'
Must $Start 'Attesa apertura porta Test' 'Attesa porta Test non presente'
Must $Start 'Compilazione iniziale Vite/Babel' 'Health-check lungo Vite/Babel non presente'
Must $Start '[OK] fAInance Test HTTP 200' 'START_FAINANCE_TEST non certifica HTTP 200'

Write-Host "[OK] Funzioni account Phase 03 verificate" -ForegroundColor Green
Write-Host "[OK] Username login Spark + regole Test verificati" -ForegroundColor Green
Write-Host "[OK] Editor foto profilo verificato" -ForegroundColor Green
Write-Host "[OK] START_FAINANCE_TEST certifica direttamente HTTP 200" -ForegroundColor Green
Write-Host "[OK] Phase 03 V7 verificata" -ForegroundColor Green
exit 0
