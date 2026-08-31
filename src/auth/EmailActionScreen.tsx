import { useEffect, useMemo, useState } from "react";
import { getApp, getApps, initializeApp } from "firebase/app";
import { applyActionCode, getAuth } from "firebase/auth";

// FAINANCE_V57_EMAIL_ACTION_HANDLER
// Handler autonomo: non dipende dagli export del modulo core.
// Gestisce sia il link custom fAInance sia il formato standard Firebase,
// anche quando i parametri sono annidati dentro continueUrl/link/hash.

type EmailAction = {
  kind: "verifyEmail";
  oobCode: string;
  lang: string;
};

type Copy = {
  title: string;
  working: string;
  successTitle: string;
  successBody: string;
  errorTitle: string;
  invalid: string;
  expired: string;
  generic: string;
  login: string;
};

const SUPPORTED_LANGS = ["it","en","es","fr","de","pt","pl","nl","ro","el"] as const;

// Configurazione Firebase client Production: usata solo se il bootstrap
// principale non ha ancora inizializzato il default Firebase app.
const FAINANCE_PRODUCTION_FIREBASE = {
  apiKey: "AIzaSyDbYfP9LooqY4wreogJUC_TdxDFz7Ez3GU",
  authDomain: "fainance-a7794.firebaseapp.com",
  projectId: "fainance-a7794",
  storageBucket: "fainance-a7794.firebasestorage.app",
  messagingSenderId: "739607555867",
  appId: "1:739607555867:web:ae797cd0a578e476cd6dbe"
};

function resolveVerificationAuth() {
  const app = getApps().length ? getApp() : initializeApp(FAINANCE_PRODUCTION_FIREBASE);
  return getAuth(app);
}

const COPY: Record<string, Copy> = {
  it: {title:"Verifica email",working:"Sto verificando il tuo indirizzo email…",successTitle:"Email verificata",successBody:"Il tuo indirizzo email è stato verificato correttamente. Ora puoi tornare a fAInance e accedere.",errorTitle:"Verifica non riuscita",invalid:"Il link di verifica non è valido oppure è già stato utilizzato.",expired:"Il link di verifica è scaduto. Torna nell'app e richiedi una nuova email.",generic:"Non è stato possibile completare la verifica. Torna nell'app e richiedi un nuovo link.",login:"Vai al login"},
  en: {title:"Email verification",working:"Verifying your email address…",successTitle:"Email verified",successBody:"Your email address has been verified successfully. You can now return to fAInance and sign in.",errorTitle:"Verification failed",invalid:"This verification link is invalid or has already been used.",expired:"This verification link has expired. Return to the app and request a new email.",generic:"We could not complete the verification. Return to the app and request a new link.",login:"Go to sign in"},
  es: {title:"Verificación del email",working:"Verificando tu dirección de email…",successTitle:"Email verificado",successBody:"Tu dirección de email se ha verificado correctamente. Ya puedes volver a fAInance e iniciar sesión.",errorTitle:"No se pudo verificar",invalid:"Este enlace de verificación no es válido o ya se ha utilizado.",expired:"Este enlace de verificación ha caducado. Vuelve a la app y solicita un nuevo email.",generic:"No se pudo completar la verificación. Vuelve a la app y solicita un nuevo enlace.",login:"Ir al inicio de sesión"},
  fr: {title:"Vérification de l’e-mail",working:"Vérification de votre adresse e-mail…",successTitle:"E-mail vérifié",successBody:"Votre adresse e-mail a été vérifiée. Vous pouvez maintenant revenir dans fAInance et vous connecter.",errorTitle:"Échec de la vérification",invalid:"Ce lien de vérification n’est pas valide ou a déjà été utilisé.",expired:"Ce lien de vérification a expiré. Revenez dans l’app et demandez un nouvel e-mail.",generic:"La vérification n’a pas pu être terminée. Revenez dans l’app et demandez un nouveau lien.",login:"Aller à la connexion"},
  de: {title:"E-Mail-Verifizierung",working:"Deine E-Mail-Adresse wird verifiziert…",successTitle:"E-Mail verifiziert",successBody:"Deine E-Mail-Adresse wurde erfolgreich verifiziert. Du kannst jetzt zu fAInance zurückkehren und dich anmelden.",errorTitle:"Verifizierung fehlgeschlagen",invalid:"Dieser Verifizierungslink ist ungültig oder wurde bereits verwendet.",expired:"Dieser Verifizierungslink ist abgelaufen. Kehre zur App zurück und fordere eine neue E-Mail an.",generic:"Die Verifizierung konnte nicht abgeschlossen werden. Kehre zur App zurück und fordere einen neuen Link an.",login:"Zur Anmeldung"},
  pt: {title:"Verificação do email",working:"A verificar o teu endereço de email…",successTitle:"Email verificado",successBody:"O teu endereço de email foi verificado com sucesso. Já podes voltar ao fAInance e iniciar sessão.",errorTitle:"Falha na verificação",invalid:"Este link de verificação não é válido ou já foi utilizado.",expired:"Este link de verificação expirou. Volta à app e pede um novo email.",generic:"Não foi possível concluir a verificação. Volta à app e pede um novo link.",login:"Ir para o início de sessão"},
  pl: {title:"Weryfikacja e-maila",working:"Weryfikujemy Twój adres e-mail…",successTitle:"E-mail zweryfikowany",successBody:"Twój adres e-mail został pomyślnie zweryfikowany. Możesz wrócić do fAInance i się zalogować.",errorTitle:"Weryfikacja nie powiodła się",invalid:"Ten link weryfikacyjny jest nieprawidłowy lub został już użyty.",expired:"Ten link weryfikacyjny wygasł. Wróć do aplikacji i poproś o nową wiadomość.",generic:"Nie udało się zakończyć weryfikacji. Wróć do aplikacji i poproś o nowy link.",login:"Przejdź do logowania"},
  nl: {title:"E-mailverificatie",working:"Je e-mailadres wordt geverifieerd…",successTitle:"E-mail geverifieerd",successBody:"Je e-mailadres is succesvol geverifieerd. Je kunt nu teruggaan naar fAInance en inloggen.",errorTitle:"Verificatie mislukt",invalid:"Deze verificatielink is ongeldig of al gebruikt.",expired:"Deze verificatielink is verlopen. Ga terug naar de app en vraag een nieuwe e-mail aan.",generic:"De verificatie kon niet worden voltooid. Ga terug naar de app en vraag een nieuwe link aan.",login:"Naar inloggen"},
  ro: {title:"Verificarea e-mailului",working:"Îți verificăm adresa de e-mail…",successTitle:"E-mail verificat",successBody:"Adresa ta de e-mail a fost verificată cu succes. Acum poți reveni în fAInance și te poți autentifica.",errorTitle:"Verificarea a eșuat",invalid:"Acest link de verificare nu este valid sau a fost deja folosit.",expired:"Acest link de verificare a expirat. Revino în aplicație și solicită un e-mail nou.",generic:"Verificarea nu a putut fi finalizată. Revino în aplicație și solicită un link nou.",login:"Mergi la autentificare"},
  el: {title:"Επαλήθευση email",working:"Γίνεται επαλήθευση της διεύθυνσης email…",successTitle:"Το email επαληθεύτηκε",successBody:"Η διεύθυνση email επαληθεύτηκε με επιτυχία. Μπορείς τώρα να επιστρέψεις στο fAInance και να συνδεθείς.",errorTitle:"Η επαλήθευση απέτυχε",invalid:"Αυτός ο σύνδεσμος επαλήθευσης δεν είναι έγκυρος ή έχει ήδη χρησιμοποιηθεί.",expired:"Αυτός ο σύνδεσμος επαλήθευσης έχει λήξει. Επίστρεψε στην εφαρμογή και ζήτησε νέο email.",generic:"Δεν ήταν δυνατή η ολοκλήρωση της επαλήθευσης. Επίστρεψε στην εφαρμογή και ζήτησε νέο σύνδεσμο.",login:"Μετάβαση στη σύνδεση"}
};

function normalizeLang(raw: unknown): string {
  const code = String(raw || "").toLowerCase().replace("_", "-").split("-")[0];
  return (SUPPORTED_LANGS as readonly string[]).includes(code) ? code : "it";
}

function deviceLang(): string {
  try {
    const nav = typeof navigator !== "undefined" ? navigator : null;
    return normalizeLang((nav && nav.languages && nav.languages[0]) || (nav && nav.language) || "it-IT");
  } catch (_e) {
    return "it";
  }
}

function decodeLoose(value: string): string {
  let out = String(value || "");
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch (_e) { break; }
  }
  return out;
}

function asUrl(value: string, origin: string): URL | null {
  try { return new URL(value, origin); } catch (_e) { return null; }
}

function candidateActionUrls(): URL[] {
  if (typeof window === "undefined") return [];
  const origin = window.location.origin;
  const queue: string[] = [window.location.href];
  const seen = new Set<string>();
  const urls: URL[] = [];

  for (let guard = 0; guard < 12 && queue.length; guard++) {
    const raw = queue.shift() || "";
    const decoded = decodeLoose(raw);
    if (seen.has(decoded)) continue;
    seen.add(decoded);
    const url = asUrl(decoded, origin);
    if (!url) continue;
    urls.push(url);

    for (const key of ["link","continueUrl","continueURL","continue_url","url","redirect","redirectUrl","actionLink","firebaseLink","emailAction"]) {
      const nested = url.searchParams.get(key);
      if (nested) queue.push(nested);
    }

    // Alcune versioni del backend fAInance hanno usato fainanceEmailAction
    // come tipo azione, altre possono trasportarvi un link/query annidato.
    const customAction = url.searchParams.get("fainanceEmailAction");
    if (customAction && (customAction.includes("oobCode=") || customAction.includes("mode=") || customAction.includes("http://") || customAction.includes("https://") || customAction.includes("?"))) {
      queue.push(customAction);
    }

    const hash = String(url.hash || "").replace(/^#/, "");
    if (hash) {
      if (hash.startsWith("http://") || hash.startsWith("https://") || hash.startsWith("/") || hash.includes("?")) {
        queue.push(hash);
      } else if (hash.includes("=")) {
        queue.push(origin + "/?" + hash);
      }
    }
  }
  return urls;
}

export function getFainanceEmailAction(): EmailAction | null {
  const fallbackLang = deviceLang();
  for (const url of candidateActionUrls()) {
    const action = String(
      url.searchParams.get("fainanceEmailAction") ||
      url.searchParams.get("mode") ||
      url.searchParams.get("action") || ""
    ).toLowerCase();
    const oobCode = String(
      url.searchParams.get("oobCode") ||
      url.searchParams.get("oobcode") ||
      url.searchParams.get("code") || ""
    ).trim();
    const lang = normalizeLang(url.searchParams.get("lang") || url.searchParams.get("hl") || fallbackLang);
    const verifyAction = action === "verifyemail" || action === "verify-email" || action === "verify_email" || action === "verify";
    if (verifyAction && oobCode) return { kind: "verifyEmail", oobCode, lang };
  }
  return null;
}

export function hasFainanceEmailAction(): boolean {
  return !!getFainanceEmailAction();
}

function cleanActionUrl(lang: string) {
  try {
    if (typeof window === "undefined") return;
    const next = "/?emailVerified=1&lang=" + encodeURIComponent(lang);
    window.history.replaceState({}, document.title, next);
  } catch (_e) {}
}

function messageForError(copy: Copy, err: any): string {
  const code = String((err && err.code) || "").toLowerCase();
  if (code.includes("expired-action-code")) return copy.expired;
  if (code.includes("invalid-action-code") || code.includes("invalid-oob-code")) return copy.invalid;
  return copy.generic;
}

const verificationRuns = new Map<string, Promise<void>>();
function applyVerificationOnce(oobCode: string): Promise<void> {
  const existing = verificationRuns.get(oobCode);
  if (existing) return existing;
  const run = applyActionCode(resolveVerificationAuth(), oobCode);
  verificationRuns.set(oobCode, run);
  return run;
}

export function EmailActionScreen() {
  const action = useMemo(() => getFainanceEmailAction(), []);
  const lang = action ? action.lang : deviceLang();
  const copy = COPY[lang] || COPY.it;
  const [status, setStatus] = useState<"working"|"success"|"error">(action ? "working" : "error");
  const [message, setMessage] = useState(action ? copy.working : copy.invalid);

  useEffect(() => {
    let cancelled = false;
    if (!action || action.kind !== "verifyEmail") return;

    (async () => {
      try {
        await applyVerificationOnce(action.oobCode);
        if (cancelled) return;
        cleanActionUrl(lang);
        setStatus("success");
        setMessage(copy.successBody);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(messageForError(copy, err));
      }
    })();

    return () => { cancelled = true; };
  }, [action, copy, lang]);

  function goToLogin() {
    try { window.location.assign("/?lang=" + encodeURIComponent(lang)); }
    catch (_e) { window.location.href = "/"; }
  }

  const ok = status === "success";
  const busy = status === "working";

  return <div data-fainance-email-action-v57="true" style={{minHeight:"100vh",background:"linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,boxSizing:"border-box",fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
    <div style={{width:"100%",maxWidth:460,background:"#fff",borderRadius:24,padding:"30px 28px",boxShadow:"0 12px 44px rgba(31,55,105,.16)",textAlign:"center"}}>
      <div style={{width:58,height:58,borderRadius:20,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,background:busy?"#eef3ff":ok?"#eaf8f1":"#fff0f0",color:ok?"#1D9E75":"#E24B4A"}}>{busy?"…":ok?"✓":"!"}</div>
      <div style={{fontSize:25,fontWeight:850,color:"#17386b",marginBottom:10}}>{busy?copy.title:ok?copy.successTitle:copy.errorTitle}</div>
      <div style={{fontSize:15,lineHeight:1.6,color:"#66758a"}}>{message}</div>
      {!busy && <button type="button" onClick={goToLogin} style={{marginTop:24,width:"100%",border:0,borderRadius:14,padding:"14px 18px",background:"#1e60d8",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer"}}>{copy.login}</button>}
    </div>
  </div>;
}

export default EmailActionScreen;
