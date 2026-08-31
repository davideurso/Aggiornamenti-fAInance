import { useEffect, useRef, useState } from "react";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { fbAuth } from "../firebase/client";
import { appEnvironment } from "../config/env";
import officialLogo from "../../assets/Logo 512.png";
import splashBanner from "../../assets/splash.png";

type ActionState =
  | "loading"
  | "verify-ready"
  | "verify-success"
  | "recover-success"
  | "reset-ready"
  | "reset-success"
  | "error";

const COPY: Record<string, Record<string, string>> = {
  it: {
    eyebrow: "Sicurezza account",
    loadingTitle: "Verifica in corso",
    loadingBody: "Stiamo controllando il link in modo sicuro.",
    verifyReadyTitle: "Verifica il tuo indirizzo email", verifyReadyBody: "Per proteggere il tuo account e accedere a tutti i servizi, completa ora la verifica del tuo indirizzo email.", completeVerification: "Verifica ora il mio indirizzo email", verifiedTitle: "Il tuo indirizzo email è stato verificato con successo!",
    verifiedBody:
      "Ora puoi accedere al tuo nuovo account e iniziare a utilizzare tutti i servizi di fAInance.",
    recoveredTitle: "Indirizzo email ripristinato",
    recoveredBody:
      "La modifica dell’indirizzo email è stata annullata correttamente.",
    resetTitle: "Crea una nuova password",
    resetBody: "Scegli una password di almeno 6 caratteri per il tuo account.",
    resetDoneTitle: "Password aggiornata",
    resetDoneBody: "La nuova password è attiva. Ora puoi accedere al tuo account.",
    invalidTitle: "Link non valido o già utilizzato",
    invalidBody:
      "Il collegamento potrebbe essere scaduto oppure essere già stato usato. Se riesci ad accedere, la verifica è già completata; altrimenti richiedi una nuova email dall’app.",
    email: "Account",
    password: "Nuova password",
    confirmPassword: "Conferma password",
    updatePassword: "Aggiorna password",
    updating: "Aggiornamento…",
    mismatch: "Le password non coincidono.",
    tooShort: "La password deve contenere almeno 6 caratteri.",
    openApp: "Vai all’accesso",
    verificationDoneButton: "Vai alla tua dashboard",
    security: "Non condividere mai password o codici ricevuti via email.",
    test: "AMBIENTE TEST",
  },
  en: {
    eyebrow: "Account security", loadingTitle: "Verification in progress", loadingBody: "We are securely checking the link.", verifyReadyTitle: "Verify your email address", verifyReadyBody: "To protect your account and access all services, complete your email verification now.", completeVerification: "Verify my email address", verifiedTitle: "Your email address has been verified successfully!", verifiedBody: "You can now access your new account and start using all fAInance services.", recoveredTitle: "Email address restored", recoveredBody: "The email address change has been cancelled.", resetTitle: "Create a new password", resetBody: "Choose a password of at least 6 characters.", resetDoneTitle: "Password updated", resetDoneBody: "Your new password is active. You can now sign in.", invalidTitle: "Invalid or already used link", invalidBody: "The link may have expired or already been used. If you can sign in, verification is complete; otherwise request a new email from the app.", email: "Account", password: "New password", confirmPassword: "Confirm password", updatePassword: "Update password", updating: "Updating…", mismatch: "The passwords do not match.", tooShort: "The password must contain at least 6 characters.", openApp: "Go to sign in", verificationDoneButton: "Go to your dashboard", security: "Never share passwords or codes received by email.", test: "TEST ENVIRONMENT",
  },
  es: {
    eyebrow: "Seguridad de la cuenta", loadingTitle: "Verificación en curso", loadingBody: "Estamos comprobando el enlace de forma segura.", verifyReadyTitle: "Verifica tu dirección de correo", verifyReadyBody: "Para proteger tu cuenta y acceder a todos los servicios, completa ahora la verificación de tu correo.", completeVerification: "Verificar mi correo ahora", verifiedTitle: "¡Tu dirección de correo se ha verificado correctamente!", verifiedBody: "Ya puedes acceder a tu nueva cuenta y empezar a utilizar todos los servicios de fAInance.", recoveredTitle: "Correo restaurado", recoveredBody: "El cambio de correo se ha cancelado correctamente.", resetTitle: "Crea una nueva contraseña", resetBody: "Elige una contraseña de al menos 6 caracteres.", resetDoneTitle: "Contraseña actualizada", resetDoneBody: "La nueva contraseña está activa.", invalidTitle: "Enlace no válido o ya utilizado", invalidBody: "El enlace puede haber caducado o ya haberse usado. Solicita un nuevo correo desde la app si es necesario.", email: "Cuenta", password: "Nueva contraseña", confirmPassword: "Confirmar contraseña", updatePassword: "Actualizar contraseña", updating: "Actualizando…", mismatch: "Las contraseñas no coinciden.", tooShort: "La contraseña debe tener al menos 6 caracteres.", openApp: "Ir al acceso", verificationDoneButton: "Ir a tu panel", security: "Nunca compartas contraseñas ni códigos recibidos por correo.", test: "ENTORNO DE PRUEBA",
  },
  fr: {
    eyebrow: "Sécurité du compte", loadingTitle: "Vérification en cours", loadingBody: "Nous vérifions le lien de manière sécurisée.", verifyReadyTitle: "Vérifiez votre adresse e-mail", verifyReadyBody: "Pour protéger votre compte et accéder à tous les services, terminez maintenant la vérification de votre adresse e-mail.", completeVerification: "Vérifier mon adresse e-mail", verifiedTitle: "Votre adresse e-mail a bien été vérifiée !", verifiedBody: "Vous pouvez maintenant accéder à votre nouveau compte et utiliser tous les services fAInance.", recoveredTitle: "Adresse e-mail restaurée", recoveredBody: "Le changement d’adresse a été annulé.", resetTitle: "Créer un nouveau mot de passe", resetBody: "Choisissez un mot de passe d’au moins 6 caractères.", resetDoneTitle: "Mot de passe mis à jour", resetDoneBody: "Votre nouveau mot de passe est actif.", invalidTitle: "Lien invalide ou déjà utilisé", invalidBody: "Le lien a peut-être expiré ou déjà été utilisé. Demandez un nouvel e-mail depuis l’application si nécessaire.", email: "Compte", password: "Nouveau mot de passe", confirmPassword: "Confirmer le mot de passe", updatePassword: "Mettre à jour", updating: "Mise à jour…", mismatch: "Les mots de passe ne correspondent pas.", tooShort: "Le mot de passe doit contenir au moins 6 caractères.", openApp: "Aller à la connexion", verificationDoneButton: "Accéder à votre tableau de bord", security: "Ne partagez jamais les mots de passe ou codes reçus par e-mail.", test: "ENVIRONNEMENT TEST",
  },
  de: {
    eyebrow: "Kontosicherheit", loadingTitle: "Überprüfung läuft", loadingBody: "Der Link wird sicher geprüft.", verifyReadyTitle: "Bestätige deine E-Mail-Adresse", verifyReadyBody: "Schließe jetzt die E-Mail-Bestätigung ab, um dein Konto zu schützen und alle Dienste nutzen zu können.", completeVerification: "E-Mail-Adresse bestätigen", verifiedTitle: "Deine E-Mail-Adresse wurde erfolgreich bestätigt!", verifiedBody: "Du kannst jetzt auf dein neues Konto zugreifen und alle fAInance-Dienste nutzen.", recoveredTitle: "E-Mail-Adresse wiederhergestellt", recoveredBody: "Die Änderung der E-Mail-Adresse wurde abgebrochen.", resetTitle: "Neues Passwort erstellen", resetBody: "Wähle ein Passwort mit mindestens 6 Zeichen.", resetDoneTitle: "Passwort aktualisiert", resetDoneBody: "Dein neues Passwort ist aktiv.", invalidTitle: "Ungültiger oder bereits verwendeter Link", invalidBody: "Der Link ist möglicherweise abgelaufen oder wurde bereits verwendet. Fordere bei Bedarf in der App eine neue E-Mail an.", email: "Konto", password: "Neues Passwort", confirmPassword: "Passwort bestätigen", updatePassword: "Passwort aktualisieren", updating: "Aktualisierung…", mismatch: "Die Passwörter stimmen nicht überein.", tooShort: "Das Passwort muss mindestens 6 Zeichen lang sein.", openApp: "Zur Anmeldung", verificationDoneButton: "Zum Dashboard", security: "Teile niemals Passwörter oder per E-Mail erhaltene Codes.", test: "TESTUMGEBUNG",
  },
  pt: {
    eyebrow: "Segurança da conta", loadingTitle: "Verificação em curso", loadingBody: "Estamos a verificar o link de forma segura.", verifyReadyTitle: "Verifique o seu endereço de email", verifyReadyBody: "Para proteger a sua conta e aceder a todos os serviços, conclua agora a verificação do seu email.", completeVerification: "Verificar o meu email agora", verifiedTitle: "O seu endereço de email foi verificado com sucesso!", verifiedBody: "Já pode aceder à sua nova conta e começar a utilizar todos os serviços do fAInance.", recoveredTitle: "Email restaurado", recoveredBody: "A alteração do email foi cancelada.", resetTitle: "Criar nova palavra-passe", resetBody: "Escolha uma palavra-passe com pelo menos 6 caracteres.", resetDoneTitle: "Palavra-passe atualizada", resetDoneBody: "A nova palavra-passe está ativa.", invalidTitle: "Link inválido ou já utilizado", invalidBody: "O link pode ter expirado ou já ter sido usado. Peça um novo email na app, se necessário.", email: "Conta", password: "Nova palavra-passe", confirmPassword: "Confirmar palavra-passe", updatePassword: "Atualizar", updating: "A atualizar…", mismatch: "As palavras-passe não coincidem.", tooShort: "A palavra-passe deve ter pelo menos 6 caracteres.", openApp: "Ir para o acesso", verificationDoneButton: "Ir para o painel", security: "Nunca partilhe palavras-passe ou códigos recebidos por email.", test: "AMBIENTE DE TESTE",
  },
  pl: {
    eyebrow: "Bezpieczeństwo konta", loadingTitle: "Trwa weryfikacja", loadingBody: "Bezpiecznie sprawdzamy link.", verifyReadyTitle: "Zweryfikuj swój adres e-mail", verifyReadyBody: "Aby chronić konto i uzyskać dostęp do wszystkich usług, dokończ teraz weryfikację adresu e-mail.", completeVerification: "Zweryfikuj mój e-mail", verifiedTitle: "Twój adres e-mail został pomyślnie zweryfikowany!", verifiedBody: "Możesz teraz uzyskać dostęp do nowego konta i korzystać ze wszystkich usług fAInance.", recoveredTitle: "Adres e-mail przywrócony", recoveredBody: "Zmiana adresu e-mail została anulowana.", resetTitle: "Utwórz nowe hasło", resetBody: "Wybierz hasło o długości co najmniej 6 znaków.", resetDoneTitle: "Hasło zaktualizowane", resetDoneBody: "Nowe hasło jest aktywne.", invalidTitle: "Link jest nieprawidłowy lub użyty", invalidBody: "Link mógł wygasnąć lub zostać użyty. W razie potrzeby poproś o nową wiadomość w aplikacji.", email: "Konto", password: "Nowe hasło", confirmPassword: "Potwierdź hasło", updatePassword: "Zaktualizuj hasło", updating: "Aktualizowanie…", mismatch: "Hasła nie są zgodne.", tooShort: "Hasło musi mieć co najmniej 6 znaków.", openApp: "Przejdź do logowania", verificationDoneButton: "Przejdź do panelu", security: "Nigdy nie udostępniaj haseł ani kodów otrzymanych e-mailem.", test: "ŚRODOWISKO TESTOWE",
  },
  nl: {
    eyebrow: "Accountbeveiliging", loadingTitle: "Verificatie wordt uitgevoerd", loadingBody: "We controleren de link veilig.", verifyReadyTitle: "Verifieer je e-mailadres", verifyReadyBody: "Voltooi nu de e-mailverificatie om je account te beschermen en toegang te krijgen tot alle diensten.", completeVerification: "Mijn e-mailadres verifiëren", verifiedTitle: "Je e-mailadres is succesvol geverifieerd!", verifiedBody: "Je kunt nu je nieuwe account openen en alle fAInance-diensten gebruiken.", recoveredTitle: "E-mailadres hersteld", recoveredBody: "De wijziging van het e-mailadres is geannuleerd.", resetTitle: "Nieuw wachtwoord maken", resetBody: "Kies een wachtwoord van minimaal 6 tekens.", resetDoneTitle: "Wachtwoord bijgewerkt", resetDoneBody: "Je nieuwe wachtwoord is actief.", invalidTitle: "Ongeldige of al gebruikte link", invalidBody: "De link kan verlopen of al gebruikt zijn. Vraag zo nodig een nieuwe e-mail aan in de app.", email: "Account", password: "Nieuw wachtwoord", confirmPassword: "Wachtwoord bevestigen", updatePassword: "Wachtwoord bijwerken", updating: "Bijwerken…", mismatch: "De wachtwoorden komen niet overeen.", tooShort: "Het wachtwoord moet minimaal 6 tekens bevatten.", openApp: "Naar inloggen", verificationDoneButton: "Ga naar je dashboard", security: "Deel nooit wachtwoorden of codes die je per e-mail ontvangt.", test: "TESTOMGEVING",
  },
  ro: {
    eyebrow: "Securitatea contului", loadingTitle: "Verificare în curs", loadingBody: "Verificăm linkul în siguranță.", verifyReadyTitle: "Verifică adresa de email", verifyReadyBody: "Pentru a-ți proteja contul și a accesa toate serviciile, finalizează acum verificarea adresei de email.", completeVerification: "Verifică adresa mea de email", verifiedTitle: "Adresa ta de email a fost verificată cu succes!", verifiedBody: "Acum poți accesa noul cont și poți începe să folosești toate serviciile fAInance.", recoveredTitle: "Adresa de email restaurată", recoveredBody: "Schimbarea adresei a fost anulată.", resetTitle: "Creează o parolă nouă", resetBody: "Alege o parolă de cel puțin 6 caractere.", resetDoneTitle: "Parolă actualizată", resetDoneBody: "Noua parolă este activă.", invalidTitle: "Link nevalid sau deja utilizat", invalidBody: "Linkul poate fi expirat sau deja folosit. Solicită un email nou din aplicație dacă este necesar.", email: "Cont", password: "Parolă nouă", confirmPassword: "Confirmă parola", updatePassword: "Actualizează parola", updating: "Se actualizează…", mismatch: "Parolele nu coincid.", tooShort: "Parola trebuie să aibă cel puțin 6 caractere.", openApp: "Mergi la autentificare", verificationDoneButton: "Mergi la panoul tău", security: "Nu distribui niciodată parole sau coduri primite prin email.", test: "MEDIU DE TEST",
  },
  el: {
    eyebrow: "Ασφάλεια λογαριασμού", loadingTitle: "Επαλήθευση σε εξέλιξη", loadingBody: "Ελέγχουμε με ασφάλεια τον σύνδεσμο.", verifyReadyTitle: "Επαληθεύστε τη διεύθυνση email", verifyReadyBody: "Για να προστατεύσετε τον λογαριασμό σας και να αποκτήσετε πρόσβαση σε όλες τις υπηρεσίες, ολοκληρώστε τώρα την επαλήθευση email.", completeVerification: "Επαλήθευση email τώρα", verifiedTitle: "Η διεύθυνση email επαληθεύτηκε με επιτυχία!", verifiedBody: "Μπορείτε τώρα να αποκτήσετε πρόσβαση στον νέο λογαριασμό σας και σε όλες τις υπηρεσίες fAInance.", recoveredTitle: "Το email επαναφέρθηκε", recoveredBody: "Η αλλαγή της διεύθυνσης email ακυρώθηκε.", resetTitle: "Δημιουργία νέου κωδικού", resetBody: "Επιλέξτε κωδικό με τουλάχιστον 6 χαρακτήρες.", resetDoneTitle: "Ο κωδικός ενημερώθηκε", resetDoneBody: "Ο νέος κωδικός είναι ενεργός.", invalidTitle: "Μη έγκυρος ή χρησιμοποιημένος σύνδεσμος", invalidBody: "Ο σύνδεσμος μπορεί να έληξε ή να χρησιμοποιήθηκε. Ζητήστε νέο email από την εφαρμογή αν χρειάζεται.", email: "Λογαριασμός", password: "Νέος κωδικός", confirmPassword: "Επιβεβαίωση κωδικού", updatePassword: "Ενημέρωση κωδικού", updating: "Ενημέρωση…", mismatch: "Οι κωδικοί δεν ταιριάζουν.", tooShort: "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.", openApp: "Μετάβαση στη σύνδεση", verificationDoneButton: "Μετάβαση στον πίνακα", security: "Μην κοινοποιείτε ποτέ κωδικούς ή κωδικούς email.", test: "ΠΕΡΙΒΑΛΛΟΝ ΔΟΚΙΜΗΣ",
  },
};

function safeLanguage(): string {
  const requested = new URLSearchParams(window.location.search).get("lang") ||
    navigator.language || "it";
  const short = String(requested).split("-")[0].toLowerCase();
  return COPY[short] ? short : "en";
}

export function isFainanceEmailActionUrl(): boolean {
  try {
    const path = String(window.location.pathname || "").replace(/\/+$/, "");
    const params = new URLSearchParams(window.location.search);
    const explicitRootAction = params.get("fainanceEmailAction") === "1";
    const hasFirebaseAction = !!params.get("mode") && !!params.get("oobCode");
    return hasFirebaseAction && (path === "/auth/action" || explicitRootAction);
  } catch {
    return false;
  }
}

export function EmailActionScreen() {
  const lang = safeLanguage();
  const T = COPY[lang] || COPY.en;
  const [state, setState] = useState<ActionState>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPasswordValue] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  const params = new URLSearchParams(window.location.search);
  const mode = String(params.get("mode") || "");
  const code = String(params.get("oobCode") || "");
  const isTest = appEnvironment === "test";

  useEffect(function () {
    if (started.current) return;
    started.current = true;
    async function run() {
      if (!mode || !code) {
        setState("error");
        return;
      }
      try {
        if (mode === "verifyEmail" || mode === "verifyAndChangeEmail") {
          const info = await checkActionCode(fbAuth, code);
          setEmail(String(info && info.data && info.data.email || ""));
          setState("verify-ready");
          return;
        }
        if (mode === "recoverEmail") {
          const info = await checkActionCode(fbAuth, code);
          setEmail(String(info && info.data && info.data.email || ""));
          await applyActionCode(fbAuth, code);
          setState("recover-success");
          return;
        }
        if (mode === "resetPassword") {
          const accountEmail = await verifyPasswordResetCode(fbAuth, code);
          setEmail(String(accountEmail || ""));
          setState("reset-ready");
          return;
        }
        setState("error");
      } catch (_error) {
        setState("error");
      }
    }
    void run();
  }, []);

  async function completeEmailVerification() {
    if (busy) return;
    setBusy(true);
    try {
      await applyActionCode(fbAuth, code);
      setState("verify-success");
    } catch (_error) {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  async function submitPasswordReset() {
    setFormError("");
    if (password.length < 6) {
      setFormError(T.tooShort);
      return;
    }
    if (password !== confirmPassword) {
      setFormError(T.mismatch);
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(fbAuth, code, password);
      setPassword("");
      setConfirmPasswordValue("");
      setState("reset-success");
    } catch (_error) {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  const verificationSuccess = state === "verify-success";
  const verificationFlow = state === "verify-ready" || verificationSuccess;

  const content = state === "loading"
    ? { icon: "…", title: T.loadingTitle, body: T.loadingBody, tone: "#2F6FDB", success: false }
    : state === "verify-ready"
    ? { icon: "✓", title: T.verifyReadyTitle, body: T.verifyReadyBody, tone: "#D9A326", success: false }
    : state === "verify-success"
    ? { icon: "✓", title: T.verifiedTitle, body: T.verifiedBody, tone: "#2FA55D", success: true }
    : state === "recover-success"
    ? { icon: "✓", title: T.recoveredTitle, body: T.recoveredBody, tone: "#2FA55D", success: true }
    : state === "reset-success"
    ? { icon: "✓", title: T.resetDoneTitle, body: T.resetDoneBody, tone: "#2FA55D", success: true }
    : state === "reset-ready"
    ? { icon: "✦", title: T.resetTitle, body: T.resetBody, tone: "#D9A326", success: false }
    : { icon: "!", title: T.invalidTitle, body: T.invalidBody, tone: "#D97706", success: false };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at 20% 8%,rgba(88,151,255,.13),transparent 30%),radial-gradient(circle at 86% 86%,rgba(232,184,76,.12),transparent 28%),#F5F8FD",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "max(22px,env(safe-area-inset-top,0px)) 16px max(22px,env(safe-area-inset-bottom,0px))",
        fontFamily: "Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          background: "#fff",
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: "0 24px 70px rgba(26,58,110,.15)",
          border: "1px solid rgba(38,84,160,.08)",
        }}
      >
        <div
          style={{
            position: "relative",
            minHeight: 116,
            background:
              "linear-gradient(135deg,rgba(243,248,255,.98),rgba(255,255,255,.96))",
            borderBottom: "1px solid #EDF1F7",
            overflow: "hidden",
          }}
        >
          <img
            src={splashBanner}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: .28,
              filter: "saturate(.85)",
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              minHeight: 116,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px 24px",
              boxSizing: "border-box",
            }}
          >
            <img
              src={officialLogo}
              alt="fAInance"
              style={{
                width: 76,
                height: 76,
                objectFit: "contain",
                filter: "drop-shadow(0 8px 16px rgba(24,61,116,.12))",
              }}
            />
            <div style={{ marginLeft: 14 }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#17386B",
                  letterSpacing: "-.45px",
                }}
              >
                fAInance
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 10,
                  lineHeight: 1.25,
                  fontWeight: 850,
                  letterSpacing: ".7px",
                  textTransform: "uppercase",
                  color: "#B78513",
                }}
              >
                Smart finance, powered by AI
              </div>
            </div>
            {isTest && (
              <div
                style={{
                  position: "absolute",
                  right: 14,
                  top: 12,
                  background: "#FFF5CF",
                  color: "#805E00",
                  border: "1px solid #F0D788",
                  borderRadius: 999,
                  padding: "5px 8px",
                  fontSize: 9,
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                {T.test}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "30px 28px 28px", textAlign: "center" }}>
          {verificationSuccess ? (
            <div
              style={{
                width: 142,
                height: 126,
                margin: "0 auto 24px",
                position: "relative",
              }}
              aria-hidden="true"
            >
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  top: 2,
                  width: 102,
                  height: 102,
                  borderRadius: "50%",
                  background: "rgba(47,165,93,.10)",
                  border: "1px solid rgba(47,165,93,.13)",
                  boxShadow: "0 16px 36px rgba(47,165,93,.12)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 34,
                  top: 16,
                  width: 74,
                  height: 74,
                  borderRadius: "50%",
                  background: "linear-gradient(145deg,#58C878,#2FA55D)",
                  boxShadow: "0 14px 30px rgba(47,165,93,.28)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 44,
                  lineHeight: 1,
                  fontWeight: 950,
                }}
              >
                ✓
              </div>
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <span
                  key={item}
                  style={{
                    position: "absolute",
                    width: item % 2 ? 6 : 5,
                    height: item % 2 ? 6 : 5,
                    borderRadius: item % 3 ? "50%" : 2,
                    background: item % 2 ? "#DDAE35" : "#55B976",
                    left: [9, 122, 18, 113, 51, 91][item],
                    top: [26, 33, 87, 88, 0, 106][item],
                    transform: `rotate(${item * 19}deg)`,
                    opacity: .9,
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                width: 150,
                height: 122,
                margin: "0 auto 24px",
                position: "relative",
              }}
              aria-hidden="true"
            >
              <div
                style={{
                  position: "absolute",
                  left: 13,
                  right: 13,
                  bottom: 4,
                  height: 76,
                  borderRadius: "17px 17px 24px 24px",
                  background: "linear-gradient(145deg,#EEF4FF,#C5D8F5)",
                  boxShadow: "0 15px 32px rgba(55,111,203,.16)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 36,
                  top: 4,
                  width: 78,
                  height: 86,
                  borderRadius: 14,
                  background: "#fff",
                  border: "1px solid #E1E7F1",
                  boxShadow: "0 8px 22px rgba(32,69,124,.10)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 57,
                  top: 29,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "3px solid " + content.tone,
                  color: content.tone,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 21,
                  fontWeight: 950,
                  zIndex: 3,
                }}
              >
                {content.icon}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 13,
                  right: 13,
                  bottom: 4,
                  height: 76,
                  clipPath: "polygon(0 15%,50% 68%,100% 15%,100% 100%,0 100%)",
                  background: "linear-gradient(135deg,#E0EAFB,#BCD1F1)",
                  borderRadius: 22,
                  zIndex: 4,
                }}
              />
            </div>
          )}

          <h1
            style={{
              margin: 0,
              color: "#0D2E63",
              fontSize: 29,
              lineHeight: 1.16,
              letterSpacing: "-.7px",
              fontWeight: 950,
            }}
          >
            {content.title}
          </h1>
          <div
            style={{
              width: 38,
              height: 3,
              borderRadius: 99,
              background: "#DDAE35",
              margin: "16px auto",
            }}
          />
          <p
            style={{
              margin: "0 auto",
              maxWidth: 410,
              color: "#5E6C83",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            {content.body}
          </p>

          {email && !verificationFlow && (
            <div
              style={{
                margin: "20px auto 0",
                padding: "11px 13px",
                maxWidth: 420,
                background: "#F7F9FD",
                border: "1px solid #E5EAF2",
                borderRadius: 13,
                fontSize: 12,
                color: "#748097",
                textAlign: "left",
              }}
            >
              <span style={{ fontWeight: 850 }}>{T.email}:</span>{" "}
              <span style={{ color: "#243D62", wordBreak: "break-all" }}>{email}</span>
            </div>
          )}

          {state === "verify-ready" && (
            <button
              type="button"
              onClick={completeEmailVerification}
              disabled={busy}
              style={{
                marginTop: 24,
                width: "100%",
                maxWidth: 410,
                minHeight: 56,
                border: 0,
                borderRadius: 16,
                background: "linear-gradient(135deg,#1851C5,#2675E7)",
                color: "#fff",
                fontSize: 16,
                fontWeight: 900,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? .72 : 1,
                boxShadow: "0 13px 28px rgba(29,88,202,.24)",
              }}
            >
              {busy ? T.loadingTitle : T.completeVerification} &nbsp;→
            </button>
          )}

          {state === "reset-ready" && (
            <div
              style={{
                margin: "22px auto 0",
                maxWidth: 420,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={T.password}
                style={{
                  width: "100%",
                  minHeight: 50,
                  border: "1px solid #DCE4EF",
                  borderRadius: 15,
                  padding: "12px 14px",
                  fontSize: 15,
                  boxSizing: "border-box",
                  outlineColor: "#2F6FDB",
                }}
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPasswordValue(event.target.value)}
                placeholder={T.confirmPassword}
                style={{
                  width: "100%",
                  minHeight: 50,
                  border: "1px solid #DCE4EF",
                  borderRadius: 15,
                  padding: "12px 14px",
                  fontSize: 15,
                  boxSizing: "border-box",
                  outlineColor: "#2F6FDB",
                }}
              />
              {formError && (
                <div
                  style={{
                    color: "#C2413A",
                    fontSize: 13,
                    fontWeight: 750,
                    textAlign: "left",
                  }}
                >
                  {formError}
                </div>
              )}
              <button
                type="button"
                onClick={submitPasswordReset}
                disabled={busy}
                style={{
                  minHeight: 52,
                  border: 0,
                  borderRadius: 15,
                  background: "linear-gradient(135deg,#1C53C6,#2D78E8)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: busy ? "wait" : "pointer",
                  opacity: busy ? .7 : 1,
                  boxShadow: "0 12px 24px rgba(35,94,207,.22)",
                }}
              >
                {busy ? T.updating : T.updatePassword}
              </button>
            </div>
          )}

          {state !== "loading" && state !== "verify-ready" && state !== "reset-ready" && (
            <button
              type="button"
              onClick={() => window.location.assign(window.location.origin + "/")}
              style={{
                marginTop: 24,
                width: "100%",
                maxWidth: 390,
                minHeight: 54,
                border: content.success ? "1px solid #1E5BD0" : 0,
                borderRadius: 16,
                background: content.success
                  ? "#fff"
                  : "linear-gradient(135deg,#1C53C6,#2D78E8)",
                color: content.success ? "#1654C5" : "#fff",
                fontSize: 16,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: content.success
                  ? "0 8px 22px rgba(32,83,175,.08)"
                  : "0 12px 26px rgba(35,94,207,.22)",
              }}
            >
              {verificationSuccess ? T.verificationDoneButton : T.openApp} &nbsp;→
            </button>
          )}

          <div
            style={{
              margin: "26px auto 0",
              maxWidth: 420,
              paddingTop: 18,
              borderTop: "1px solid #EDF1F6",
              display: "flex",
              gap: 9,
              alignItems: "center",
              justifyContent: "center",
              color: "#8994A8",
              fontSize: 11.5,
              lineHeight: 1.45,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#FFF5D8",
                color: "#A8790B",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
              }}
            >
              ♢
            </span>
            <span>{T.security}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
