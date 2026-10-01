import { readableDarkText } from '../ui/textContrast';
import { useMemo, useState } from "react";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useApp } from "../core";
import type { AdminSession } from "./session";
import type { AdminUserMetadata } from "./adminRepository";

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
type AudienceMode = "all" | "users" | "android" | "ios";

function emptyTranslations(): TranslationMap {
  return LANGUAGE_OPTIONS.reduce((out, item) => {
    out[item.code] = { title: "", message: "" };
    return out;
  }, {} as TranslationMap);
}

export function AdminNotificationPanel({ session, users = [] }: { session: AdminSession | null; users?: AdminUserMetadata[] }) {
  const ctx: any = useApp();
  const L = (text: string) => (ctx.translateUiRuntimeText ? ctx.translateUiRuntimeText(text) : text);
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
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);

  const completeLanguages = useMemo(
    () => LANGUAGE_OPTIONS.filter((item) => {
      const row = translations[item.code];
      return !!String(row.title || "").trim() && !!String(row.message || "").trim();
    }).map((item) => item.code),
    [translations],
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const rows = q
      ? users.filter((row) => [row.email, row.username, row.displayName, row.uid]
          .map((value) => String(value || "").toLowerCase())
          .some((value) => value.includes(q)))
      : users;
    return rows.slice(0, 80);
  }, [users, userSearch]);

  function updateField(field: keyof TranslationValue, value: string) {
    setTranslations((current) => ({ ...current, [activeLanguage]: { ...current[activeLanguage], [field]: value } }));
  }

  function toggleUid(uid: string) {
    setSelectedUids((current) => current.includes(uid) ? current.filter((item) => item !== uid) : [...current, uid]);
  }

  function audiencePayload() {
    if (audienceMode === "users") return { type: "users", uids: selectedUids };
    if (audienceMode === "android") return { type: "platform", platform: "android" };
    if (audienceMode === "ios") return { type: "platform", platform: "ios" };
    return { type: "all" };
  }

  async function sendCampaign() {
    const english = translations.en;
    if (!String(english.title || "").trim() || !String(english.message || "").trim()) {
      setActiveLanguage("en");
      setStatus(L("Compila almeno titolo e messaggio in inglese."));
      return;
    }
    if (audienceMode === "users" && selectedUids.length === 0) {
      setStatus(L("Seleziona almeno un utente."));
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
      const callable = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), "fainanceQueueAdminNotificationCampaign");
      const response: any = await callable({ severity, audience: audiencePayload(), translations: cleaned });
      const data = response?.data || {};
      setTranslations(emptyTranslations());
      setActiveLanguage("it");
      const delivered = Number(data.successCount || 0);
      const failed = Number(data.failureCount || 0);
      const devices = Number(data.targetedDevices || 0);
      setStatus(`${L("Invio completato")}: ${delivered}/${devices}${failed ? ` · ${L("fallite")}: ${failed}` : ""}`);
    } catch (error: any) {
      const message = String(error && (error.message || error.code) ? error.message || error.code : error || "");
      setStatus(L("Invio della notifica non riuscito.") + (message ? " " + message : ""));
    } finally {
      setSending(false);
    }
  }

  const current = translations[activeLanguage];
  const inputStyle: any = { width: "100%", boxSizing: "border-box", borderRadius: 12, border: "1px solid " + borderC, background: dark ? "#29293a" : "#fff", color: textC, padding: "11px 12px", fontSize: 13, outline: "none" };
  const targetOptions: Array<{ id: AudienceMode; icon: string; label: string }> = [
    { id: "all", icon: "👥", label: L("Tutti gli utenti") },
    { id: "users", icon: "🎯", label: L("Utenti specifici") },
    { id: "android", icon: "🤖", label: "Android" },
    { id: "ios", icon: "", label: "iOS" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: cardBg, border: "1px solid " + borderC, borderRadius: 18, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: textC }}>{L("Invio centralizzato notifiche")}</div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: subC, marginTop: 5 }}>
          {L("Scegli i destinatari, prepara il testo nelle lingue desiderate e invia la notifica push. L'inglese viene usato come fallback.")}
        </div>
      </div>

      <div style={{ background: cardBg, border: "1px solid " + borderC, borderRadius: 18, padding: 16 }}>
        <div style={{ color: textC, fontSize: 12, fontWeight: 900, marginBottom: 9 }}>{L("Destinatari")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          {targetOptions.map((option) => {
            const active = audienceMode === option.id;
            return <button key={option.id} type="button" onClick={() => setAudienceMode(option.id)} style={{ border: "1px solid " + (active ? primary : borderC), borderRadius: 12, background: active ? primary + "18" : dark ? "#29293a" : "#F8FAFC", color: readableDarkText(active ? primary : textC, dark, active ? primary + "18" : dark ? "#29293a" : "#F8FAFC"), padding: "10px 11px", fontSize: 11, fontWeight: 900, textAlign: "left", cursor: "pointer" }}>{option.icon} {option.label}</button>;
          })}
        </div>

        {audienceMode === "users" && (
          <div style={{ marginTop: 12, borderTop: "1px solid " + borderC, paddingTop: 12 }}>
            <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder={L("Cerca per email, username o UID")} style={inputStyle} />
            <div style={{ color: subC, fontSize: 10, margin: "8px 0" }}>{L("Selezionati")}: <strong style={{ color: textC }}>{selectedUids.length}</strong></div>
            <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredUsers.map((row) => {
                const selected = selectedUids.includes(row.uid);
                const title = String(row.displayName || row.username || row.email || row.uid);
                const detail = [row.email, row.username ? "@" + row.username : "", row.platform].filter(Boolean).join(" · ");
                return <button key={row.uid} type="button" onClick={() => toggleUid(row.uid)} style={{ display: "flex", alignItems: "center", gap: 9, border: "1px solid " + (selected ? primary : borderC), borderRadius: 11, background: selected ? primary + "12" : dark ? "#29293a" : "#fff", color: textC, padding: "9px 10px", textAlign: "left", cursor: "pointer" }}><span style={{ width: 18, height: 18, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? primary : "transparent", border: "1px solid " + (selected ? primary : borderC), color: readableDarkText("#fff", dark, selected ? primary : "transparent"), fontSize: 11 }}>{selected ? "✓" : ""}</span><span style={{ minWidth: 0, flex: 1 }}><strong style={{ display: "block", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis" }}>{title}</strong><span style={{ display: "block", color: subC, fontSize: 9, overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</span></span></button>;
              })}
              {filteredUsers.length === 0 && <div style={{ color: subC, fontSize: 11 }}>{L("Nessun utente trovato")}</div>}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: cardBg, border: "1px solid " + borderC, borderRadius: 18, padding: 16 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 12 }}>
          {LANGUAGE_OPTIONS.map((item) => {
            const active = activeLanguage === item.code;
            const complete = completeLanguages.includes(item.code);
            return <button key={item.code} type="button" onClick={() => setActiveLanguage(item.code)} style={{ flexShrink: 0, borderRadius: 10, border: "1px solid " + (active ? primary : borderC), background: active ? primary + "18" : dark ? "#29293a" : "#F8FAFC", color: readableDarkText(active ? primary : textC, dark, active ? primary + "18" : dark ? "#29293a" : "#F8FAFC"), padding: "7px 9px", fontSize: 11, fontWeight: 850, cursor: "pointer" }}>{item.code.toUpperCase()} {complete ? "✓" : ""}</button>;
          })}
        </div>

        <div style={{ color: subC, fontSize: 11, marginBottom: 10 }}>{LANGUAGE_OPTIONS.find((item) => item.code === activeLanguage)?.label}{activeLanguage === "en" ? " · " + L("Fallback obbligatorio") : ""}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={current.title} onChange={(event) => updateField("title", event.target.value)} placeholder={L("Titolo della notifica")} maxLength={120} style={inputStyle} />
          <textarea value={current.message} onChange={(event) => updateField("message", event.target.value)} placeholder={L("Messaggio della notifica")} maxLength={1000} rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.45 }} />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
          <label style={{ color: textC, fontSize: 12, fontWeight: 800 }}>{L("Priorità")}</label>
          <select value={severity} onChange={(event) => setSeverity(event.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 150 }}>
            <option value="info">{L("Informativa")}</option><option value="success">{L("Positiva")}</option><option value="warning">{L("Importante")}</option><option value="critical">{L("Critica")}</option>
          </select>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={sendCampaign} disabled={sending} style={{ border: 0, borderRadius: 12, background: primary, color: readableDarkText("#fff", dark, primary), padding: "10px 15px", fontSize: 12, fontWeight: 900, cursor: sending ? "default" : "pointer", opacity: sending ? 0.6 : 1 }}>{sending ? L("Invio in corso...") : L("Invia notifica")}</button>
        </div>

        {status && <div style={{ marginTop: 12, borderRadius: 11, background: dark ? "#24213a" : "#F0EDFF", color: readableDarkText(dark ? "#D9D5FF" : "#534AB7", dark, dark ? "#24213a" : "#F0EDFF"), padding: "9px 10px", fontSize: 11, lineHeight: 1.4 }}>{status}</div>}
      </div>
    </div>
  );
}
