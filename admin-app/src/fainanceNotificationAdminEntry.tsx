import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { getApp } from "firebase/app";
import { getAuth, getIdTokenResult, onAuthStateChanged, type User } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import "./firebase";

const TEST_PROJECT_ID = "fainance-test-20260823195207";
const FUNCTIONS_REGION = "europe-west1";
const ADMIN_ROLES = new Set(["admin", "superadmin"]);
const LANGUAGES = [
  { code: "it", label: "Italiano" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "pl", label: "Polski" },
  { code: "nl", label: "Nederlands" },
  { code: "ro", label: "Română" },
  { code: "el", label: "Ελληνικά" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];
type TranslationValue = { title: string; message: string };
type TranslationMap = Record<LanguageCode, TranslationValue>;

function emptyTranslations(): TranslationMap {
  return LANGUAGES.reduce((out, item) => {
    out[item.code] = { title: "", message: "" };
    return out;
  }, {} as TranslationMap);
}

function App() {
  const firebaseApp = getApp();
  const projectId = String(firebaseApp.options.projectId || "");
  const projectOk = projectId === TEST_PROJECT_ID;
  const auth = getAuth(firebaseApp);
  const functions = getFunctions(firebaseApp, FUNCTIONS_REGION);

  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [role, setRole] = useState("");
  const [roleReady, setRoleReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>("it");
  const [translations, setTranslations] = useState<TranslationMap>(() => emptyTranslations());
  const [severity, setSeverity] = useState("info");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setRole("");
      setRoleReady(false);
      if (!nextUser) {
        setRoleReady(true);
        setOpen(false);
        return;
      }
      try {
        const token = await getIdTokenResult(nextUser, true);
        setRole(String(token.claims.fainanceAdminRole || "").toLowerCase());
      } catch (_error) {
        setRole("");
      } finally {
        setRoleReady(true);
      }
    });
  }, [auth]);

  const authorized = !!user && ADMIN_ROLES.has(role);
  const completeLanguages = useMemo(
    () =>
      LANGUAGES.filter((item) => {
        const value = translations[item.code];
        return !!value.title.trim() && !!value.message.trim();
      }).map((item) => item.code),
    [translations],
  );

  function updateField(field: keyof TranslationValue, value: string) {
    setTranslations((current) => ({
      ...current,
      [activeLanguage]: { ...current[activeLanguage], [field]: value },
    }));
  }

  async function sendCampaign() {
    if (!projectOk) {
      setStatus(`Invio bloccato: Admin collegato a ${projectId || "progetto sconosciuto"}, non a fAInance Test.`);
      return;
    }
    if (!authorized) {
      setStatus("Invio bloccato: è richiesto un account Admin o Superadmin.");
      return;
    }
    const english = translations.en;
    if (!english.title.trim() || !english.message.trim()) {
      setActiveLanguage("en");
      setStatus("Compila almeno titolo e messaggio in inglese: è il fallback obbligatorio.");
      return;
    }

    setSending(true);
    setStatus("");
    try {
      const cleaned: Record<string, TranslationValue> = {};
      LANGUAGES.forEach((item) => {
        const value = translations[item.code];
        const title = value.title.trim();
        const message = value.message.trim();
        if (title && message) cleaned[item.code] = { title, message };
      });
      const queueCampaign = httpsCallable(functions, "fainanceQueueAdminNotificationCampaign");
      await queueCampaign({
        severity,
        audience: { type: "all" },
        translations: cleaned,
      });
      setTranslations(emptyTranslations());
      setActiveLanguage("it");
      setSeverity("info");
      setStatus("Notifica accodata correttamente per tutti gli utenti.");
    } catch (error: any) {
      const detail = String(error?.message || error?.code || error || "");
      setStatus("Invio della notifica non riuscito." + (detail ? " " + detail : ""));
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;

  const blocked = !projectOk || (roleReady && !authorized);
  const current = translations[activeLanguage];
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    borderRadius: 12,
    border: "1px solid #DCE2EA",
    background: "#FFFFFF",
    color: "#172033",
    padding: "11px 12px",
    fontSize: 13,
    outline: "none",
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Apri centro notifiche Admin"
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          zIndex: 9000,
          border: "1px solid " + (blocked ? "#FCA5A5" : "#C7D2FE"),
          borderRadius: 15,
          background: blocked ? "#FFF0F0" : "#FFFFFF",
          color: blocked ? "#B42318" : "#25304A",
          boxShadow: "0 12px 34px rgba(15,23,42,.18)",
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 900,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span aria-hidden="true">📣</span>
        Notifiche
        <span style={{ fontSize: 9, fontWeight: 950, padding: "3px 6px", borderRadius: 999, background: blocked ? "#FEE2E2" : "#EEF2FF", color: blocked ? "#B42318" : "#4F46E5" }}>
          TEST
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Centro notifiche Admin"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 12000,
            background: "rgba(15,23,42,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            boxSizing: "border-box",
          }}
        >
          <section style={{ width: "min(880px,100%)", maxHeight: "min(820px,calc(100dvh - 36px))", overflowY: "auto", background: "#F6F8FC", borderRadius: 24, border: "1px solid #DCE2EA", boxShadow: "0 28px 90px rgba(15,23,42,.28)", padding: 18, boxSizing: "border-box" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 15, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23 }}>📣</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 950, color: "#172033" }}>Centro notifiche</div>
                <div style={{ marginTop: 4, color: "#667085", fontSize: 12, lineHeight: 1.45 }}>Invia comunicazioni centralizzate agli utenti direttamente dallo spazio fAInance Admin.</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <span style={{ padding: "4px 8px", borderRadius: 999, background: projectOk ? "#ECFDF3" : "#FFF0F0", color: projectOk ? "#067647" : "#B42318", fontSize: 10, fontWeight: 900 }}>Firebase: {projectOk ? "TEST" : projectId || "SCONOSCIUTO"}</span>
                  <span style={{ padding: "4px 8px", borderRadius: 999, background: authorized ? "#EEF2FF" : "#FFF0F0", color: authorized ? "#4F46E5" : "#B42318", fontSize: 10, fontWeight: 900 }}>Ruolo: {roleReady ? role || "nessuno" : "verifica…"}</span>
                  <span style={{ padding: "4px 8px", borderRadius: 999, background: "#F2F4F7", color: "#475467", fontSize: 10, fontWeight: 850 }}>Destinatari: tutti gli utenti</span>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Chiudi" style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid #FCA5A5", background: "#FEE2E2", color: "#E24B4A", cursor: "pointer", fontSize: 23, lineHeight: 1, fontWeight: 950 }}>×</button>
            </div>

            {blocked && (
              <div style={{ borderRadius: 14, background: "#FFF0F0", border: "1px solid #FCA5A5", color: "#B42318", padding: "12px 14px", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
                {!projectOk
                  ? `Invio bloccato: questa console è collegata a ${projectId || "un progetto Firebase sconosciuto"}. La funzione può operare solo su ${TEST_PROJECT_ID}.`
                  : "Invio bloccato: accedi con un account Admin o Superadmin."}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #DCE2EA", borderRadius: 18, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#172033", marginBottom: 10 }}>Lingua della notifica</div>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 5 }}>
                  {LANGUAGES.map((item) => {
                    const active = item.code === activeLanguage;
                    const complete = completeLanguages.includes(item.code);
                    return (
                      <button key={item.code} type="button" onClick={() => setActiveLanguage(item.code)} style={{ flexShrink: 0, borderRadius: 10, border: "1px solid " + (active ? "#6366F1" : "#DCE2EA"), background: active ? "#EEF2FF" : "#FFFFFF", color: active ? "#4F46E5" : "#344054", padding: "7px 9px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>
                        {item.code.toUpperCase()} {complete ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
                <div style={{ color: "#667085", fontSize: 11, margin: "8px 0 10px" }}>
                  {LANGUAGES.find((item) => item.code === activeLanguage)?.label}
                  {activeLanguage === "en" ? " · fallback obbligatorio" : ""}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input value={current.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Titolo della notifica" maxLength={120} style={inputStyle} />
                  <textarea value={current.message} onChange={(event) => updateField("message", event.target.value)} placeholder="Messaggio della notifica" maxLength={1000} rows={7} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
                </div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #DCE2EA", borderRadius: 18, padding: 16 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ fontSize: 12, fontWeight: 900, color: "#172033" }}>Priorità</label>
                  <select value={severity} onChange={(event) => setSeverity(event.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 170 }}>
                    <option value="info">Informativa</option>
                    <option value="success">Positiva</option>
                    <option value="warning">Importante</option>
                    <option value="critical">Critica</option>
                  </select>
                  <div style={{ flex: 1 }} />
                  <button type="button" onClick={sendCampaign} disabled={sending || blocked || !roleReady} style={{ border: 0, borderRadius: 12, background: "#4F46E5", color: "#FFFFFF", padding: "11px 17px", fontSize: 12, fontWeight: 950, cursor: sending || blocked || !roleReady ? "default" : "pointer", opacity: sending || blocked || !roleReady ? 0.5 : 1 }}>
                    {sending ? "Invio in corso…" : "Invia notifica"}
                  </button>
                </div>
                <div style={{ marginTop: 10, color: "#667085", fontSize: 11, lineHeight: 1.45 }}>
                  Le traduzioni compilate vengono usate per la lingua impostata da ciascun utente. Se manca una lingua, viene usato il testo inglese.
                </div>
                {status && <div style={{ marginTop: 12, borderRadius: 12, background: status.toLowerCase().includes("non riuscito") || status.toLowerCase().includes("bloccato") ? "#FFF0F0" : "#ECFDF3", border: "1px solid " + (status.toLowerCase().includes("non riuscito") || status.toLowerCase().includes("bloccato") ? "#FCA5A5" : "#ABEFC6"), color: status.toLowerCase().includes("non riuscito") || status.toLowerCase().includes("bloccato") ? "#B42318" : "#067647", padding: "10px 12px", fontSize: 11, lineHeight: 1.45 }}>{status}</div>}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

const rootElement = document.getElementById("fainance-notification-admin-v19-root");
if (rootElement) createRoot(rootElement).render(<App />);
