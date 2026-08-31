import { useState, useEffect, useMemo } from "react";
import { useApp, fbAuth, doc, setDoc, appBanner, fmtDate } from "../core";
import { translateFainanceText } from "../traduzioni";
import { PopupCloseButton } from "../widget";
import {
  getProfileCountryNames,
  localizeProfileCountryName,
} from "../profile/countries";
import {
  accountRequiresEmailVerification,
  EMAIL_VERIFICATION_POLICY_VERSION,
  registerEmailAccount,
  sendAccountEmailVerification,
  signInWithAccountIdentifier,
  signInWithEmailAccount,
  signOutAccount,
} from "../auth/authService";
import {
  buildBaseProfilePatch,
  defaultUsernameFromName,
  ensureDefaultUsernameForExistingUser,
  loadUserProfile,
  mergeUserProfile,
  saveUsernameForUser,
  splitDisplayName,
} from "../profile/profileService";
import {
  normalizeUsername,
  usernameLookupKey,
  validateUsername,
} from "../profile/username";
import { resizeProfilePhoto } from "../profile/profilePhoto";
import { ProfilePhotoEditor } from "../profile/ProfilePhotoEditor";
import { FainancePickerModal } from "../widget";
import { AccountSecurityCenter } from "../security/AccountSecurityCenter";
import {
  isAndroidLoginPlatform,
  performGoogleAccountLogin,
  performAppleAccountLogin,
  sendAccountPasswordReset,
  googleLoginErrorMessage,
  appleLoginErrorMessage,
} from "../auth/loginRuntime";
import { L, PL } from "../utils/translationFallback";
import {
  fainancePromiseTimeout,
  readFainanceStoredLang,
} from "../utils/appRuntime";
import {
  flushQueuedPreAuthTechnicalLogs,
  queuePreAuthTechnicalLog,
  writeTechnicalLog,
} from "../observability/technicalLogs";

export function fainanceBasicUserPayload(user: any, fallbackName?: string) {
  user = user || {};
  return {
    id: user.uid || user.id || "",
    email: String(user.email || "").toLowerCase(),
    name: user.displayName || user.name || fallbackName || "Utente",
  };
}

// fAInance 2.0 V24 - verification notice severity.
function fainanceV24VerificationNoticeIsError(value: any) {
  var text = String(value || "").toLocaleLowerCase();
  if (!text) return false;
  var warningTokens = [
    "email di verifica non inviata",
    "troppe richieste",
    "verification email was not sent",
    "verification email not sent",
    "too many requests",
    "no se envió el correo de verificación",
    "no se envio el correo de verificacion",
    "demasiadas solicitudes",
    "e-mail de vérification n’a pas été envoyé",
    "e-mail de verification n'a pas ete envoye",
    "trop de demandes",
    "bestätigungs-e-mail wurde nicht gesendet",
    "bestaetigungs-e-mail wurde nicht gesendet",
    "zu viele anfragen",
    "e-mail de verificação não foi enviado",
    "e-mail de verificacao nao foi enviado",
    "demasiados pedidos",
    "wiadomość weryfikacyjna nie została wysłana",
    "wiadomosc weryfikacyjna nie zostala wyslana",
    "zbyt wiele żądań",
    "zbyt wiele zadan",
    "verificatie-e-mail is niet verzonden",
    "te veel verzoeken",
    "e-mailul de verificare nu a fost trimis",
    "prea multe solicitări",
    "prea multe solicitari",
    "το email επαλήθευσης δεν στάλθηκε",
    "το email επαληθευσης δεν σταλθηκε",
    "πάρα πολλά αιτήματα",
    "παρα πολλα αιτηματα"
  ];
  return warningTokens.some(function (token) { return text.indexOf(token) >= 0; });
}

export function LoginScreen({ onLogin }) {
  var [mode, setMode] = useState("login");
  var [email, setEmail] = useState("");
  var [password, setPassword] = useState("");
  var [firstName, setFirstName] = useState("");
  var [lastName, setLastName] = useState("");
  var [username, setUsername] = useState("");
  var [registerNewsletter, setRegisterNewsletter] = useState(false);
  var [confirmPwd, setConfirmPwd] = useState("");
  var [showPwd, setShowPwd] = useState(false);
  var [error, setError] = useState("");
  var [infoText, setInfoText] = useState("");
  var [loading, setLoading] = useState(false);
  var [verificationBusy, setVerificationBusy] = useState(false);
  var [verificationEmail, setVerificationEmail] = useState("");
  var [resetSent, setResetSent] = useState(false);
  var [resetOpen, setResetOpen] = useState(false);
  var [resetEmail, setResetEmail] = useState("");

  useEffect(function () {
    try {
      var raw = sessionStorage.getItem("fainance_registration_notice_v1");
      if (!raw) return;
      var notice = JSON.parse(raw);
      var noticeEmail = String((notice && notice.email) || "")
        .trim()
        .toLowerCase();
      if (!noticeEmail) return;
      setMode("login");
      setEmail(noticeEmail);
      setVerificationEmail(noticeEmail);
      setInfoText(
        L(
          "Account creato. Ti abbiamo inviato un link di verifica via email prima del primo accesso."
        )
      );
      sessionStorage.removeItem("fainance_registration_notice_v1");
    } catch (_noticeError) {}
  }, []);

  // fAInance 2.0 V25 - verification gate notice.
  useEffect(function () {
    try {
      var raw = sessionStorage.getItem("fainance_email_verification_blocked_v25");
      if (!raw) return;
      var parsed = JSON.parse(raw);
      var blockedEmail = String((parsed && parsed.email) || "").trim().toLowerCase();
      sessionStorage.removeItem("fainance_email_verification_blocked_v25");
      setMode("login");
      if (blockedEmail) {
        setEmail(blockedEmail);
        setVerificationEmail(blockedEmail);
      }
      setError(
        L(
          "Per completare l’accesso devi verificare la tua email. Se non hai ricevuto il link, usa Reinvia verifica."
        )
      );
    } catch (_verificationGateNoticeError) {}
  }, []);
  function loginLang() {
    return readFainanceStoredLang();
  }
  function L(s) {
    return translateFainanceText(s, loginLang());
  }
  function usernameErrorText(code) {
    if (code === "USERNAME_REQUIRED") return L("Inserisci uno username.");
    if (code === "USERNAME_TOO_SHORT")
      return L("Lo username deve avere almeno 3 caratteri.");
    if (code === "USERNAME_TOO_LONG")
      return L("Lo username può avere massimo 24 caratteri.");
    if (code === "USERNAME_INVALID_CHARACTERS")
      return L(
        "Lo username può contenere solo lettere, numeri, punto, trattino o underscore."
      );
    if (code === "USERNAME_INVALID")
      return L("Lo username deve contenere almeno una lettera o un numero.");
    if (code === "USERNAME_TAKEN")
      return L("Questo username è già utilizzato.");
    return L("Username non valido.");
  }

  var inp = {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #e0e0e0",
    padding: "12px 14px",
    fontSize: 15,
    background: "#fff",
    color: "#333",
    boxSizing: "border-box",
    outline: "none",
  };

  async function doLogin() {
    setError("");
    setInfoText("");
    setVerificationEmail("");
    setLoading(true);
    try {
      var authUser: any = await signInWithAccountIdentifier(email, password);
      var hasPasswordProvider = (
        (authUser && authUser.providerData) ||
        []
      ).some(function (p) {
        return p && p.providerId === "password";
      });
      var requiresVerification =
        hasPasswordProvider && !authUser.emailVerified
          ? await accountRequiresEmailVerification(authUser)
          : false;
      if (requiresVerification) {
        writeTechnicalLog({
          category: "AUTH_FAILURE",
          operation: "email-password-login",
          result: "failure",
          severity: "warning",
          errorCode: "EMAIL_VERIFICATION_REQUIRED",
          metadata: {
            identifierKind:
              String(email || "").indexOf("@") >= 0 ? "email" : "username",
          },
        }).catch(function () {});
        setVerificationEmail(
          String(authUser.email || "")
            .trim()
            .toLowerCase()
        );

        await signOutAccount();
        setError(
          L(
            "Per completare l’accesso devi verificare la tua email. Se non hai ricevuto il link, usa “Reinvia email di verifica”."
          )
        );
        setLoading(false);
        return;
      }
      flushQueuedPreAuthTechnicalLogs().catch(function () {});
      writeTechnicalLog({
        category: "AUTH_SUCCESS",
        operation: "email-or-username-login",
        metadata: {
          identifierKind:
            String(email || "").indexOf("@") >= 0 ? "email" : "username",
        },
      }).catch(function () {});
      onLogin(
        {
          id: authUser.uid,
          email: authUser.email,
          name: authUser.displayName || firstName || "Utente",
        },
        authUser
      );
    } catch (err: any) {
      queuePreAuthTechnicalLog({
        category: "AUTH_FAILURE",
        operation: "email-or-username-login",
        errorCode: String((err && err.code) || "AUTH_ERROR"),
        metadata: {
          identifierKind:
            String(email || "").indexOf("@") >= 0 ? "email" : "username",
        },
      });
      setError(
        err.code === "auth/user-not-found" ||
          err.code === "auth/wrong-password" ||
          err.code === "auth/invalid-credential" ||
          err.code === "auth/username-not-found"
          ? L("Email, username o password non corretti.")
          : L("Errore: ") + (err && err.message ? err.message : String(err))
      );
      setLoading(false);
    }
  }

  async function doRegister() {
    setError("");
    setInfoText("");
    var cleanFirstName = String(firstName || "").trim();
    var cleanLastName = String(lastName || "").trim();
    var cleanName = [cleanFirstName, cleanLastName].join(" ");
    var cleanEmail = String(email || "").trim().toLowerCase();
    var cleanUsername = normalizeUsername(username);
    if (!cleanFirstName) { setError(L("Inserisci il tuo nome.")); return; }
    if (!cleanLastName) { setError(L("Inserisci il tuo cognome.")); return; }
    if (!cleanEmail.includes("@")) { setError(L("Email non valida.")); return; }
    var usernameValidation = cleanUsername ? validateUsername(cleanUsername) : "USERNAME_REQUIRED";
    if (usernameValidation) { setError(usernameErrorText(usernameValidation)); return; }
    if (password.length < 6) { setError(L("Password: minimo 6 caratteri.")); return; }
    if (password !== confirmPwd) { setError(L("Le password non coincidono.")); return; }
    try { sessionStorage.setItem("fainance_registration_pending_email_v1", cleanEmail); } catch (_pendingRegistrationError) {}
    setLoading(true);
    try {
      var authUser: any = null;
      var repairingExisting = false;
      try {
        authUser = await registerEmailAccount(cleanEmail, password);
      } catch (createErr: any) {
        if (createErr && createErr.code === "auth/email-already-in-use") {
          try {
            authUser = await signInWithEmailAccount(cleanEmail, password);
            repairingExisting = true;
          } catch (_repairLoginError) {
            throw createErr;
          }
        } else {
          throw createErr;
        }
      }

      if (repairingExisting) {
        var existingProfile: any = await loadUserProfile(authUser.uid).catch(function () { return null; });
        var existingEmail = String((existingProfile && existingProfile.email) || authUser.email || "").trim().toLowerCase();
        if (existingEmail && existingEmail !== cleanEmail) throw new Error("REGISTRATION_ACCOUNT_MISMATCH");
        var existingUsername = normalizeUsername(existingProfile && existingProfile.username);
        if (existingUsername && existingUsername !== cleanUsername) throw new Error("REGISTRATION_ACCOUNT_EXISTS");
      }

      await saveUsernameForUser(authUser.uid, cleanUsername, "", cleanEmail);
      var consentRecordedAt = new Date().toISOString();
      await mergeUserProfile(authUser.uid, {
        ...buildBaseProfilePatch(authUser, cleanName),
        firstName: cleanFirstName,
        lastName: cleanLastName,
        username: cleanUsername,
        usernameLower: usernameLookupKey(cleanUsername),
        newsletterConsent: !!registerNewsletter,
        newsletterConsentAt: registerNewsletter ? consentRecordedAt : "",
        newsletterConsentVersion: "2026-08-27-v1",
        newsletterUpdatedAt: consentRecordedAt,
        emailVerificationPolicyVersion: EMAIL_VERIFICATION_POLICY_VERSION,
        emailVerificationRequired: true,
        emailVerificationRequiredAt: new Date().toISOString(),
        createdAt: (repairingExisting && existingProfile && existingProfile.createdAt) || new Date().toISOString(),
      });

      var verificationDeferred = false;
      var verificationRateLimited = false;
      try {
        await sendAccountEmailVerification(authUser, loginLang());
      } catch (verificationErr: any) {
        verificationDeferred = true;
        verificationRateLimited = !!(verificationErr && verificationErr.code === "auth/too-many-requests");
        console.warn("Registration verification email deferred", (verificationErr && verificationErr.code) || "unknown");
      }

      try { sessionStorage.setItem("fainance_registration_notice_v1", JSON.stringify({ email: cleanEmail, createdAt: Date.now() })); } catch (_registrationNoticeError) {}
      await signOutAccount();
      try { sessionStorage.removeItem("fainance_registration_pending_email_v1"); } catch (_pendingRegistrationError) {}
      setMode("login");
      setPassword(""); setConfirmPwd(""); setFirstName(""); setLastName(""); setUsername("");
      setVerificationEmail(cleanEmail);
      if (verificationDeferred) {
        setInfoText(L("Account creato. Email di verifica non inviata. Puoi reinviarla dalla schermata di accesso.") + (verificationRateLimited ? " " + L("Troppe richieste. Attendi qualche minuto e riprova.") : ""));
      } else {
        setInfoText(L("Account creato. Ti abbiamo inviato un link di verifica via email prima del primo accesso."));
      }
    } catch (err: any) {
      try { sessionStorage.removeItem("fainance_registration_pending_email_v1"); } catch (_pendingRegistrationError) {}
      if (err && err.message && String(err.message).indexOf("USERNAME_") === 0) setError(usernameErrorText(String(err.message)));
      else if (err && (err.message === "REGISTRATION_ACCOUNT_EXISTS" || err.code === "auth/email-already-in-use")) setError(L("Email già registrata. Accedi con l’account esistente."));
      else if (err && err.code === "auth/too-many-requests") setError(L("Troppe richieste. Attendi qualche minuto e riprova."));
      else setError(L("Errore: ") + (err && err.message ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    var cleanEmail = String(verificationEmail || email || "")
      .trim()
      .toLowerCase();
    if (!cleanEmail || cleanEmail.indexOf("@") < 0) {
      setError(
        L("Inserisci un’email valida prima di richiedere una nuova verifica.")
      );
      return;
    }
    setVerificationBusy(true);
    setError("");
    setInfoText("");
    try {
      var tempPassword = String(password || "");
      if (!tempPassword) {
        setError(
          L(
            "Per reinviare l’email di verifica inserisci la password dell’account."
          )
        );
        return;
      }
      var authUser: any = await signInWithEmailAccount(
        cleanEmail,
        tempPassword
      );
      await sendAccountEmailVerification(authUser, loginLang());
      await signOutAccount();
      setInfoText(
        L("Nuova email di verifica inviata. Controlla la tua casella di posta.")
      );
    } catch (err: any) {
      setError(
        err.code === "auth/invalid-credential"
          ? L("Password non corretta per reinviare la verifica.")
          : L("Errore invio verifica: ") +
              ((err && err.message) || L("operazione non riuscita"))
      );
    } finally {
      setVerificationBusy(false);
    }
  }

  async function doGoogle() {
    setError("");
    setInfoText("");
    setLoading(true);
    try {
      var user: any = await performGoogleAccountLogin();
      flushQueuedPreAuthTechnicalLogs().catch(function () {});
      writeTechnicalLog({
        category: "AUTH_SUCCESS",
        operation: "google-login",
      }).catch(function () {});
      onLogin(fainanceBasicUserPayload(user), user);
    } catch (err: any) {
      queuePreAuthTechnicalLog({
        category: "AUTH_FAILURE",
        operation: "google-login",
        errorCode: String((err && err.code) || "AUTH_ERROR"),
      });
      console.error("Google login error", (err && err.code) || "unknown");
      setError(googleLoginErrorMessage(err, L));
      setLoading(false);
    }
  }

  async function doApple() {
    setError("");
    setInfoText("");
    setLoading(true);
    try {
      var user: any = await performAppleAccountLogin(loginLang());
      flushQueuedPreAuthTechnicalLogs().catch(function () {});
      writeTechnicalLog({
        category: "AUTH_SUCCESS",
        operation: "apple-login",
      }).catch(function () {});
      onLogin(fainanceBasicUserPayload(user), user);
    } catch (err: any) {
      queuePreAuthTechnicalLog({
        category: "AUTH_FAILURE",
        operation: "apple-login",
        errorCode: String((err && err.code) || "AUTH_ERROR"),
      });
      console.error("Apple login error", (err && err.code) || "unknown");
      setError(appleLoginErrorMessage(err, L));
      setLoading(false);
    }
  }

  async function doResetPassword() {
    setError("");
    setInfoText("");
    setResetSent(false);
    var cleanEmail = String(resetEmail || "")
      .trim()
      .toLowerCase();
    if (!cleanEmail || cleanEmail.indexOf("@") < 0) {
      setError(L("Inserisci l'email con cui ti sei registrato."));
      return;
    }
    setLoading(true);
    try {
      await sendAccountPasswordReset(cleanEmail, loginLang());
      setResetSent(true);
      setError("");
    } catch (err: any) {
      setError(
        (err && err.code) === "auth/user-not-found"
          ? L("Nessun account trovato con questa email.")
          : L("Errore recupero password: ") +
              ((err && err.message) || L("invio email non riuscito"))
      );
    } finally {
      setLoading(false);
    }
  }

  var infoTextIsVerificationError = fainanceV24VerificationNoticeIsError(infoText);

  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        minHeight: 0,
        background: "linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: mode === "register" ? "flex-start" : "center",
        padding:
          (isAndroidLoginPlatform()
            ? "max(env(safe-area-inset-top, 0px), 34px)"
            : "max(env(safe-area-inset-top, 0px), 24px)") +
          " 20px max(env(safe-area-inset-bottom, 0px), 20px)",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorY: "contain",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src={appBanner}
            alt="fAInance"
            style={{
              width: "100%",
              maxWidth: 280,
              height: "auto",
              objectFit: "contain",
              marginBottom: 10,
            }}
          />
          <div style={{ fontSize: 11, color: "#888", fontStyle: "italic" }}>
            {L("Your AI-powered finance tracker")}
          </div>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 8px 40px rgba(127,119,221,0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 0,
              background: "#f5f5f5",
              borderRadius: 12,
              padding: 3,
              marginBottom: 22,
            }}
          >
            <button
              onClick={function () {
                setMode("login");
                setError("");
                setInfoText("");
              }}
              style={{
                flex: 1,
                padding: "9px",
                border: "none",
                borderRadius: 10,
                background: mode === "login" ? "#fff" : "transparent",
                color: mode === "login" ? "#333" : "#888",
                fontSize: 14,
                cursor: "pointer",
                fontWeight: mode === "login" ? 600 : 400,
              }}
            >
              {L("Accedi")}
            </button>
            <button
              onClick={function () {
                setMode("register");
                setError("");
                setInfoText("");
              }}
              style={{
                flex: 1,
                padding: "9px",
                border: "none",
                borderRadius: 10,
                background: mode === "register" ? "#fff" : "transparent",
                color: mode === "register" ? "#333" : "#888",
                fontSize: 14,
                cursor: "pointer",
                fontWeight: mode === "register" ? 600 : 400,
              }}
            >
              {L("Registrati")}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#888",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {L("Nome")} *
                </label>
                <input
                  placeholder={L("Mario")}
                  value={firstName}
                  onChange={function (e) {
                    setFirstName(e.target.value);
                  }}
                  style={inp}
                  required
                />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
                    {L("Cognome")} *
                  </label>
                  <input
                    placeholder={L("Rossi")}
                    value={lastName}
                    onChange={function (e) { setLastName(e.target.value); }}
                    style={inp}
                    required
                  />
                </div>
              </div>
            )}
            {mode === "register" && (
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#888",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {L("Username")} *
                </label>
                <input
                  placeholder={L("mario.rossi")}
                  value={username}
                  onChange={function (e) {
                    setUsername(e.target.value);
                  }}
                  style={inp}
                />
                <div style={{ fontSize: 11, color: "#8a8a8a", marginTop: 4 }}>
                  {L(
                    "3–24 caratteri: lettere, numeri, punto, trattino o underscore."
                  )}
                </div>
              </div>
            )}
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#888",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                {L(mode === "login" ? "Email o username" : "Email")} *
              </label>
              <input
                type={mode === "login" ? "text" : "email"}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder={L(
                  mode === "login"
                    ? "nome@email.com o username"
                    : "nome@email.com"
                )}
                value={email}
                onChange={function (e) {
                  setEmail(e.target.value);
                }}
                style={inp}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#888",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                {L("Password")} *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder={L("Password")}
                  value={password}
                  onChange={function (e) {
                    setPassword(e.target.value);
                  }}
                  onKeyDown={function (e) {
                    if (e.key === "Enter" && mode === "login") doLogin();
                  }}
                  style={{ ...inp, paddingRight: 44 }}
                />
                <button
                  onClick={function () {
                    setShowPwd(!showPwd);
                  }}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    color: "#aaa",
                  }}
                >
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            {mode === "register" && (
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#888",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {L("Conferma password")} *
                </label>
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder={L("Ripeti password")}
                  value={confirmPwd}
                  onChange={function (e) {
                    setConfirmPwd(e.target.value);
                  }}
                  style={inp}
                />
              </div>
            )}
            {mode === "register" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  background: "#f8fbff",
                  border: "1px solid #dce9fb",
                  borderRadius: 14,
                  padding: "12px 14px",
                }}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={registerNewsletter}
                  onClick={function () {
                    setRegisterNewsletter(function (v) {
                      return !v;
                    });
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    borderRadius: 7,
                    border:
                      "2px solid " +
                      (registerNewsletter ? "#378ADD" : "#9CA9BC"),
                    background: registerNewsletter ? "#378ADD" : "#fff",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 950,
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {registerNewsletter ? "✓" : ""}
                </button>
                <span
                  onClick={function () {
                    setRegisterNewsletter(function (v) {
                      return !v;
                    });
                  }}
                  style={{
                    fontSize: 12,
                    color: "#4c4c61",
                    lineHeight: 1.45,
                    cursor: "pointer",
                    display: "inline-flex",
                    flexDirection: "column",
                  }}
                >
                  <span>
                    {L(
                      "Desidero ricevere solo comunicazioni davvero importanti su fAInance."
                    )}
                  </span>
                  <span>{L("Non sarà spam e non ti disturberà.")}</span>
                </span>
              </div>
            )}
            {mode === "login" && (
              <button
                onClick={function () {
                  setResetOpen(!resetOpen);
                  setResetSent(false);
                  setError("");
                  setInfoText("");
                  setResetEmail(
                    String(email || "").indexOf("@") >= 0 ? email : ""
                  );
                }}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  alignSelf: "flex-end",
                  fontSize: 12,
                  color: "#7F77DD",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {L("Password dimenticata?")}
              </button>
            )}
            {mode === "login" && resetOpen && (
              <div
                style={{
                  background: "linear-gradient(135deg,#f0edff,#e8f4ff)",
                  border: "1px solid rgba(127,119,221,0.25)",
                  borderRadius: 18,
                  padding: 16,
                  boxShadow: "0 6px 20px rgba(127,119,221,0.12)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      background:
                        "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 17,
                    }}
                  >
                    🔐
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#534AB7",
                      }}
                    >
                      {L("Recupera password")}
                    </div>
                    <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
                      {L("Ti invieremo un link sicuro per reimpostarla.")}
                    </div>
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#777",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {L("Email dell’account")}
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={function (e) {
                      setResetEmail(e.target.value);
                    }}
                    placeholder={L("nome@email.com")}
                    style={{
                      ...inp,
                      background: "#fff",
                      border: "1px solid rgba(127,119,221,0.25)",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={doResetPassword}
                    disabled={loading}
                    style={{
                      flex: 1,
                      background:
                        "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: "11px",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.65 : 1,
                    }}
                  >
                    {loading ? L("Invio...") : L("Invia email di recupero")}
                  </button>
                  <button
                    onClick={function () {
                      setResetOpen(false);
                      setResetSent(false);
                      setError("");
                    }}
                    disabled={loading}
                    style={{
                      background: "#fff",
                      color: "#666",
                      border: "1px solid #e0e0e0",
                      borderRadius: 12,
                      padding: "11px 13px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {L("Annulla")}
                  </button>
                </div>
              </div>
            )}
            {resetSent && (
              <div
                style={{
                  background: "#e8f8f0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 13,
                  color: "#1D9E75",
                  border: "1px solid #a8e6c8",
                  lineHeight: 1.4,
                }}
              >
                ✅{" "}
                {L(
                  "Email di recupero password inviata. Controlla la casella di posta."
                )}
              </div>
            )}
            {infoText && (
              <div
                style={{
                  background: infoTextIsVerificationError ? "#fff0f0" : "#eef8ef",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: infoTextIsVerificationError ? "#E24B4A" : "#21693a",
                  border: infoTextIsVerificationError ? "1px solid #fcc" : "1px solid #bfe5c6",
                  lineHeight: 1.45,
                }}
              >
                {infoTextIsVerificationError ? "⚠️" : "✅"} {infoText}
              </div>
            )}
            {error && (
              <div
                style={{
                  background: "#fff0f0",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#E24B4A",
                  border: "1px solid #fcc",
                  lineHeight: 1.45,
                }}
              >
                ⚠️ {error}
              </div>
            )}
            {mode === "login" && verificationEmail && (
              <button
                onClick={resendVerification}
                disabled={verificationBusy || loading}
                style={{
                  background: "#fff7e7",
                  color: "#9a6900",
                  border: "1px solid #f1d591",
                  borderRadius: 12,
                  padding: "11px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor:
                    verificationBusy || loading ? "not-allowed" : "pointer",
                  opacity: verificationBusy || loading ? 0.65 : 1,
                }}
              >
                {verificationBusy
                  ? L("Invio in corso...")
                  : L("Reinvia email di verifica")}
              </button>
            )}
            <button
              onClick={mode === "login" ? doLogin : doRegister}
              disabled={loading}
              style={{
                background:
                  "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "13px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "..."
                : mode === "login"
                ? L("Accedi")
                : L("Crea account")}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: "#eee" }} />
              <span style={{ fontSize: 12, color: "#aaa" }}>{L("oppure")}</span>
              <div style={{ flex: 1, height: 1, background: "#eee" }} />
            </div>
            <button
              onClick={doGoogle}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                background: "#fff",
                color: "#333",
                border: "1.5px solid #e0e0e0",
                borderRadius: 12,
                padding: "12px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path
                  fill="#4285F4"
                  d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.4-10.6 7.4-17.3z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.5 0 12-2.2 16-5.9l-7.9-6c-2.2 1.5-5 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.5v6.2C6.5 42.6 14.7 48 24 48z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.6 28.5c-.5-1.5-.8-3-.8-4.5s.3-3 .8-4.5v-6.2H2.5C.9 16.8 0 20.3 0 24s.9 7.2 2.5 10.7l8.1-6.2z"
                />
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.2 30.5 0 24 0 14.7 0 6.5 5.4 2.5 13.3l8.1 6.2C12.5 13.7 17.8 9.5 24 9.5z"
                />
              </svg>
              {L("Accedi con Google")}
            </button>
            {!isAndroidLoginPlatform() && (
              <button
                onClick={doApple}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  background: "#000",
                  color: "#fff",
                  border: "1.5px solid #000",
                  borderRadius: 12,
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                  style={{ display: "block", flexShrink: 0 }}
                >
                  <path
                    fill="currentColor"
                    d="M16.365 1.43c0 1.14-.423 2.145-1.27 3.014-.91.93-1.91 1.466-3.013 1.384-.13-1.091.383-2.255 1.168-3.058.862-.888 2.23-1.526 3.115-1.34zM20.5 17.34c-.55 1.27-.813 1.837-1.52 2.963-.987 1.526-2.38 3.43-4.104 3.443-1.535.014-1.93-.997-4.014-.986-2.085.01-2.52 1.004-4.055.99-1.724-.015-3.04-1.733-4.027-3.26-2.757-4.265-3.047-9.268-1.344-11.927 1.21-1.89 3.12-2.997 4.916-2.997 1.83 0 2.98 1.004 4.49 1.004 1.464 0 2.354-1.006 4.465-1.006 1.596 0 3.287.87 4.493 2.373-3.95 2.166-3.31 7.804.7 9.403z"
                  />
                </svg>
                {L("Accedi con Apple")}
              </button>
            )}
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            marginTop: 14,
            fontSize: 11,
            color: "#aaa",
          }}
        >
          © 2026 fAInance
        </div>
      </div>
    </div>
  );
}

export function ContactForm({ currentUser }) {
  var ctx = useApp();
  var dark = ctx.dark;
  var btnRadius = ctx.btnRadius;
  var textC = dark ? "#eee" : "#333";
  var subC = dark ? "#aaa" : "#888";
  var borderC = dark ? "#444" : "#eee";
  var cardBg = dark ? "#252535" : "#fff";
  var [name, setName] = useState(currentUser ? currentUser.name || "" : "");
  var [email, setEmail] = useState(currentUser ? currentUser.email || "" : "");
  var [subject, setSubject] = useState("");
  var [message, setMessage] = useState("");
  var [status, setStatus] = useState(null);
  var [loading, setLoading] = useState(false);
  var sinp = {
    width: "100%",
    borderRadius: 8,
    border: "1px solid " + borderC,
    padding: "9px 11px",
    fontSize: 14,
    background: dark ? "#2a2a3e" : "#fff",
    color: textC,
    boxSizing: "border-box",
  };
  function contactLang() {
    return readFainanceStoredLang();
  }
  function PL(s) {
    return translateFainanceText(s, contactLang());
  }
  async function send() {
    setStatus(null);
    if (!message.trim()) {
      setStatus({ type: "error", text: PL("Inserisci un messaggio.") });
      return;
    }
    setLoading(true);
    var payload = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim() || PL("Messaggio da fAInance"),
      message: message.trim(),
    };
    try {
      var contactToken = "";
      try {
        if (fbAuth.currentUser)
          contactToken = await fbAuth.currentUser.getIdToken();
      } catch (e) {}
      var contactCtrl = new AbortController();
      var contactTimeout = setTimeout(function () {
        contactCtrl.abort();
      }, 15000);
      var response = await fetch(
        "https://europe-west1-fainance-a7794.cloudfunctions.net/sendContactEmail",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(contactToken
              ? { Authorization: "Bearer " + contactToken }
              : {}),
          },
          signal: contactCtrl.signal,
          body: JSON.stringify(payload),
        }
      ).finally(function () {
        clearTimeout(contactTimeout);
      });
      var result = null;
      try {
        result = await response.json();
      } catch (parseErr) {
        result = null;
      }
      if (!response.ok || !result || result.ok !== true) {
        throw new Error(
          result && result.error ? result.error : PL("Invio non riuscito.")
        );
      }
      setStatus({ type: "ok", text: PL("Messaggio inviato correttamente.") });
      setSubject("");
      setMessage("");
    } catch (err) {
      setStatus({
        type: "error",
        text: err && err.message ? err.message : PL("Invio non riuscito."),
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 14,
        border: "1px solid " + borderC,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: textC,
          marginBottom: 14,
        }}
      >
        💬 {PL("Contattaci")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div>
            <label
              style={{
                fontSize: 11,
                color: subC,
                display: "block",
                marginBottom: 3,
              }}
            >
              {PL("Nome")}
            </label>
            <input
              value={name}
              onChange={function (e) {
                setName(e.target.value);
              }}
              style={sinp}
              placeholder={PL("Nome")}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                color: subC,
                display: "block",
                marginBottom: 3,
              }}
            >
              {PL("Email")}
            </label>
            <input
              value={email}
              onChange={function (e) {
                setEmail(e.target.value);
              }}
              style={sinp}
              placeholder="email@dominio.com"
            />
          </div>
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              color: subC,
              display: "block",
              marginBottom: 3,
            }}
          >
            {PL("Oggetto")}
          </label>
          <input
            value={subject}
            onChange={function (e) {
              setSubject(e.target.value);
            }}
            style={sinp}
            placeholder={PL("Oggetto del messaggio")}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              color: subC,
              display: "block",
              marginBottom: 3,
            }}
          >
            {PL("Messaggio")} *
          </label>
          <textarea
            value={message}
            onChange={function (e) {
              setMessage(e.target.value);
            }}
            style={{ ...sinp, minHeight: 110, resize: "vertical" }}
            placeholder={PL("Scrivi qui il messaggio...")}
          />
        </div>
        {status && (
          <div
            style={{
              fontSize: 13,
              borderRadius: 10,
              padding: "10px 12px",
              background: status.type === "ok" ? "#e8f8f0" : "#fff0f0",
              color: status.type === "ok" ? "#1D9E75" : "#E24B4A",
              border:
                "1px solid " + (status.type === "ok" ? "#a8e6c8" : "#fcc"),
            }}
          >
            {status.type === "ok" ? "✅ " : "⚠️ "}
            {status.text}
          </div>
        )}
        <button
          type="button"
          onClick={function (e) {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            send();
          }}
          disabled={loading}
          style={{
            background:
              "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
            color: "#fff",
            border: "none",
            borderRadius: btnRadius,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading ? PL("Invio in corso...") : PL("Invia messaggio")}
        </button>
      </div>
    </div>
  );
}

export function ChangePwdSection({
  dark,
  textC,
  subC,
  borderC,
  btnRadius,
  setToast,
  confirmButtonColor,
  secondaryButtonColor,
  inActionGrid,
}) {
  var [open, setOpen] = useState(false);
  var [newPwd, setNewPwd] = useState("");
  var [confirmPwd, setConfirmPwd] = useState("");
  var [error, setError] = useState("");
  var [loading, setLoading] = useState(false);
  var sinp = {
    width: "100%",
    borderRadius: 12,
    border: "1px solid " + (dark ? "#4a4a62" : "#DDE4F2"),
    padding: "11px 12px",
    fontSize: 13,
    background: dark ? "#242437" : "#fff",
    color: textC,
    boxSizing: "border-box",
    boxShadow: dark ? "none" : "0 3px 12px rgba(30,64,175,.06)",
    outline: "none",
  };
  function profileLang() {
    return readFainanceStoredLang();
  }
  function PL(s) {
    return translateFainanceText(s, profileLang());
  }
  function authActionSettings() {
    var origin = "https://fainanceapp.it";
    try {
      if (
        typeof window !== "undefined" &&
        window.location &&
        window.location.origin
      )
        origin = window.location.origin;
    } catch (e) {}
    return { url: origin, handleCodeInApp: false };
  }
  function LegacyPlacePromptField({
    label,
    value,
    onChange,
    placeholder,
    types,
    countryRestriction,
    fallback,
  }) {
    var [suggestions, setSuggestions] = useState([]);
    var [focused, setFocused] = useState(false);
    function askGoogle(q) {
      try {
        var g = (window as any).google;
        if (
          !g ||
          !g.maps ||
          !g.maps.places ||
          !g.maps.places.AutocompleteService
        )
          return false;
        if (!q || String(q).trim().length < 2) {
          setSuggestions([]);
          return true;
        }
        var service = new g.maps.places.AutocompleteService();
        var opts = { input: String(q), types: types || ["(regions)"] };
        if (countryRestriction)
          opts.componentRestrictions = { country: countryRestriction };
        service.getPlacePredictions(opts, function (preds, status) {
          var ok =
            g.maps.places.PlacesServiceStatus &&
            status === g.maps.places.PlacesServiceStatus.OK;
          setSuggestions(
            ok && preds
              ? preds
                  .map(function (x) {
                    return x.description;
                  })
                  .slice(0, 8)
              : []
          );
        });
        return true;
      } catch (e) {
        return false;
      }
    }
    function handle(v) {
      onChange(v);
      if (!askGoogle(v)) {
        var low = String(v || "").toLowerCase();
        setSuggestions(
          (fallback || [])
            .filter(function (x) {
              return String(x).toLowerCase().indexOf(low) >= 0;
            })
            .slice(0, 8)
        );
      }
    }
    return (
      <div style={{ position: "relative" }}>
        <label
          style={{
            fontSize: 11,
            color: subC,
            display: "block",
            marginBottom: 3,
          }}
        >
          {label}
        </label>
        <input
          value={value}
          onFocus={function () {
            setFocused(true);
            handle(value);
          }}
          onBlur={function () {
            setTimeout(function () {
              setFocused(false);
            }, 150);
          }}
          onChange={function (e) {
            handle(e.target.value);
          }}
          style={sinp}
          placeholder={placeholder}
        />
        {focused && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              zIndex: 40,
              left: 0,
              right: 0,
              top: 58,
              background: dark ? "#252535" : "#fff",
              border: "1px solid " + borderC,
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,.16)",
              maxHeight: 190,
              overflowY: "auto",
            }}
          >
            {suggestions.map(function (x) {
              return (
                <button
                  key={x}
                  onMouseDown={function (e) {
                    e.preventDefault();
                    onChange(x);
                    setSuggestions([]);
                    setFocused(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: "9px 11px",
                    fontSize: 12,
                    color: textC,
                    cursor: "pointer",
                  }}
                >
                  {x}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  function save() {
    setError("");
    if (newPwd.length < 6) {
      setError(PL("Minimo 6 caratteri."));
      return;
    }
    if (newPwd !== confirmPwd) {
      setError(L("Le password non coincidono."));
      return;
    }
    setLoading(true);
    var user = fbAuth.currentUser;
    if (!user) {
      setError(PL("Utente non trovato."));
      setLoading(false);
      return;
    }
    import("firebase/auth")
      .then(function (mod) {
        if (!mod || !mod.updatePassword)
          throw new Error("Funzione cambio password non disponibile.");
        return mod.updatePassword(user, newPwd);
      })
      .then(function () {
        setToast(PL("Password aggiornata"));
        setOpen(false);
        setNewPwd("");
        setConfirmPwd("");
      })
      .catch(function (err) {
        if (err && err.code === "auth/requires-recent-login") {
          setError(
            PL("Per sicurezza, esci e rientra prima di cambiare la password.")
          );
        } else {
          setError(
            PL("Errore") +
              ": " +
              ((err && err.message) || PL("cambio password non riuscito"))
          );
        }
      })
      .finally(function () {
        setLoading(false);
      });
  }
  var primaryC = confirmButtonColor || "#378ADD";
  var secondaryC = secondaryButtonColor || "#5FAFE5";
  return (
    <div
      style={
        inActionGrid
          ? { display: "contents" }
          : { borderTop: "1px solid " + borderC, paddingTop: 12, marginTop: 12 }
      }
    >
      <button
        type="button"
        onClick={function () {
          setOpen(!open);
          setError("");
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: dark ? "#292940" : secondaryC + "18",
          border: "1px solid " + secondaryC,
          borderRadius: btnRadius,
          cursor: "pointer",
          color: dark ? "#E5ECFF" : secondaryC,
          fontSize: 13,
          fontWeight: 800,
          padding: "10px 12px",
          boxSizing: "border-box",
        }}
      >
        🔑 {open ? PL("Annulla") : PL("Cambia password")}
      </button>
      {open && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 12,
            gridColumn: inActionGrid ? "1 / -1" : undefined,
            background: dark ? "#202033" : "#F8FAFF",
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 12,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 11,
                color: subC,
                display: "block",
                marginBottom: 3,
              }}
            >
              {PL("Nuova password")}
            </label>
            <input
              type="password"
              value={newPwd}
              onChange={function (e) {
                setNewPwd(e.target.value);
              }}
              style={sinp}
              placeholder={PL("Minimo 6 caratteri")}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                color: subC,
                display: "block",
                marginBottom: 3,
              }}
            >
              {PL("Conferma password")}
            </label>
            <input
              type="password"
              value={confirmPwd}
              onChange={function (e) {
                setConfirmPwd(e.target.value);
              }}
              style={sinp}
            />
          </div>
          {error && (
            <div
              style={{
                fontSize: 12,
                color: "#E24B4A",
                background: "#fff0f0",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              {error}
            </div>
          )}
          <button
            onClick={save}
            disabled={loading}
            style={{
              background: primaryC,
              color: "#fff",
              border: "none",
              borderRadius: btnRadius,
              padding: "10px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "..." : PL("Aggiorna password")}
          </button>
        </div>
      )}
    </div>
  );
}

export function AccountAccessSecurityCard({
  currentUser,
  dark,
  textC,
  subC,
  borderC,
  cardBg,
  btnRadius,
  setToast,
  fbDb: fbDbProp,
  onProfileUpdate,
  onRequestAccountDeletion,
  onCancelAccountDeletion,
  onLogout,
  lang,
  confirmButtonColor,
  secondaryButtonColor,
}) {
  var [emailOpen, setEmailOpen] = useState(false);
  var [newEmail, setNewEmail] = useState(String(currentUser.email || ""));
  var [emailLoading, setEmailLoading] = useState(false);
  var [emailError, setEmailError] = useState("");
  var [emailOk, setEmailOk] = useState(false);
  var primaryC = confirmButtonColor || "#378ADD";
  var secondaryC = secondaryButtonColor || "#5FAFE5";
  function profileLang() {
    return String(lang || readFainanceStoredLang() || "it").split("-")[0];
  }
  function T(s) {
    return translateFainanceText(s, profileLang());
  }
  function authActionSettings() {
    var origin = "https://fainanceapp.it";
    try {
      if (typeof window !== "undefined" && window.location && window.location.origin) origin = window.location.origin;
    } catch (e) {}
    return { url: origin, handleCodeInApp: false };
  }
  async function saveEmailChange() {
    setEmailError("");
    setEmailOk(false);
    var cleanEmail = String(newEmail || "").trim().toLowerCase();
    if (!cleanEmail || cleanEmail.indexOf("@") < 0) { setEmailError(T("Inserisci una nuova email valida.")); return; }
    if (cleanEmail === String(currentUser.email || "").toLowerCase()) { setEmailError(T("La nuova email è uguale a quella attuale.")); return; }
    setEmailLoading(true);
    try {
      var user = fbAuth.currentUser;
      if (!user) throw new Error(T("Utente non trovato. Esci e rientra, poi riprova."));
      const mod = await import("firebase/auth");
      try { fbAuth.languageCode = profileLang(); } catch (e) {}
      if (mod.verifyBeforeUpdateEmail) {
        await mod.verifyBeforeUpdateEmail(user, cleanEmail, authActionSettings());
        setEmailOk(true);
        setEmailOpen(false);
        if (setToast) setToast({ text: T("Email di verifica inviata"), type: "success", icon: "✅" });
      } else {
        await mod.updateEmail(user, cleanEmail);
        if (currentUser.id && fbDbProp) {
          await setDoc(doc(fbDbProp, "users", currentUser.id), { email: cleanEmail, updatedAt: new Date().toISOString() }, { merge: true });
        }
        if (onProfileUpdate) onProfileUpdate({ email: cleanEmail });
        setEmailOk(true);
        setEmailOpen(false);
        if (setToast) setToast({ text: T("Email aggiornata"), type: "success", icon: "✅" });
      }
    } catch (err: any) {
      var code = err && err.code ? err.code : "";
      if (code === "auth/requires-recent-login") setEmailError(T("Per sicurezza, esci e rientra prima di cambiare email."));
      else if (code === "auth/email-already-in-use") setEmailError(T("Questa email è già usata da un altro account."));
      else if (code === "auth/invalid-email") setEmailError(T("Email non valida."));
      else setEmailError(T("Errore cambio email: ") + ((err && err.message) || T("operazione non riuscita")));
    } finally { setEmailLoading(false); }
  }
  var inputStyle: any = {
    width: "100%", boxSizing: "border-box", borderRadius: 12, border: "1px solid " + borderC,
    padding: "11px 12px", fontSize: 13, background: dark ? "#242437" : "#fff", color: textC
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        background: dark ? "linear-gradient(155deg,#202034,#292944)" : "linear-gradient(155deg,#ffffff,#f4f8ff 68%,#fff8e8)",
        border: "1.5px solid " + (dark ? "#4A4A65" : secondaryC + "66"), borderRadius: 18, padding: 16,
        boxShadow: dark ? "0 10px 24px rgba(0,0,0,.18)" : "0 10px 26px rgba(52,86,145,.10)"
      }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: textC, marginBottom: 4 }}>🔑 {T("Accesso account")}</div>
        <div style={{ fontSize: 12, color: subC, lineHeight: 1.45, marginBottom: 12 }}>{T("Gestisci password ed email usate per accedere a fAInance.")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <button type="button" onClick={function(){ setEmailOpen(!emailOpen); setEmailError(""); setNewEmail(String(currentUser.email || "")); }} style={{
            background: dark ? "#292940" : secondaryC + "18", color: dark ? "#E5ECFF" : secondaryC, border: "1px solid " + secondaryC,
            borderRadius: btnRadius, padding: "10px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer"
          }}>📧 {T("Cambia Email")}</button>
          <ChangePwdSection dark={dark} textC={textC} subC={subC} borderC={borderC} btnRadius={btnRadius} setToast={setToast} confirmButtonColor={primaryC} secondaryButtonColor={secondaryC} inActionGrid />
        </div>
        {emailOpen && <div style={{ marginTop: 12, background: dark ? "#202235" : "#f8fbff", border: "1px solid " + borderC, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: textC }}>{T("Aggiorna email di accesso")}</div>
          <input type="email" value={newEmail} onChange={function(e){ setNewEmail(e.target.value); }} placeholder="nome@email.com" style={inputStyle} />
          <div style={{ fontSize: 11, color: subC, lineHeight: 1.35 }}>{T("La nuova email diventerà l’indirizzo usato per accedere all’app.")}</div>
          {emailError && <div style={{ fontSize: 12, color: "#E24B4A", background: dark ? "#3a1d1d" : "#fff0f0", borderRadius: 8, padding: "8px 10px" }}>{emailError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={saveEmailChange} disabled={emailLoading} style={{ flex: 1, background: primaryC, color: "#fff", border: "none", borderRadius: btnRadius, padding: 10, fontSize: 13, fontWeight: 800, cursor: emailLoading ? "not-allowed" : "pointer", opacity: emailLoading ? .65 : 1 }}>{emailLoading ? T("Salvataggio...") : T("Salva")}</button>
            <button type="button" onClick={function(){ setEmailOpen(false); setEmailError(""); }} disabled={emailLoading} style={{ background: dark ? "#333" : "#f0f0f0", color: textC, border: "none", borderRadius: btnRadius, padding: "10px 12px", cursor: "pointer" }}>{T("Annulla")}</button>
          </div>
        </div>}
        {emailOk && <div style={{ fontSize: 12, color: "#1D9E75", marginTop: 8 }}>{T("Email di verifica inviata. Apri il link ricevuto sulla nuova email per completare il cambio.")}</div>}
      </div>
      <AccountSecurityCenter currentUser={currentUser} dark={dark} textC={textC} subC={subC} borderC={borderC} cardBg={cardBg} btnRadius={btnRadius} translate={T} setToast={setToast} onRequestAccountDeletion={onRequestAccountDeletion} onCancelAccountDeletion={onCancelAccountDeletion} onLogout={onLogout} showDevices={false} showDeletion={true} />
    </div>
  );
}

export function ProfilePlacePromptField({
  label,
  value,
  onChange,
  placeholder,
  types,
  countryRestriction,
  fallback,
  subC,
  dark,
  borderC,
  textC,
  sinp,
}) {
  var [suggestions, setSuggestions] = useState([]);
  var [focused, setFocused] = useState(false);
  function askGoogle(q) {
    try {
      var g = (window as any).google;
      if (!g || !g.maps || !g.maps.places || !g.maps.places.AutocompleteService)
        return false;
      if (!q || String(q).trim().length < 2) {
        setSuggestions([]);
        return true;
      }
      var service = new g.maps.places.AutocompleteService();
      var opts = { input: String(q), types: types || ["(regions)"] };
      if (countryRestriction)
        opts.componentRestrictions = { country: countryRestriction };
      service.getPlacePredictions(opts, function (preds, status) {
        var ok =
          g.maps.places.PlacesServiceStatus &&
          status === g.maps.places.PlacesServiceStatus.OK;
        setSuggestions(
          ok && preds
            ? preds
                .map(function (x) {
                  return x.description;
                })
                .slice(0, 8)
            : []
        );
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  function handle(v) {
    onChange(v);
    if (!askGoogle(v)) {
      var low = String(v || "").toLowerCase();
      setSuggestions(
        (fallback || [])
          .filter(function (x) {
            return String(x).toLowerCase().indexOf(low) >= 0;
          })
          .slice(0, 8)
      );
    }
  }
  return (
    <div style={{ position: "relative" }}>
      <label
        style={{ fontSize: 11, color: subC, display: "block", marginBottom: 3 }}
      >
        {label}
      </label>
      <input
        value={value}
        onFocus={function () {
          setFocused(true);
          handle(value);
        }}
        onBlur={function () {
          setTimeout(function () {
            setFocused(false);
          }, 150);
        }}
        onChange={function (e) {
          handle(e.target.value);
        }}
        style={sinp}
        placeholder={placeholder}
      />
      {focused && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 40,
            left: 0,
            right: 0,
            top: 58,
            background: dark ? "#252535" : "#fff",
            border: "1px solid " + borderC,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.16)",
            maxHeight: 190,
            overflowY: "auto",
          }}
        >
          {suggestions.map(function (x) {
            return (
              <button
                key={x}
                onMouseDown={function (e) {
                  e.preventDefault();
                  onChange(x);
                  setSuggestions([]);
                  setFocused(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: "9px 11px",
                  fontSize: 12,
                  color: textC,
                  cursor: "pointer",
                }}
              >
                {x}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProfileLocalPromptField({
  label,
  value,
  onChange,
  placeholder,
  options,
  subC,
  dark,
  borderC,
  textC,
  sinp,
}) {
  var [open, setOpen] = useState(false);
  var [query, setQuery] = useState("");
  var list = useMemo(
    function () {
      var q = String(query || "")
        .trim()
        .toLowerCase();
      var base = (options || []).slice();
      if (q)
        base = base.filter(function (x) {
          return String(x).toLowerCase().indexOf(q) >= 0;
        });
      return base.slice(0, 260);
    },
    [query, options]
  );
  function choose(x) {
    onChange(x);
    setQuery("");
    setOpen(false);
  }
  return (
    <div>
      <label
        style={{ fontSize: 11, color: subC, display: "block", marginBottom: 3 }}
      >
        {label}
      </label>
      <button
        type="button"
        onClick={function () {
          setOpen(true);
          setQuery("");
        }}
        style={{
          ...sinp,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          textAlign: "left",
          cursor: "pointer",
          background: dark ? "#2a2a3e" : "#fff",
        }}
      >
        <span
          style={{
            color: value ? textC : subC,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value
            ? localizeProfileCountryName(value, readFainanceStoredLang())
            : placeholder}
        </span>
        <span style={{ fontSize: 14, color: subC, flexShrink: 0 }}>⌄</span>
      </button>
      <div style={{ fontSize: 10, color: subC, marginTop: 4 }}>
        {PL("Tocca il campo e digita le prime lettere.")}
      </div>
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.48)",
            zIndex: 800,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding:
              "max(17vh, calc(env(safe-area-inset-top, 0px) + 92px)) 16px calc(env(safe-area-inset-bottom, 0px) + 24px)",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
          onClick={function (e) {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            style={{
              background: dark ? "#1e1e30" : "#fff",
              borderRadius: 18,
              width: "100%",
              maxWidth: 460,
              maxHeight: "80vh",
              overflow: "hidden",
              boxShadow: "0 12px 44px rgba(0,0,0,.28)",
              border: "1px solid " + borderC,
            }}
          >
            <div
              style={{
                padding: "16px 16px 12px",
                borderBottom: "1px solid " + borderC,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{ flex: 1, fontSize: 15, fontWeight: 800, color: textC }}
              >
                {label}
              </div>
<PopupCloseButton onClick={function () { setOpen(false); }} dark={dark} label={label} />
            </div>
            <div style={{ padding: 14, borderBottom: "1px solid " + borderC }}>
              <input
                autoFocus
                value={query}
                onChange={function (e) {
                  setQuery(e.target.value);
                }}
                placeholder={placeholder}
                style={{
                  ...sinp,
                  width: "100%",
                  fontSize: 15,
                  padding: "11px 12px",
                }}
              />
              <div style={{ fontSize: 11, color: subC, marginTop: 6 }}>
                {PL(
                  "Lista completa delle nazioni. Puoi cercare digitando le prime lettere."
                )}
              </div>
            </div>
            <div
              style={{
                maxHeight: "52vh",
                overflowY: "auto",
                padding: "6px 8px 10px",
              }}
            >
              {list.length > 0 ? (
                list.map(function (x) {
                  return (
                    <button
                      key={x}
                      type="button"
                      onClick={function () {
                        choose(x);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background:
                          value === x
                            ? dark
                              ? "#343050"
                              : "#EEEDFE"
                            : "transparent",
                        border: "none",
                        borderRadius: 10,
                        padding: "11px 12px",
                        fontSize: 14,
                        color: value === x ? "#7F77DD" : textC,
                        cursor: "pointer",
                        fontWeight: value === x ? 700 : 500,
                      }}
                    >
                      {x}
                    </button>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: 18,
                    textAlign: "center",
                    fontSize: 13,
                    color: subC,
                  }}
                >
                  {PL("Nessun risultato")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfileCard({
  currentUser,
  onLogout,
  dark,
  textC,
  subC,
  borderC,
  cardBg,
  btnRadius,
  dateFmt,
  setToast,
  fbDb: fbDbProp,
  onProfileUpdate,
  onRequestAccountDeletion,
  onCancelAccountDeletion,
  lang,
  confirmButtonColor,
  secondaryButtonColor,
  showSecurityActions = true,
  showLogout = true,
}) {
  var [edit, setEdit] = useState(false);
  var [saveBusy, setSaveBusy] = useState(false);
  var [deleteOpen, setDeleteOpen] = useState(false);
  var [deleteConfirm, setDeleteConfirm] = useState("");
  var [deleteLoading, setDeleteLoading] = useState(false);
  var [deleteError, setDeleteError] = useState("");
  var [deletePassword, setDeletePassword] = useState("");
  var [emailOpen, setEmailOpen] = useState(false);
  var [newEmail, setNewEmail] = useState(String(currentUser.email || ""));
  var [emailLoading, setEmailLoading] = useState(false);
  var [emailError, setEmailError] = useState("");
  var [emailOk, setEmailOk] = useState(false);
  var initialNameParts = splitDisplayName(currentUser.name || "");
  var [pFirstName, setPFirstName] = useState(
    currentUser.firstName || initialNameParts.firstName || ""
  );
  var [pLastName, setPLastName] = useState(
    currentUser.lastName || initialNameParts.lastName || ""
  );
  var [pUsername, setPUsername] = useState(
    currentUser.username ||
      defaultUsernameFromName(
        currentUser.firstName || initialNameParts.firstName || "",
        currentUser.lastName || initialNameParts.lastName || "",
        currentUser.name ||
          String(currentUser.email || "").split("@")[0] ||
          "utente"
      )
  );
  var [pNewsletter, setPNewsletter] = useState(!!currentUser.newsletterConsent);
  var [pProfilePhoto, setPProfilePhoto] = useState(
    currentUser.profilePhotoDataUrl || ""
  );
  var [photoBusy, setPhotoBusy] = useState(false);
  var [photoEditorFile, setPhotoEditorFile] = useState<any>(null);
  var [photoEditorCrop, setPhotoEditorCrop] = useState<any>(null);
  var [pPhone, setPPhone] = useState(currentUser.phone || "");
  var [pPhonePrefix, setPPhonePrefix] = useState(
    currentUser.phonePrefix || "+39"
  );
  var [pBirth, setPBirth] = useState(currentUser.birthDate || "");
  var [pGender, setPGender] = useState(currentUser.gender || "");
  var [pNationality, setPNationality] = useState(
    localizeProfileCountryName(
      currentUser.nationality || "",
      String(lang || readFainanceStoredLang() || "it").split("-")[0]
    )
  );
  var [pCountry, setPCountry] = useState(
    localizeProfileCountryName(
      currentUser.country || "",
      String(lang || readFainanceStoredLang() || "it").split("-")[0]
    )
  );
  var [pProvince, setPProvince] = useState(currentUser.province || "");
  var [pCity, setPCity] = useState(currentUser.city || "");
  var [pAddress, setPAddress] = useState(currentUser.address || "");
  var [pJobType, setPJobType] = useState(currentUser.jobType || "");
  var [pAppUseReason, setPAppUseReason] = useState(
    currentUser.appUseReason || ""
  );
  var PHONE_PREFIXES = [
    { code: "+39", country: "Italia" },
    { code: "+34", country: "España" },
    { code: "+33", country: "France" },
    { code: "+49", country: "Deutschland" },
    { code: "+44", country: "United Kingdom" },
    { code: "+1", country: "United States / Canada" },
    { code: "+351", country: "Portugal" },
    { code: "+48", country: "Polska" },
    { code: "+31", country: "Nederland" },
    { code: "+40", country: "România" },
    { code: "+30", country: "Ελλάδα" },
  ];
  var JOB_TYPES = [
    "Dipendente",
    "Manager",
    "Consulente",
    "Libero professionista",
    "Imprenditore",
    "Commerciante",
    "Artigiano",
    "Insegnante / Formazione",
    "Sanità",
    "Tecnologia / IT",
    "Finanza / Amministrazione",
    "Marketing / Comunicazione",
    "Vendite",
    "Studente",
    "Pensionato",
    "Non occupato",
    "Altro",
  ];
  var APP_USE_REASONS = [
    "Controllare le spese quotidiane",
    "Risparmiare di più ogni mese",
    "Gestire budget e limiti",
    "Monitorare entrate e uscite",
    "Gestire patrimonio e conti",
    "Preparare obiettivi personali",
    "Controllare spese condivise",
    "Capire dove finiscono i soldi",
    "Ricevere consigli dall’AI",
    "Tenere tutto in un’unica app",
    "Altro",
  ];
  var countryNames = getProfileCountryNames(profileLang());
  var [saved, setSaved] = useState({
    name: currentUser.name || "",
    firstName: currentUser.firstName || initialNameParts.firstName || "",
    lastName: currentUser.lastName || initialNameParts.lastName || "",
    username: currentUser.username || "",
    usernameLower: currentUser.usernameLower || "",
    newsletterConsent: !!currentUser.newsletterConsent,
    profilePhotoDataUrl: currentUser.profilePhotoDataUrl || "",
    phone: currentUser.phone || "",
    phonePrefix: currentUser.phonePrefix || "+39",
    birthDate: currentUser.birthDate || "",
    gender: currentUser.gender || "",
    nationality: currentUser.nationality || "",
    country: currentUser.country || "",
    province: currentUser.province || "",
    city: currentUser.city || "",
    address: currentUser.address || "",
    jobType: currentUser.jobType || "",
    appUseReason: currentUser.appUseReason || "",
  });
  useEffect(
    function () {
      var parts = splitDisplayName(currentUser.name || "");
      var next = {
        name: currentUser.name || "",
        firstName: currentUser.firstName || parts.firstName || "",
        lastName: currentUser.lastName || parts.lastName || "",
        username: currentUser.username || "",
        usernameLower: currentUser.usernameLower || "",
        newsletterConsent: !!currentUser.newsletterConsent,
        profilePhotoDataUrl: currentUser.profilePhotoDataUrl || "",
        phone: currentUser.phone || "",
        phonePrefix: currentUser.phonePrefix || "+39",
        birthDate: currentUser.birthDate || "",
        gender: currentUser.gender || "",
        nationality: currentUser.nationality || "",
        country: currentUser.country || "",
        province: currentUser.province || "",
        city: currentUser.city || "",
        address: currentUser.address || "",
        jobType: currentUser.jobType || "",
        appUseReason: currentUser.appUseReason || "",
      };
      setSaved(next);
      setPFirstName(next.firstName);
      setPLastName(next.lastName);
      setPUsername(
        next.username ||
          defaultUsernameFromName(
            next.firstName,
            next.lastName,
            next.name ||
              String(currentUser.email || "").split("@")[0] ||
              "utente"
          )
      );
      setPNewsletter(!!next.newsletterConsent);
      setPProfilePhoto(next.profilePhotoDataUrl);
      setPPhone(next.phone);
      setPPhonePrefix(next.phonePrefix);
      setPBirth(next.birthDate);
      setPGender(next.gender);
      setPNationality(
        localizeProfileCountryName(next.nationality, profileLang())
      );
      setPCountry(localizeProfileCountryName(next.country, profileLang()));
      setPProvince(next.province);
      setPCity(next.city);
      setPAddress(next.address);
      setPJobType(next.jobType);
      setPAppUseReason(next.appUseReason);
    },
    [
      currentUser && currentUser.id,
      currentUser && currentUser.phone,
      currentUser && currentUser.phonePrefix,
      currentUser && currentUser.name,
      currentUser && currentUser.firstName,
      currentUser && currentUser.lastName,
      currentUser && currentUser.username,
      currentUser && currentUser.usernameLower,
      currentUser && currentUser.newsletterConsent,
      currentUser && currentUser.profilePhotoDataUrl,
      currentUser && currentUser.birthDate,
      currentUser && currentUser.gender,
      currentUser && currentUser.nationality,
      currentUser && currentUser.country,
      currentUser && currentUser.province,
      currentUser && currentUser.city,
      currentUser && currentUser.address,
      currentUser && currentUser.jobType,
      currentUser && currentUser.appUseReason,
      lang,
    ]
  );
  useEffect(
    function () {
      var cancelled = false;
      var accountUid = String(
        (currentUser &&
          ((currentUser as any).id || (currentUser as any).uid)) ||
          ""
      );
      if (!accountUid) return;
      if (String(currentUser.username || saved.username || "").trim()) return;
      var first = String(
        currentUser.firstName || pFirstName || initialNameParts.firstName || ""
      ).trim();
      var last = String(
        currentUser.lastName || pLastName || initialNameParts.lastName || ""
      ).trim();
      var fallback = String(
        currentUser.name ||
          [first, last].filter(Boolean).join(" ") ||
          String(currentUser.email || "").split("@")[0] ||
          accountUid ||
          "utente"
      );
      var previewUsername = defaultUsernameFromName(first, last, fallback);
      if (previewUsername && !String(pUsername || "").trim())
        setPUsername(previewUsername);
      (async function () {
        try {
          var generated = await ensureDefaultUsernameForExistingUser(
            accountUid,
            first,
            last,
            fallback,
            String(currentUser.email || "")
          );
          if (cancelled) return;
          if (generated && generated.username) {
            setPUsername(generated.username);
            setSaved(function (prev) {
              return Object.assign({}, prev, {
                username: generated.username,
                usernameLower:
                  generated.usernameLower ||
                  usernameLookupKey(generated.username),
              });
            });
            if (onProfileUpdate)
              onProfileUpdate({
                username: generated.username,
                usernameLower:
                  generated.usernameLower ||
                  usernameLookupKey(generated.username),
              });
          }
        } catch (usernameAutoErr: any) {
          if (!cancelled)
            console.warn(
              "Automatic username generation failed",
              (usernameAutoErr && usernameAutoErr.message) || usernameAutoErr
            );
        }
      })();
      return function () {
        cancelled = true;
      };
    },
    [
      currentUser && (currentUser as any).id,
      currentUser && (currentUser as any).uid,
      currentUser && currentUser.username,
      currentUser && currentUser.name,
      currentUser && currentUser.firstName,
      currentUser && currentUser.lastName,
      currentUser && currentUser.email,
      saved.username,
      pFirstName,
      pLastName,
    ]
  );
  var primaryC = confirmButtonColor || "#378ADD";
  var secondaryC = secondaryButtonColor || "#5FAFE5";
  var sinp = {
    width: "100%",
    height: 44,
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid " + (dark ? "#4A4A64" : "#D7E2F3"),
    padding: "0 11px",
    fontSize: 13,
    background: dark ? "#242437" : "#FFFFFF",
    color: textC,
    boxSizing: "border-box",
    outline: "none",
    boxShadow: dark ? "none" : "0 3px 12px rgba(31,64,120,.06)",
    lineHeight: "20px",
  };
  function profileLang() {
    return String(lang || readFainanceStoredLang() || "it").split("-")[0];
  }
  function PL(s) {
    return translateFainanceText(s, profileLang());
  }
  function usernameErrorText(code) {
    if (code === "USERNAME_REQUIRED") return PL("Inserisci uno username.");
    if (code === "USERNAME_TOO_SHORT")
      return PL("Lo username deve avere almeno 3 caratteri.");
    if (code === "USERNAME_TOO_LONG")
      return PL("Lo username può avere massimo 24 caratteri.");
    if (code === "USERNAME_INVALID_CHARACTERS")
      return PL(
        "Lo username può contenere solo lettere, numeri, punto, trattino o underscore."
      );
    if (code === "USERNAME_INVALID")
      return PL("Lo username deve contenere almeno una lettera o un numero.");
    if (code === "USERNAME_TAKEN")
      return PL("Questo username è già utilizzato.");
    return PL("Username non valido.");
  }
  function authActionSettings() {
    var origin = "https://fainanceapp.it";
    try {
      if (
        typeof window !== "undefined" &&
        window.location &&
        window.location.origin
      )
        origin = window.location.origin;
    } catch (e) {}
    return { url: origin, handleCodeInApp: false };
  }
  async function handleProfilePhoto(file: any) {
    if (!file) return false;
    setPhotoBusy(true);
    try {
      var dataUrl = await resizeProfilePhoto(file, 256, 0.76);
      setPProfilePhoto(dataUrl);
      if (setToast)
        setToast({
          text: PL("Foto profilo ottimizzata"),
          type: "success",
          icon: "✅",
        });
      return true;
    } catch (err: any) {
      var code = String((err && err.message) || "");
      var msg =
        code === "PROFILE_PHOTO_HEIC_UNSUPPORTED"
          ? PL(
              "Formato HEIC/HEIF non supportato in questo browser. Usa JPG, PNG o WebP."
            )
          : code === "PROFILE_PHOTO_TOO_LARGE"
          ? PL("La foto è troppo grande. Dimensione massima: 15 MB.")
          : PL("Impossibile elaborare la foto profilo");
      console.warn("Profile photo processing failed", code || err);
      if (setToast)
        setToast({ text: msg, type: "error", icon: "⚠️", color: "#E24B4A" });
      return false;
    } finally {
      setPhotoBusy(false);
    }
  }
  async function applyEditedProfilePhoto() {
    if (!photoEditorCrop || photoBusy) return;
    var ok = await handleProfilePhoto(photoEditorCrop);
    if (ok) {
      setPhotoEditorFile(null);
      setPhotoEditorCrop(null);
    }
  }
  async function save() {
    var cleanPhone = String(pPhone || "").replace(/[^0-9]/g, "");
    var cleanUsername = normalizeUsername(pUsername);
    var firstName = String(pFirstName || "").trim();
    var lastName = String(pLastName || "").trim();
    if (!firstName) {
      if (setToast)
        setToast({
          text: PL("Inserisci il tuo nome."),
          type: "warning",
          color: "#EF9F27",
          icon: "⚠️",
        });
      return;
    }
    if (!lastName) {
      if (setToast)
        setToast({
          text: PL("Inserisci il tuo cognome."),
          type: "warning",
          color: "#EF9F27",
          icon: "⚠️",
        });
      return;
    }
    if (pPhone && cleanPhone.length < 6) {
      if (setToast)
        setToast({
          text: PL("Numero di telefono non valido"),
          type: "warning",
          color: "#EF9F27",
          icon: "⚠️",
        });
      return;
    }
    var usernameError = cleanUsername
      ? validateUsername(cleanUsername)
      : "USERNAME_REQUIRED";
    if (usernameError) {
      if (setToast)
        setToast({
          text: usernameErrorText(usernameError),
          type: "warning",
          color: "#EF9F27",
          icon: "⚠️",
        });
      return;
    }
    var nowIso = new Date().toISOString();
    var fullName = [firstName, lastName].join(" ");
    var newsletterChanged = !!pNewsletter !== !!saved.newsletterConsent;
    var upd: any = {
      name: fullName,
      firstName: firstName,
      lastName: lastName,
      username: cleanUsername,
      usernameLower: usernameLookupKey(cleanUsername),
      newsletterConsent: !!pNewsletter,
      profilePhotoDataUrl: pProfilePhoto || "",
      phone: cleanPhone,
      phonePrefix: pPhonePrefix,
      birthDate: pBirth,
      gender: pGender,
      nationality: pNationality.trim(),
      country: pCountry.trim(),
      province: pProvince.trim(),
      city: pCity.trim(),
      address: pAddress.trim(),
      jobType: pJobType,
      appUseReason: pAppUseReason,
      updatedAt: nowIso,
    };
    if (newsletterChanged) {
      upd.newsletterConsentAt = pNewsletter ? nowIso : "";
      upd.newsletterConsentVersion = "2026-08-27-v1";
      upd.newsletterUpdatedAt = nowIso;
    }
    setSaveBusy(true);
    try {
      if (currentUser.id) {
        await mergeUserProfile(currentUser.id, upd);
        await saveUsernameForUser(
          currentUser.id,
          cleanUsername,
          currentUser.username || saved.username || "",
          String(currentUser.email || "")
        );
        if (fbDbProp) {
          var em = String(currentUser.email || "")
            .trim()
            .toLowerCase();
          if (em)
            await setDoc(
              doc(fbDbProp, "userLookup", "email:" + em.replace(/\//g, "_")),
              {
                uid: currentUser.id,
                email: em,
                phone: cleanPhone,
                name: fullName || currentUser.name || "Utente",
                username: cleanUsername,
                active: true,
                updatedAt: nowIso,
              },
              { merge: true }
            ).catch(function () {});
          if (cleanPhone)
            await setDoc(
              doc(fbDbProp, "userLookup", "phone:" + cleanPhone),
              {
                uid: currentUser.id,
                email: em,
                phone: cleanPhone,
                name: fullName || currentUser.name || "Utente",
                username: cleanUsername,
                active: true,
                updatedAt: nowIso,
              },
              { merge: true }
            ).catch(function () {});
        }
      }
      setSaved(upd);
      if (onProfileUpdate) onProfileUpdate(upd);
      setEdit(false);
      if (setToast)
        setToast({
          text: PL("Profilo aggiornato"),
          type: "success",
          icon: "✅",
        });
    } catch (err: any) {
      var code = err && err.message ? String(err.message) : "";
      if (code.indexOf("USERNAME_") === 0) {
        if (setToast)
          setToast({
            text: usernameErrorText(code),
            type: "error",
            icon: "⚠️",
            color: "#E24B4A",
          });
      } else if (setToast)
        setToast({
          text: PL("Errore salvataggio profilo"),
          type: "error",
          icon: "⚠️",
          color: "#E24B4A",
        });
    } finally {
      setSaveBusy(false);
    }
  }
  async function saveEmailChange() {
    setEmailError("");
    setEmailOk(false);
    var cleanEmail = String(newEmail || "")
      .trim()
      .toLowerCase();
    if (!cleanEmail || cleanEmail.indexOf("@") < 0) {
      setEmailError(PL("Inserisci una nuova email valida."));
      return;
    }
    if (cleanEmail === String(currentUser.email || "").toLowerCase()) {
      setEmailError(PL("La nuova email è uguale a quella attuale."));
      return;
    }
    setEmailLoading(true);
    try {
      var user = fbAuth.currentUser;
      if (!user)
        throw new Error(PL("Utente non trovato. Esci e rientra, poi riprova."));
      const mod = await import("firebase/auth");
      try {
        fbAuth.languageCode = profileLang();
      } catch (e) {}
      if (mod.verifyBeforeUpdateEmail) {
        await mod.verifyBeforeUpdateEmail(
          user,
          cleanEmail,
          authActionSettings()
        );
        setEmailOk(true);
        setEmailOpen(false);
        if (setToast) setToast("Email di verifica inviata");
      } else {
        await mod.updateEmail(user, cleanEmail);
        if (currentUser.id && fbDbProp) {
          await setDoc(
            doc(fbDbProp, "users", currentUser.id),
            { email: cleanEmail, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        }
        if (onProfileUpdate) onProfileUpdate({ email: cleanEmail });
        setEmailOk(true);
        setEmailOpen(false);
        if (setToast) setToast("Email aggiornata");
      }
    } catch (err: any) {
      var code = err && err.code ? err.code : "";
      if (code === "auth/requires-recent-login")
        setEmailError(
          PL("Per sicurezza, esci e rientra prima di cambiare email.")
        );
      else if (code === "auth/email-already-in-use")
        setEmailError(PL("Questa email è già usata da un altro account."));
      else if (code === "auth/invalid-email")
        setEmailError(PL("Email non valida."));
      else if (code === "auth/operation-not-allowed")
        setEmailError(
          PL(
            "Firebase richiede la verifica della nuova email. Controlla che nel progetto Firebase sia attivo il provider Email/Password e riprova."
          )
        );
      else
        setEmailError(
          PL("Errore cambio email: ") +
            ((err && err.message) || PL("operazione non riuscita"))
        );
    } finally {
      setEmailLoading(false);
    }
  }
  function requestDeleteAccount() {
    if (!onRequestAccountDeletion || deleteConfirm !== "ELIMINA") return;
    setDeleteLoading(true);
    setDeleteError("");
    Promise.resolve(onRequestAccountDeletion(deletePassword))
      .catch(function (err) {
        var msg =
          err && err.message
            ? err.message
            : "Errore durante l’eliminazione account.";
        setDeleteError(msg);
        if (setToast) setToast("Errore eliminazione account");
      })
      .finally(function () {
        setDeleteLoading(false);
      });
  }
  var d = saved;
  return (
    <div
      style={{
        background: dark
          ? "linear-gradient(160deg,rgba(28,28,47,.98),rgba(38,38,61,.94))"
          : "linear-gradient(160deg,rgba(255,255,255,.99),rgba(239,246,255,.98) 66%,rgba(255,248,224,.97))",
        borderRadius: 20,
        border: "1.5px solid " + (dark ? "#4B4B69" : secondaryC + "66"),
        padding: 16,
        boxShadow: dark ? "0 12px 28px rgba(0,0,0,.22)" : "0 12px 30px rgba(52,86,145,.13)",
      }}
    >
      {!edit ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  minWidth: 46,
                  borderRadius: 15,
                  background:
                    "linear-gradient(135deg," +
                    primaryC +
                    "," +
                    secondaryC +
                    ")",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 19,
                  fontWeight: 900,
                  overflow: "hidden",
                }}
              >
                {d.profilePhotoDataUrl ? (
                  <img
                    src={d.profilePhotoDataUrl}
                    alt={PL("Foto profilo")}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  (
                    (d.firstName ||
                      splitDisplayName(d.name || "").firstName ||
                      "U")[0] || "U"
                  ).toUpperCase()
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: textC }}>
                  {PL("👤 Profilo")}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: subC,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentUser.email || ""}
                </div>
              </div>
            </div>
            <button
              onClick={function () {
                setEdit(true);
                setEmailOk(false);
              }}
              style={{
                background:
                  "linear-gradient(135deg," + primaryC + "," + secondaryC + ")",
                color: "#fff",
                border: "none",
                borderRadius: btnRadius,
                padding: "9px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {PL("Modifica")}
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
              gap: 6,
            }}
          >
            {[
              [
                "👤",
                d.firstName || splitDisplayName(d.name || "").firstName || "—",
                PL("Nome"),
              ],
              [
                "👤",
                d.lastName || splitDisplayName(d.name || "").lastName || "—",
                PL("Cognome"),
              ],
              ["🪪", d.username ? "@" + d.username : "—", PL("Username")],
              ["📧", currentUser.email || "—", PL("Email")],
              [
                "📬",
                d.newsletterConsent ? PL("Attiva") : PL("Disattiva"),
                PL("Newsletter"),
              ],
              [
                "📞",
                d.phone ? (d.phonePrefix || "+39") + " " + d.phone : "—",
                PL("Telefono"),
              ],
              [
                "🌍",
                localizeProfileCountryName(d.nationality, profileLang()) || "—",
                PL("Nazionalità"),
              ],
              [
                "🎂",
                d.birthDate ? fmtDate(d.birthDate, dateFmt) : "—",
                PL("Nascita"),
              ],
              [
                "🏙",
                [
                  localizeProfileCountryName(d.country, profileLang()),
                  d.province,
                  d.city,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—",
                PL("Località"),
              ],
              ["📍", d.address || "—", PL("Indirizzo")],
              ["💼", d.jobType ? PL(d.jobType) : "—", PL("Lavoro")],
              [
                "🎯",
                d.appUseReason ? PL(d.appUseReason) : "—",
                PL("Uso principale"),
              ],
              [
                "⚧",
                d.gender === "M"
                  ? PL("Maschile")
                  : d.gender === "F"
                  ? PL("Femminile")
                  : d.gender === "X"
                  ? PL("Non spec.")
                  : "—",
                PL("Sesso"),
              ],
            ].map(function (r) {
              return (
                <div
                  key={r[2]}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 0",
                    borderBottom: "1px solid " + borderC,
                  }}
                >
                  <div style={{ width: 24, textAlign: "center", fontSize: 15 }}>
                    {r[0]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                        color: subC,
                      }}
                    >
                      {r[2]}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: textC,
                        wordBreak: "break-word",
                      }}
                    >
                      {r[1]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {showSecurityActions && (
            <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button
              onClick={function () {
                setEmailOpen(!emailOpen);
                setEmailError("");
                setNewEmail(String(currentUser.email || ""));
              }}
              style={{
                background: dark ? "#252535" : "#f5f8ff",
                color: textC,
                border: "1px solid " + borderC,
                borderRadius: btnRadius,
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {PL("Cambia email")}
            </button>
            <ChangePwdSection
              dark={dark}
              textC={textC}
              subC={subC}
              borderC={borderC}
              btnRadius={btnRadius}
              setToast={setToast}
              confirmButtonColor={primaryC}
              secondaryButtonColor={secondaryC}
              inActionGrid
            />
          </div>
          {emailOpen && (
            <div
              style={{
                marginTop: 12,
                background: dark ? "#202235" : "#f8fbff",
                border: "1px solid " + borderC,
                borderRadius: 14,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: textC }}>
                {PL("Aggiorna email di accesso")}
              </div>
              <input
                type="email"
                value={newEmail}
                onChange={function (e) {
                  setNewEmail(e.target.value);
                }}
                placeholder="nome@email.com"
                style={sinp}
              />
              <div style={{ fontSize: 11, color: subC, lineHeight: 1.35 }}>
                {PL(
                  "La nuova email diventerà l’indirizzo usato per accedere all’app."
                )}
              </div>
              {emailError && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#E24B4A",
                    background: dark ? "#3a1d1d" : "#fff0f0",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  {emailError}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={saveEmailChange}
                  disabled={emailLoading}
                  style={{
                    flex: 1,
                    background:
                      "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                    color: "#fff",
                    border: "none",
                    borderRadius: btnRadius,
                    padding: "10px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: emailLoading ? "not-allowed" : "pointer",
                    opacity: emailLoading ? 0.65 : 1,
                  }}
                >
                  {emailLoading ? PL("Aggiornamento...") : PL("Aggiorna email")}
                </button>
                <button
                  onClick={function () {
                    setEmailOpen(false);
                    setEmailError("");
                  }}
                  disabled={emailLoading}
                  style={{
                    background: dark ? "#333" : "#f0f0f0",
                    color: dark ? "#eee" : "#555",
                    border: "none",
                    borderRadius: btnRadius,
                    padding: "10px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {PL("Annulla")}
                </button>
              </div>
            </div>
          )}
          {emailOk && (
            <div style={{ fontSize: 12, color: "#1D9E75", marginTop: 8 }}>
              {PL(
                "Email di verifica inviata. Apri il link ricevuto sulla nuova email per completare il cambio."
              )}
            </div>
          )}
          <AccountSecurityCenter
            currentUser={currentUser}
            dark={dark}
            textC={textC}
            subC={subC}
            borderC={borderC}
            cardBg={cardBg}
            btnRadius={btnRadius}
            translate={PL}
            setToast={setToast}
            onRequestAccountDeletion={onRequestAccountDeletion}
            onCancelAccountDeletion={onCancelAccountDeletion}
            onLogout={onLogout}
            showDevices={false}
            showDeletion={true}
          />
            </>
          )}

        </>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: dark
              ? "linear-gradient(160deg,rgba(28,28,47,.96),rgba(38,38,61,.92))"
              : "linear-gradient(160deg,rgba(255,255,255,.98),rgba(239,246,255,.98) 66%,rgba(255,248,224,.96))",
            border: "1.5px solid " + (dark ? "#4B4B69" : secondaryC + "66"),
            borderRadius: 20,
            padding: 16,
            boxShadow: dark
              ? "0 12px 28px rgba(0,0,0,.22)"
              : "0 12px 30px rgba(52,86,145,.13)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "4px 2px 8px",
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background:
                  "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 22,
                fontWeight: 900,
                boxShadow: "0 7px 18px rgba(83,74,183,.25)",
                overflow: "hidden",
              }}
            >
              {pProfilePhoto ? (
                <img
                  src={pProfilePhoto}
                  alt={PL("Foto profilo")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : pFirstName ? (
                pFirstName[0].toUpperCase()
              ) : (
                "U"
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: textC }}>
                {PL("👤 Profilo")}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: subC,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentUser.email || ""}
              </div>
              <label
                style={{
                  display: "inline-flex",
                  marginTop: 7,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: dark ? "#303047" : "#fff",
                  border: "1px solid " + borderC,
                  borderRadius: 10,
                  padding: "7px 10px",
                  fontSize: 11,
                  fontWeight: 800,
                  color: textC,
                  cursor: photoBusy ? "wait" : "pointer",
                }}
              >
                {photoBusy ? PL("Ottimizzazione...") : PL("Carica foto")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.jfif,.heic,.heif"
                  disabled={photoBusy}
                  onChange={function (e) {
                    var f = e.currentTarget.files && e.currentTarget.files[0];
                    if (f) {
                      setPhotoEditorCrop(null);
                      setPhotoEditorFile(f);
                    }
                    e.currentTarget.value = "";
                  }}
                  style={{ display: "none" }}
                />
              </label>
              <div style={{ fontSize: 9, color: subC, marginTop: 4 }}>
                {PL(
                  "La foto viene ridimensionata automaticamente per occupare meno spazio."
                )}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 10,
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <label
                style={{
                  fontSize: 11,
                  color: subC,
                  display: "block",
                  marginBottom: 3,
                }}
              >
                {PL("Nome")} *
              </label>
              <input
                value={pFirstName}
                onChange={function (e) {
                  setPFirstName(e.target.value);
                }}
                style={{ ...sinp, minWidth: 0 }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label
                style={{
                  fontSize: 11,
                  color: subC,
                  display: "block",
                  marginBottom: 3,
                }}
              >
                {PL("Cognome")} *
              </label>
              <input
                value={pLastName}
                onChange={function (e) {
                  setPLastName(e.target.value);
                }}
                style={{ ...sinp, minWidth: 0 }}
              />
            </div>
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                color: subC,
                display: "block",
                marginBottom: 3,
              }}
            >
              {PL("Username")} *
            </label>
            <input
              value={pUsername}
              onChange={function (e) {
                setPUsername(e.target.value);
              }}
              style={sinp}
              placeholder="mario.rossi"
            />
            <div style={{ fontSize: 10, color: subC, marginTop: 3 }}>
              {PL(
                "3–24 caratteri: lettere, numeri, punto, trattino o underscore."
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              background: dark ? "rgba(95,175,229,.12)" : "#f8fbff",
              border: "1px solid " + (dark ? "#42546d" : "#dce9fb"),
              borderRadius: 14,
              padding: "12px 14px",
            }}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={pNewsletter}
              onClick={function () {
                setPNewsletter(function (v) {
                  return !v;
                });
              }}
              style={{
                width: 26,
                height: 26,
                minWidth: 26,
                borderRadius: 8,
                border:
                  "2px solid " +
                  (pNewsletter ? primaryC : dark ? "#8693A8" : "#8A98AB"),
                background: pNewsletter ? primaryC : dark ? "#232338" : "#fff",
                color: "#fff",
                fontSize: 18,
                fontWeight: 950,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                boxShadow: pNewsletter
                  ? "0 4px 10px " + primaryC + "35"
                  : "none",
              }}
            >
              {pNewsletter ? "✓" : ""}
            </button>
            <span
              onClick={function () {
                setPNewsletter(function (v) {
                  return !v;
                });
              }}
              style={{
                fontSize: 12,
                color: textC,
                lineHeight: 1.45,
                cursor: "pointer",
                paddingTop: 2,
                display: "inline-flex",
                flexDirection: "column",
              }}
            >
              <span>
                {PL(
                  "Desidero ricevere solo comunicazioni davvero importanti su fAInance."
                )}
              </span>
              <span>{PL("Non sarà spam e non ti disturberà.")}</span>
            </span>
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                color: subC,
                display: "block",
                marginBottom: 3,
              }}
            >
              {PL("Telefono")}
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "130px 1fr",
                gap: 8,
              }}
            >
              <input
                list="phone-prefixes"
                value={pPhonePrefix}
                onChange={function (e) {
                  setPPhonePrefix(e.target.value);
                }}
                style={sinp}
                placeholder="+39"
              />
              <input
                type="tel"
                value={pPhone}
                onChange={function (e) {
                  setPPhone(e.target.value.replace(/[^0-9 ]/g, ""));
                }}
                style={sinp}
                placeholder="333 1234567"
              />
            </div>
            <datalist id="phone-prefixes">
              {PHONE_PREFIXES.map(function (p) {
                return (
                  <option key={p.code} value={p.code}>
                    {p.country}
                  </option>
                );
              })}
            </datalist>
            <div style={{ fontSize: 10, color: subC, marginTop: 3 }}>
              {PL(
                "Cerca il prefisso nazionale e inserisci solo numeri nel telefono."
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))",
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
              <label
                style={{
                  fontSize: 11,
                  color: subC,
                  display: "block",
                  marginBottom: 3,
                }}
              >
                {PL("Data nascita")}
              </label>
              <input
                type="date"
                value={pBirth}
                onChange={function (e) {
                  setPBirth(e.target.value);
                }}
                style={{
                  ...sinp,
                  width: "100%",
                  height: 44,
                  minHeight: 44,
                  maxWidth: "100%",
                  minWidth: 0,
                  display: "block",
                  boxSizing: "border-box",
                  padding: "0 11px",
                  WebkitAppearance: "none",
                  appearance: "none",
                }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label
                style={{
                  fontSize: 11,
                  color: subC,
                  display: "block",
                  marginBottom: 3,
                }}
              >
                {PL("Sesso")}
              </label>
              <select
                value={pGender}
                onChange={function (e) {
                  setPGender(e.target.value);
                }}
                style={{ ...sinp, minWidth: 0, boxSizing: "border-box" }}
              >
                <option value="">—</option>
                <option value="M">{PL("Maschile")}</option>
                <option value="F">{PL("Femminile")}</option>
                <option value="X">{PL("Non spec.")}</option>
              </select>
            </div>
          </div>
          <ProfileLocalPromptField
            label={PL("Nazionalità")}
            value={pNationality}
            onChange={setPNationality}
            placeholder={PL("Cerca nazionalità")}
            options={countryNames}
            subC={subC}
            dark={dark}
            borderC={borderC}
            textC={textC}
            sinp={sinp}
          />
          <ProfileLocalPromptField
            label={PL("Nazione di residenza")}
            value={pCountry}
            onChange={setPCountry}
            placeholder={PL("Cerca nazione di residenza")}
            options={countryNames}
            subC={subC}
            dark={dark}
            borderC={borderC}
            textC={textC}
            sinp={sinp}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))",
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <label
                style={{
                  fontSize: 11,
                  color: subC,
                  display: "block",
                  marginBottom: 3,
                }}
              >
                {PL("Provincia / Regione")}
              </label>
              <input
                value={pProvince}
                onChange={function (e) {
                  setPProvince(e.target.value);
                }}
                style={{ ...sinp, minWidth: 0, boxSizing: "border-box" }}
                placeholder={PL("Provincia o regione")}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label
                style={{
                  fontSize: 11,
                  color: subC,
                  display: "block",
                  marginBottom: 3,
                }}
              >
                {PL("Città")}
              </label>
              <input
                value={pCity}
                onChange={function (e) {
                  setPCity(e.target.value);
                }}
                style={{ ...sinp, minWidth: 0, boxSizing: "border-box" }}
                placeholder={PL("Città")}
              />
            </div>
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                color: subC,
                display: "block",
                marginBottom: 3,
              }}
            >
              {PL("Indirizzo")}
            </label>
            <input
              value={pAddress}
              onChange={function (e) {
                setPAddress(e.target.value);
              }}
              style={sinp}
              placeholder={PL("Indirizzo")}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                color: subC,
                display: "block",
                marginBottom: 3,
              }}
            >
              {PL("Lavoro")}
            </label>
            <select
              value={pJobType}
              onChange={function (e) {
                setPJobType(e.target.value);
              }}
              style={sinp}
            >
              <option value="">—</option>
              {JOB_TYPES.map(function (j) {
                return (
                  <option key={j} value={j}>
                    {PL(j)}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                color: subC,
                display: "block",
                marginBottom: 3,
              }}
            >
              {PL("Per cosa vuoi usare principalmente fAInance?")}
            </label>
            <select
              value={pAppUseReason}
              onChange={function (e) {
                setPAppUseReason(e.target.value);
              }}
              style={sinp}
            >
              <option value="">—</option>
              {APP_USE_REASONS.map(function (r) {
                return (
                  <option key={r} value={r}>
                    {PL(r)}
                  </option>
                );
              })}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={save}
              disabled={
                saveBusy ||
                !String(pFirstName || "").trim() ||
                !String(pLastName || "").trim() ||
                !String(pUsername || "").trim()
              }
              style={{
                flex: 1,
                background: primaryC,
                color: "#fff",
                border: "none",
                borderRadius: btnRadius,
                padding: "11px",
                fontSize: 14,
                fontWeight: 800,
                cursor:
                  saveBusy ||
                  !String(pFirstName || "").trim() ||
                  !String(pLastName || "").trim() ||
                  !String(pUsername || "").trim()
                    ? "not-allowed"
                    : "pointer",
                boxShadow: "0 6px 16px " + primaryC + "35",
                opacity:
                  saveBusy ||
                  !String(pFirstName || "").trim() ||
                  !String(pLastName || "").trim() ||
                  !String(pUsername || "").trim()
                    ? 0.45
                    : 1,
              }}
            >
              {saveBusy ? PL("Salvataggio...") : "💾 " + PL("Salva")}
            </button>
            <button
              onClick={function () {
                setEdit(false);
              }}
              disabled={saveBusy}
              style={{
                padding: "10px 14px",
                background: dark ? "#333" : "#f0f0f0",
                color: dark ? "#eee" : "#555",
                border: "none",
                borderRadius: btnRadius,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {PL("Annulla")}
            </button>
          </div>
          <FainancePickerModal
            open={!!photoEditorFile}
            title={PL("Modifica foto profilo")}
            onClose={function () {
              if (!photoBusy) {
                setPhotoEditorFile(null);
                setPhotoEditorCrop(null);
              }
            }}
          >
            {photoEditorFile && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <ProfilePhotoEditor
                  file={photoEditorFile}
                  hint={PL(
                    "Trascina la foto per centrarla e usa lo zoom per scegliere l'inquadratura."
                  )}
                  zoomLabel={PL("Zoom")}
                  resetLabel={PL("Ripristina")}
                  dark={dark}
                  textColor={textC}
                  borderColor={borderC}
                  primaryColor={primaryC}
                  onCropChange={setPhotoEditorCrop}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.2fr",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={function () {
                      setPhotoEditorFile(null);
                      setPhotoEditorCrop(null);
                    }}
                    style={{
                      height: 44,
                      border: "1px solid " + borderC,
                      borderRadius: 10,
                      background: dark ? "#2A2A3E" : "#fff",
                      color: textC,
                      fontWeight: 800,
                      cursor: photoBusy ? "not-allowed" : "pointer",
                    }}
                  >
                    {PL("Annulla")}
                  </button>
                  <button
                    type="button"
                    disabled={!photoEditorCrop || photoBusy}
                    onClick={applyEditedProfilePhoto}
                    style={{
                      height: 44,
                      border: "none",
                      borderRadius: 10,
                      background: primaryC,
                      color: "#fff",
                      fontWeight: 900,
                      cursor:
                        !photoEditorCrop || photoBusy
                          ? "not-allowed"
                          : "pointer",
                      opacity: !photoEditorCrop || photoBusy ? 0.5 : 1,
                    }}
                  >
                    {photoBusy ? PL("Ottimizzazione...") : PL("Usa foto")}
                  </button>
                </div>
              </div>
            )}
          </FainancePickerModal>
        </div>
      )}
    </div>
  );
}
