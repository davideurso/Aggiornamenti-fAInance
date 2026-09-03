import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useApp } from "../core";
import { fbDb } from "../firebase/client";
import {
  listRecentAdminUserMetadata,
  mergePublicAppConfig,
  readPublicAppConfig,
  type AdminUserMetadata,
  type PublicAppConfig,
} from "./adminRepository";
import { getAdminRuntimeDiagnostic } from "./diagnostics";
import { writeAdminAudit } from "./auditService";
import { AdminNotificationPanel } from "./AdminNotificationPanel";
import type { AdminSession } from "./session";

type AdminTab = "dashboard" | "users" | "notifications" | "config" | "diagnostics" | "audit";

type AuditRow = {
  id: string;
  actorUid?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  createdAt?: unknown;
  metadata?: Record<string, unknown>;
};

function safeDate(value: unknown): string {
  if (!value) return "—";
  try {
    if (typeof (value as any)?.toDate === "function") return (value as any).toDate().toLocaleString();
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
  } catch {
    return String(value);
  }
}

function lastSeenMs(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countBy(items: AdminUserMetadata[], key: keyof AdminUserMetadata): Array<[string, number]> {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const value = String(item[key] || "—").trim() || "—";
    map.set(value, (map.get(value) || 0) + 1);
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

export function AdminCenterPanel({ session }: { session: AdminSession | null }) {
  const ctx: any = useApp();
  const L = (text: string) => (ctx.translateUiRuntimeText ? ctx.translateUiRuntimeText(text) : text);
  const dark = !!ctx.dark;
  const cardBg = ctx.cardBg || (dark ? "#1f1f2e" : "#fff");
  const textC = ctx.textC || (dark ? "#f5f5f5" : "#232323");
  const subC = ctx.subC || (dark ? "#a9a9b5" : "#777");
  const borderC = ctx.borderC || (dark ? "#3a3a49" : "#e6e6ec");
  const primary = ctx.confirmButtonColor || "#378ADD";
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [users, setUsers] = useState<AdminUserMetadata[]>([]);
  const [config, setConfig] = useState<PublicAppConfig>({});
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [configStatus, setConfigStatus] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const isAdmin = !!session?.isAdmin;
  const canWrite = session?.role === "admin" || session?.role === "superadmin";
  const diagnostic = useMemo(() => getAdminRuntimeDiagnostic(session), [session]);

  async function loadAdminData() {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const [userRows, publicConfig, auditSnapshot] = await Promise.all([
        listRecentAdminUserMetadata(500),
        readPublicAppConfig(),
        getDocs(query(collection(fbDb, "adminAudit"), orderBy("createdAt", "desc"), limit(100))).catch(() => null),
      ]);
      setUsers(userRows);
      setConfig(publicConfig || {});
      setAudit(
        auditSnapshot
          ? auditSnapshot.docs.map((row) => ({ id: row.id, ...(row.data() as any) } as AuditRow))
          : [],
      );
    } catch (loadError: any) {
      setError(String(loadError?.message || loadError || L("Impossibile caricare i dati Admin.")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminData();
  }, [isAdmin, session?.uid]);

  const plans = useMemo(() => countBy(users, "plan"), [users]);
  const platforms = useMemo(() => countBy(users, "platform"), [users]);
  const languages = useMemo(() => countBy(users, "language"), [users]);
  const versions = useMemo(() => countBy(users, "appVersion"), [users]);
  const active7 = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return users.filter((row) => lastSeenMs(row.lastSeenAt) >= threshold).length;
  }, [users]);
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((row) => {
      if (planFilter !== "all" && String(row.plan || "—") !== planFilter) return false;
      if (platformFilter !== "all" && String(row.platform || "—") !== platformFilter) return false;
      if (!q) return true;
      return [row.email, row.username, row.displayName, row.uid, row.country, row.language]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(q));
    });
  }, [users, search, planFilter, platformFilter]);

  const panelStyle: any = {
    background: cardBg,
    border: "1px solid " + borderC,
    borderRadius: 18,
    padding: 16,
  };
  const inputStyle: any = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 11,
    border: "1px solid " + borderC,
    background: dark ? "#29293a" : "#fff",
    color: textC,
    padding: "10px 11px",
    fontSize: 12,
    outline: "none",
  };

  if (!isAdmin) {
    return (
      <div style={panelStyle}>
        <div style={{ fontSize: 15, fontWeight: 900, color: textC }}>{L("Accesso Admin non disponibile")}</div>
        <div style={{ marginTop: 6, color: subC, fontSize: 12, lineHeight: 1.45 }}>
          {L("Questa sezione è visibile solo agli account con un ruolo amministrativo.")}
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: AdminTab; icon: string; label: string }> = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "users", icon: "👥", label: "Utenti" },
    { id: "notifications", icon: "📣", label: "Notifiche" },
    { id: "config", icon: "⚙️", label: "Configurazione" },
    { id: "diagnostics", icon: "🩺", label: "Diagnostica" },
    { id: "audit", icon: "🧾", label: "Audit" },
  ];

  async function saveConfig() {
    if (!canWrite || !session?.uid) return;
    setConfigSaving(true);
    setConfigStatus("");
    try {
      const patch: PublicAppConfig = {
        minimumVersion: String(config.minimumVersion || "").trim(),
        recommendedVersion: String(config.recommendedVersion || "").trim(),
        maintenanceMode: !!config.maintenanceMode,
        announcementsEnabled: !!config.announcementsEnabled,
        updatedAt: new Date().toISOString(),
        updatedBy: session.uid,
      };
      await mergePublicAppConfig(patch);
      await writeAdminAudit({
        actorUid: session.uid,
        action: "config.update",
        targetType: "systemConfig/public",
        metadata: patch,
      }).catch(() => undefined);
      setConfig((current) => ({ ...current, ...patch }));
      setConfigStatus(L("Configurazione salvata."));
      void loadAdminData();
    } catch (saveError: any) {
      setConfigStatus(L("Salvataggio configurazione non riuscito.") + " " + String(saveError?.message || ""));
    } finally {
      setConfigSaving(false);
    }
  }

  function Distribution({ title, rows }: { title: string; rows: Array<[string, number]> }) {
    const max = Math.max(1, ...rows.map((row) => row[1]));
    return (
      <div style={panelStyle}>
        <div style={{ color: textC, fontWeight: 900, fontSize: 13, marginBottom: 10 }}>{L(title)}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.slice(0, 8).map(([label, value]) => (
            <div key={label}>
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", color: textC, fontSize: 11, marginBottom: 4 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                <strong>{value}</strong>
              </div>
              <div style={{ height: 6, borderRadius: 99, overflow: "hidden", background: dark ? "#343447" : "#EEF2F7" }}>
                <div style={{ height: "100%", width: Math.max(4, (value / max) * 100) + "%", borderRadius: 99, background: primary }} />
              </div>
            </div>
          ))}
          {rows.length === 0 && <div style={{ color: subC, fontSize: 11 }}>{L("Nessun dato disponibile")}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...panelStyle, background: dark ? "linear-gradient(145deg,#222235,#2b2944)" : "linear-gradient(145deg,#ffffff,#f3f0ff)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: primary + "18", fontSize: 21 }}>🛡️</div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 16, fontWeight: 950, color: textC }}>{L("Centro Admin")}</div>
            <div style={{ fontSize: 11, color: subC, marginTop: 3 }}>
              {L("Dashboard, utenti, notifiche, configurazione, diagnostica e audit nello stesso spazio dell'app.")}
            </div>
          </div>
          <span style={{ borderRadius: 999, padding: "5px 9px", background: primary + "18", color: primary, fontSize: 10, fontWeight: 900 }}>
            {String(session.role || "").toUpperCase()}
          </span>
          <button type="button" onClick={() => void loadAdminData()} style={{ border: "1px solid " + borderC, background: dark ? "#29293a" : "#fff", color: textC, borderRadius: 10, padding: "7px 10px", fontSize: 11, fontWeight: 850, cursor: "pointer" }}>
            {L("Aggiorna")}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 3 }}>
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} style={{ flexShrink: 0, border: "1px solid " + (active ? primary : borderC), background: active ? primary + "18" : cardBg, color: active ? primary : textC, borderRadius: 11, padding: "8px 10px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>
              {item.icon} {L(item.label)}
            </button>
          );
        })}
      </div>

      {loading && <div style={{ ...panelStyle, color: subC, fontSize: 12 }}>{L("Caricamento dati Admin...")}</div>}
      {error && <div style={{ ...panelStyle, borderColor: "#E24B4A66", color: "#E24B4A", fontSize: 12 }}>{error}</div>}

      {!loading && tab === "dashboard" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
            {[
              ["Utenti indicizzati", users.length, "👥"],
              ["Attivi negli ultimi 7 giorni", active7, "🟢"],
              ["Piani rilevati", plans.length, "💎"],
              ["Versioni app rilevate", versions.length, "📱"],
            ].map(([label, value, icon]) => (
              <div key={String(label)} style={panelStyle}>
                <div style={{ color: subC, fontSize: 10, fontWeight: 800 }}>{icon} {L(String(label))}</div>
                <div style={{ color: textC, fontSize: 24, fontWeight: 950, marginTop: 5 }}>{String(value)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
            <Distribution title="Distribuzione piani" rows={plans} />
            <Distribution title="Piattaforme" rows={platforms} />
            <Distribution title="Lingue" rows={languages} />
            <Distribution title="Versioni app" rows={versions} />
          </div>
          <div style={panelStyle}>
            <div style={{ color: textC, fontWeight: 900, fontSize: 13, marginBottom: 10 }}>{L("Ultimi utenti attivi")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {users.slice(0, 8).map((row) => (
                <div key={row.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid " + borderC }}>
                  <span style={{ fontSize: 18 }}>👤</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: textC, fontSize: 11, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis" }}>{row.email || row.username || row.uid}</div>
                    <div style={{ color: subC, fontSize: 10, marginTop: 2 }}>{row.plan || "—"} · {row.platform || "—"} · {row.language || "—"}</div>
                  </div>
                  <div style={{ color: subC, fontSize: 9, textAlign: "right" }}>{safeDate(row.lastSeenAt)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && tab === "users" && (
        <div style={panelStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) repeat(2,minmax(110px,160px))", gap: 8, marginBottom: 12 }}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={L("Cerca utente")} style={inputStyle} />
            <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} style={inputStyle}>
              <option value="all">{L("Tutti i piani")}</option>
              {plans.map(([value]) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} style={inputStyle}>
              <option value="all">{L("Tutte le piattaforme")}</option>
              {platforms.map(([value]) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div style={{ color: subC, fontSize: 10, marginBottom: 8 }}>{filteredUsers.length} {L("utenti")}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680, fontSize: 10, color: textC }}>
              <thead><tr>{["Email / Username","Piano","Stato","Piattaforma","Versione","Lingua","Ultimo accesso"].map((label) => <th key={label} style={{ textAlign: "left", padding: "8px 7px", borderBottom: "1px solid " + borderC, color: subC }}>{L(label)}</th>)}</tr></thead>
              <tbody>
                {filteredUsers.map((row) => (
                  <tr key={row.uid}>
                    <td style={{ padding: "9px 7px", borderBottom: "1px solid " + borderC }}><strong>{row.email || row.username || "—"}</strong><div style={{ color: subC, fontSize: 9 }}>{row.uid}</div></td>
                    <td style={{ padding: "9px 7px", borderBottom: "1px solid " + borderC }}>{row.plan || "—"}</td>
                    <td style={{ padding: "9px 7px", borderBottom: "1px solid " + borderC }}>{row.accountStatus || "—"}</td>
                    <td style={{ padding: "9px 7px", borderBottom: "1px solid " + borderC }}>{row.platform || "—"}</td>
                    <td style={{ padding: "9px 7px", borderBottom: "1px solid " + borderC }}>{row.appVersion || "—"}</td>
                    <td style={{ padding: "9px 7px", borderBottom: "1px solid " + borderC }}>{row.language || "—"}</td>
                    <td style={{ padding: "9px 7px", borderBottom: "1px solid " + borderC }}>{safeDate(row.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === "notifications" && <AdminNotificationPanel session={session} />}

      {!loading && tab === "config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={panelStyle}>
            <div style={{ color: textC, fontSize: 14, fontWeight: 900, marginBottom: 12 }}>{L("Configurazione pubblica app")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
              <label style={{ color: subC, fontSize: 10 }}>{L("Versione minima")}<input value={String(config.minimumVersion || "")} onChange={(event) => setConfig((current) => ({ ...current, minimumVersion: event.target.value }))} style={{ ...inputStyle, marginTop: 5 }} disabled={!canWrite} /></label>
              <label style={{ color: subC, fontSize: 10 }}>{L("Versione consigliata")}<input value={String(config.recommendedVersion || "")} onChange={(event) => setConfig((current) => ({ ...current, recommendedVersion: event.target.value }))} style={{ ...inputStyle, marginTop: 5 }} disabled={!canWrite} /></label>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 9, color: textC, fontSize: 12 }}><input type="checkbox" checked={!!config.maintenanceMode} onChange={(event) => setConfig((current) => ({ ...current, maintenanceMode: event.target.checked }))} disabled={!canWrite} />{L("Modalità manutenzione")}</label>
              <label style={{ display: "flex", alignItems: "center", gap: 9, color: textC, fontSize: 12 }}><input type="checkbox" checked={!!config.announcementsEnabled} onChange={(event) => setConfig((current) => ({ ...current, announcementsEnabled: event.target.checked }))} disabled={!canWrite} />{L("Annunci abilitati")}</label>
            </div>
            {canWrite ? (
              <button type="button" onClick={saveConfig} disabled={configSaving} style={{ marginTop: 14, border: 0, borderRadius: 11, background: primary, color: "#fff", padding: "10px 13px", fontSize: 11, fontWeight: 900, cursor: configSaving ? "default" : "pointer", opacity: configSaving ? 0.6 : 1 }}>
                {configSaving ? L("Salvataggio...") : L("Salva configurazione")}
              </button>
            ) : <div style={{ color: subC, fontSize: 11, marginTop: 12 }}>{L("Il tuo ruolo consente solo la consultazione di questa configurazione.")}</div>}
            {configStatus && <div style={{ color: subC, fontSize: 11, marginTop: 10 }}>{configStatus}</div>}
          </div>
        </div>
      )}

      {!loading && tab === "diagnostics" && (
        <div style={panelStyle}>
          <div style={{ color: textC, fontSize: 14, fontWeight: 900, marginBottom: 12 }}>{L("Diagnostica ambiente")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 9 }}>
            {[
              ["Ruolo Admin", diagnostic.adminRole || "—"],
              ["Admin autenticato", diagnostic.adminAuthenticated ? L("Sì") : L("No")],
              ["Dati finanziari privati accessibili", diagnostic.privateFinanceDataAccessible ? L("Sì") : L("No")],
              ["Ambiente", JSON.stringify(diagnostic.environment)],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ border: "1px solid " + borderC, borderRadius: 12, padding: 11, background: dark ? "#29293a" : "#F8FAFC" }}>
                <div style={{ color: subC, fontSize: 9, fontWeight: 850 }}>{L(String(label))}</div>
                <div style={{ color: textC, fontSize: 11, fontWeight: 800, marginTop: 5, overflowWrap: "anywhere" }}>{String(value)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, borderRadius: 12, padding: 11, background: dark ? "#22352f" : "#ECFDF5", color: dark ? "#9DE7C7" : "#0F7A55", fontSize: 11, lineHeight: 1.45 }}>
            {L("L'accesso Admin non abilita la lettura dei dati finanziari privati degli utenti.")}
          </div>
        </div>
      )}

      {!loading && tab === "audit" && (
        <div style={panelStyle}>
          <div style={{ color: textC, fontSize: 14, fontWeight: 900, marginBottom: 10 }}>{L("Registro Audit")}</div>
          {audit.length === 0 ? <div style={{ color: subC, fontSize: 11 }}>{L("Nessun evento Audit disponibile")}</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {audit.map((row) => (
                <div key={row.id} style={{ border: "1px solid " + borderC, borderRadius: 12, padding: 10, background: dark ? "#29293a" : "#F8FAFC" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}><strong style={{ color: textC, fontSize: 11 }}>{row.action || "—"}</strong><span style={{ color: subC, fontSize: 9 }}>{safeDate(row.createdAt)}</span></div>
                  <div style={{ color: subC, fontSize: 9, marginTop: 4 }}>{row.targetType || "—"}{row.targetId ? " · " + row.targetId : ""} · {row.actorUid || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
