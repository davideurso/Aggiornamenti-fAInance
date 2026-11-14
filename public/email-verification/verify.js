const copy = {
  it: {
    pending: ["Conferma dell’indirizzo email", "Verifica in corso…"],
    success: ["Indirizzo email confermato", "Torna in fAInance Test per continuare."],
    returning: ["Torna in fAInance Test", "L’app controllerà automaticamente lo stato della verifica al rientro."],
    invalid: ["Link non più valido", "Se hai già confermato l’indirizzo, torna nell’app. Altrimenti richiedi una nuova email di verifica."],
    unavailable: ["Verifica temporaneamente non disponibile", "Controlla la connessione e riapri il link originale."],
    open: "Apri fAInance Test"
  },
  en: {
    pending: ["Email confirmation", "Verifying your email address…"],
    success: ["Email address confirmed", "Return to fAInance Test to continue."],
    returning: ["Return to fAInance Test", "The app will check your verification status when you return."],
    invalid: ["This link is no longer valid", "If you already confirmed your address, return to the app. Otherwise, request a new verification email."],
    unavailable: ["Verification is temporarily unavailable", "Check your connection and reopen the original link."],
    open: "Open fAInance Test"
  },
  es: {
    pending: ["Confirmación del correo", "Verificando tu dirección de correo…"],
    success: ["Correo electrónico confirmado", "Vuelve a fAInance Test para continuar."],
    returning: ["Vuelve a fAInance Test", "La aplicación comprobará el estado de la verificación cuando vuelvas."],
    invalid: ["El enlace ya no es válido", "Si ya confirmaste tu correo, vuelve a la aplicación. Si no, solicita un nuevo correo de verificación."],
    unavailable: ["La verificación no está disponible", "Comprueba tu conexión y vuelve a abrir el enlace original."],
    open: "Abrir fAInance Test"
  }
};

const params = new URLSearchParams(location.search);
const mode = params.get("mode");
const lang = params.get("lang")?.toLowerCase().split("-")[0];
const language = Object.hasOwn(copy, lang) ? lang : "it";
const messages = copy[language];
document.documentElement.lang = language;

function show(state) {
  const [title, message] = messages[state];
  document.getElementById("title").textContent = title;
  document.getElementById("message").textContent = message;
  const link = document.getElementById("app");
  link.textContent = messages.open;
  const android = /Android/i.test(navigator.userAgent);
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) link.href = "fainance-test://email-verification";
  link.hidden = !["success", "returning"].includes(state) || !(android || ios);
}

async function verify() {
  if (mode === "return") {
    show("returning");
    return;
  }
  if (mode && mode !== "verifyEmail") {
    location.replace("https://fainance-test-20260823195207.firebaseapp.com/__/auth/action" + location.search);
    return;
  }
  const code = params.get("oobCode");
  if (!code || mode !== "verifyEmail") {
    show("invalid");
    return;
  }
  history.replaceState(null, "", location.pathname);
  show("pending");
  try {
    const [{ initializeApp }, { initializeAuth, inMemoryPersistence, checkActionCode, applyActionCode }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js")
    ]);
    const app = initializeApp({ projectId: "fainance-test-20260823195207", apiKey: "AIzaSyDeOmt0seR1iyb48iy_jQyDDopNifCvo9A" });
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    const action = await checkActionCode(auth, code);
    if (action.operation !== "VERIFY_EMAIL") {
      show("invalid");
      return;
    }
    await applyActionCode(auth, code);
    show("success");
  } catch (error) {
    const invalid = ["auth/invalid-action-code", "auth/expired-action-code", "auth/user-disabled", "auth/user-not-found"];
    show(invalid.includes(error?.code) ? "invalid" : "unavailable");
  }
}

void verify();
