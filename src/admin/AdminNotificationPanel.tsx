import { useMemo, useState } from "react";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useApp } from "../core";
import type { AdminSession } from "./session";

const FUNCTIONS_REGION = "europe-west1";
const LANGUAGE_OPTIONS = [
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

type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["code"];
type TranslationValue = { title: string; message: string };
type TranslationMap = Record<LanguageCode, TranslationValue>;

function emptyTranslations(): TranslationMap {
  return LANGUAGE_OPTIONS.reduce((out, item) => {
    out[item.code] = { title: "", message: "" };
    return out;
  }, {} as TranslationMap);
}

export function AdminNotificationPanel({ session }: { session: AdminSession | null }) {
  const ctx: any = useApp();
  const L = (text: string) =>
    ctx.translateUiRuntimeText ? ctx.translateUiRuntimeText(text) : text;
  const dark = !!ctx.dark;
  const cardBg = ctx.cardBg || (dark ? "#1f1f2e" : "#fff");
  const textC = ctx.textC || (dark ? "#f5f5f5" : "#232323");
  const subC = ctx.subC || (dark ? "#a9a9b5" : "#777");
  const borderC = ctx.borderC || (dark ? "#3a3a49" : "#e6e6ec");
  const primary = ctx.confirmButtonColor || "#378ADD";

  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>("it");
  const [translations, setTranslations] = useState<TranslationMap>(() => emptyTranslations());
  const [severity, setSeverity] = useState("info");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  const completeLanguages = useMemo(
    () =>
      LANGUAGE_OPTIONS.filter((item) => {
        const row = translations[item.code];
        return !!String(row.title || "").trim() && !!String(row.message || "").trim();
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
    const english = translations.en;
    if (!String(english.title || "").trim() || !String(english.message || "").trim()) {
      setActiveLanguage("en");
      setStatus(L("Compila almeno titolo e messaggio in inglese."));
      return;
    }
    if (!session || !session.isAdmin || (session.role !== "admin" && session.role !== "superadmin")) {
      setStatus(L("Non hai i permessi per inviare notifiche."));
      return;
    }

    setSending(true);
    setStatus("");
    try {
      const cleaned: Record<string, TranslationValue> = {};
      LANGUAGE_OPTIONS.forEach((item) => {
        const row = translations[item.code];
        const title = String(row.title || "").trim();
        const message = String(row.message || "").trim();
        if (title && message) cleaned[item.code] = { title, message };
      });
      const callable = httpsCallable(
        getFunctions(getApp(), FUNCTIONS_REGION),
        "fainanceQueueAdminNotificationCampaign",
      );
      await callable({
        severity,
        audience: { type: "all" },
        translations: cleaned,
      });
      setTranslations(emptyTranslations());
      setActiveLanguage("it");
      setStatus(L("Notifica accodata per l'invio."));
    } catch (error: any) {
      const message = String(error && (error.message || error.code) ? error.message || error.code : error || "");
      setStatus(L("Invio della notifica non riuscito.") + (message ? " " + message : ""));
    } finally {
      setSending(false);
    }
  }

  const current = translations[activeLanguage];
  const inputStyle: any = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid " + borderC,
    background: dark ? "#29293a" : "#fff",
    color: textC,
    padding: "11px 12px",
    fontSize: 13,
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: cardBg, border: "1px solid " + borderC, borderRadius: 18, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: textC }}>{L("Invio centralizzato notifiche")}</div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: subC, marginTop: 5 }}>
          {L("La notifica viene inviata a tutti gli utenti nella lingua impostata nell'app. Per lingue non supportate o traduzioni mancanti viene usato l'inglese.")}
        </div>
      </div>

      <div style={{ background: cardBg, border: "1px solid " + borderC, borderRadius: 18, padding: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ color: textC, fontSize: 12, fontWeight: 850 }}>{L("Destinatari")}</span>
          <span style={{ borderRadius: 999, padding: "5px 9px", background: primary + "18", color: primary, fontSize: 11, fontWeight: 850 }}>
            {L("Tutti gli utenti")}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 12 }}>
          {LANGUAGE_OPTIONS.map((item) => {
            const active = activeLanguage === item.code;
            const complete = completeLanguages.includes(item.code);
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setActiveLanguage(item.code)}
                style={{
                  flexShrink: 0,
                  borderRadius: 10,
                  border: "1px solid " + (active ? primary : borderC),
                  background: active ? primary + "18" : dark ? "#29293a" : "#F8FAFC",
                  color: active ? primary : textC,
                  padding: "7px 9px",
                  fontSize: 11,
                  fontWeight: 850,
                  cursor: "pointer",
                }}
              >
                {item.code.toUpperCase()} {complete ? "✓" : ""}
              </button>
            );
          })}
        </div>

        <div style={{ color: subC, fontSize: 11, marginBottom: 10 }}>
          {LANGUAGE_OPTIONS.find((item) => item.code === activeLanguage)?.label}
          {activeLanguage === "en" ? " · " + L("Fallback obbligatorio") : ""}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={current.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder={L("Titolo della notifica")}
            maxLength={120}
            style={inputStyle}
          />
          <textarea
            value={current.message}
            onChange={(event) => updateField("message", event.target.value)}
            placeholder={L("Messaggio della notifica")}
            maxLength={1000}
            rows={5}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.45 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
          <label style={{ color: textC, fontSize: 12, fontWeight: 800 }}>{L("Priorità")}</label>
          <select value={severity} onChange={(event) => setSeverity(event.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 150 }}>
            <option value="info">{L("Informativa")}</option>
            <option value="success">{L("Positiva")}</option>
            <option value="warning">{L("Importante")}</option>
            <option value="critical">{L("Critica")}</option>
          </select>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={sendCampaign}
            disabled={sending}
            style={{
              border: 0,
              borderRadius: 12,
              background: primary,
              color: "#fff",
              padding: "10px 15px",
              fontSize: 12,
              fontWeight: 900,
              cursor: sending ? "default" : "pointer",
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? L("Invio in corso...") : L("Invia notifica")}
          </button>
        </div>

        {status && (
          <div style={{ marginTop: 12, borderRadius: 11, background: dark ? "#24213a" : "#F0EDFF", color: dark ? "#D9D5FF" : "#534AB7", padding: "9px 10px", fontSize: 11, lineHeight: 1.4 }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
