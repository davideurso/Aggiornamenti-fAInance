import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { adminAuth, adminEnvironment, adminFirebaseConfig } from "./firebase";
import { assignUsernameToUser, listRecentAudit, listRecentBackupMetadata, listRecentTechnicalLogs, listRecentUsers, publishImportantCommunication, readPublicConfig, savePublicConfig, validateAdminUsername } from "./adminApi";
import type { AdminAuditEntry, AdminRole, AdminSection, AdminSession, AdminUserMetadata, BackupMetadataEntry, PublicAppConfig, TechnicalLogEntry } from "./types";
import { hasCapability } from "./security";
import "./styles.css";

const roles: AdminRole[] = ["support", "analyst", "admin", "superadmin"];

async function sessionFromUser(user: User): Promise<AdminSession | null> {
  const token = await user.getIdTokenResult(true);
  const role = String((token.claims as Record<string, unknown>).fainanceAdminRole ?? "").toLowerCase() as AdminRole;
  if (!roles.includes(role)) return null;
  return { uid: user.uid, email: user.email || "", role };
}

function timestampToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const candidate = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
  if (typeof candidate.toDate === "function") return candidate.toDate();
  if (typeof candidate.seconds === "number") return new Date(candidate.seconds * 1000);
  if (typeof candidate._seconds === "number") return new Date(candidate._seconds * 1000);
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function dateText(value: unknown): string {
  const date = timestampToDate(value);
  return date ? date.toLocaleString("it-IT") : "—";
}

function normalized(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(adminAuth, email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Accesso non riuscito");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">fA</div>
        <h1>fAInance Admin</h1>
        <p>Accesso riservato agli amministratori autorizzati.</p>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary" disabled={busy}>{busy ? "Accesso..." : "Accedi"}</button>
        <small>Ambiente: {adminEnvironment} · Firebase: {adminFirebaseConfig.projectId}</small>
      </form>
    </main>
  );
}

function Overview({ users, config }: { users: AdminUserMetadata[]; config: PublicAppConfig }) {
  const premium = users.filter((u) => normalized(u.plan) === "premium").length;
  return <div className="grid-cards">
    <article className="metric"><span>Utenti indicizzati</span><strong>{users.length}</strong></article>
    <article className="metric"><span>Premium</span><strong>{premium}</strong></article>
    <article className="metric"><span>Versione minima</span><strong>{config.minimumVersion || "—"}</strong></article>
    <article className="metric"><span>Manutenzione</span><strong>{config.maintenanceMode ? "Attiva" : "No"}</strong></article>
  </div>;
}

function usernameErrorText(code: string): string {
  if (code === "USERNAME_TOO_SHORT") return "Lo username deve avere almeno 3 caratteri.";
  if (code === "USERNAME_TOO_LONG") return "Lo username può avere al massimo 24 caratteri.";
  if (code === "USERNAME_INVALID_CHARACTERS") return "Usa solo lettere, numeri, punto, trattino e underscore.";
  if (code === "USERNAME_INVALID") return "Lo username deve contenere almeno una lettera o un numero.";
  if (code === "USERNAME_TAKEN") return "Questo username è già utilizzato da un altro account.";
  return code;
}

function UserDetail({
  user,
  session,
  onClose,
  onUsernameSaved
}: {
  user: AdminUserMetadata;
  session: AdminSession;
  onClose: () => void;
  onUsernameSaved: (user: AdminUserMetadata) => void;
}) {
  const providers = [...new Set([...(user.providers || []), ...(user.authProviders || [])])].filter(Boolean);
  const canManageUsername = hasCapability(session, "users.manage_username");
  const [usernameDraft, setUsernameDraft] = useState(user.username || "");
  const [usernameStatus, setUsernameStatus] = useState("");
  const [usernameBusy, setUsernameBusy] = useState(false);

  useEffect(() => {
    setUsernameDraft(user.username || "");
    setUsernameStatus("");
  }, [user.uid, user.username]);

  async function saveUsername() {
    if (!canManageUsername) return;
    const validation = validateAdminUsername(usernameDraft);
    if (validation) {
      setUsernameStatus(usernameErrorText(validation));
      return;
    }

    setUsernameBusy(true);
    setUsernameStatus("Salvataggio…");
    try {
      const updated = await assignUsernameToUser(
        user,
        usernameDraft,
        session.uid,
        session.email
      );
      onUsernameSaved(updated);
      setUsernameStatus("Username aggiornato");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aggiornamento username non riuscito";
      setUsernameStatus(usernameErrorText(message));
    } finally {
      setUsernameBusy(false);
    }
  }

  return <aside className="user-detail">
    <div className="user-detail-head">
      <div>
        <span className="eyebrow">Dettaglio account</span>
        <h2>{user.displayName || user.email || "Utente"}</h2>
        <p>{user.email || "Email non disponibile"}</p>
      </div>
      <button className="icon-button" onClick={onClose} aria-label="Chiudi dettaglio">×</button>
    </div>

    <section className="username-admin-box">
      <div>
        <span className="eyebrow">Username</span>
        <p>Identificativo univoco case-insensitive. La capitalizzazione scelta viene conservata.</p>
      </div>
      <div className="username-admin-row">
        <input
          value={usernameDraft}
          onChange={(event) => setUsernameDraft(event.target.value)}
          placeholder="es. Davide.U"
          maxLength={24}
          disabled={!canManageUsername || usernameBusy}
        />
        <button
          className="primary"
          onClick={saveUsername}
          disabled={!canManageUsername || usernameBusy || usernameDraft.trim() === (user.username || "")}
        >
          {usernameBusy ? "Salvataggio…" : "Salva"}
        </button>
      </div>
      <small className={usernameStatus && !usernameStatus.includes("aggiornato") ? "username-status error" : "username-status"}>
        {canManageUsername ? (usernameStatus || "3–24 caratteri: lettere, numeri, punto, trattino o underscore.") : "Solo Superadmin può assegnare o modificare uno username."}
      </small>
    </section>

    <div className="detail-grid">
      <div><span>UID</span><strong className="mono">{user.uid}</strong></div>
      <div><span>Username</span><strong>{user.username || "Non ancora assegnato"}</strong></div>
      <div><span>Username normalizzato</span><strong>{user.usernameLower || "—"}</strong></div>
      <div><span>Piano</span><strong>{user.plan || "—"}</strong></div>
      <div><span>Stato</span><strong>{user.deletionStatus === "pending" ? "cancellazione programmata" : user.accountStatus || (user.disabled ? "disabled" : "active")}</strong></div>
      <div><span>Richiesta cancellazione</span><strong>{user.deletionStatus === "pending" ? dateText(user.deletionRequestedAt) : "—"}</strong></div>
      <div><span>Cancellazione prevista</span><strong>{user.deletionStatus === "pending" ? dateText(user.deletionScheduledAt) : "—"}</strong></div>
      <div><span>Email verificata</span><strong>{user.emailVerified ? "Sì" : "No"}</strong></div>
      <div><span>Paese</span><strong>{user.country || "—"}</strong></div>
      <div><span>Provider</span><strong>{providers.length ? providers.join(", ") : "—"}</strong></div>
      <div><span>Ultimo provider login</span><strong>{user.lastLoginProvider || "—"}</strong></div>
      <div><span>Creato</span><strong>{dateText(user.createdAt)}</strong></div>
      <div><span>Ultimo accesso</span><strong>{dateText(user.lastSeenAt)}</strong></div>
      <div><span>Profilo aggiornato</span><strong>{dateText(user.profileUpdatedAt)}</strong></div>
      <div><span>Residenza completata</span><strong>{user.residenceCompleted == null ? "—" : user.residenceCompleted ? "Sì" : "No"}</strong></div>
    </div>
    <p className="privacy-note">Questa vista contiene solo metadati amministrativi. Indirizzo, telefono, data di nascita e dati finanziari non vengono indicizzati.</p>
  </aside>;
}

function Users({
  users,
  loading,
  session,
  onUserUpdated
}: {
  users: AdminUserMetadata[];
  loading: boolean;
  session: AdminSession;
  onUserUpdated: (user: AdminUserMetadata) => void;
}) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [selected, setSelected] = useState<AdminUserMetadata | null>(null);

  const providerOptions = useMemo(() => {
    const values = new Set<string>();
    users.forEach((u) => [...(u.providers || []), ...(u.authProviders || [])].forEach((item) => item && values.add(item)));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filtered = useMemo(() => {
    const needle = normalized(search);
    return users.filter((u) => {
      if (needle) {
        const haystack = [u.displayName, u.email, u.username, u.uid, u.country].map(normalized).join(" ");
        if (!haystack.includes(needle)) return false;
      }
      if (plan !== "all" && normalized(u.plan) !== plan) return false;
      const userStatus = u.deletionStatus === "pending" ? "pending_deletion" : normalized(u.accountStatus || (u.disabled ? "disabled" : "active"));
      if (status !== "all" && userStatus !== status) return false;
      if (provider !== "all") {
        const providers = [...(u.providers || []), ...(u.authProviders || [])];
        if (!providers.includes(provider)) return false;
      }
      return true;
    });
  }, [users, search, plan, status, provider]);

  const premium = users.filter((u) => normalized(u.plan) === "premium").length;
  const active = users.filter((u) => u.deletionStatus !== "pending" && normalized(u.accountStatus || (u.disabled ? "disabled" : "active")) === "active").length;
  const withUsername = users.filter((u) => !!u.username).length;

  if (loading) return <div className="panel">Caricamento utenti…</div>;
  return <>
    <div className="user-metrics">
      <article><span>Totale</span><strong>{users.length}</strong></article>
      <article><span>Premium</span><strong>{premium}</strong></article>
      <article><span>Attivi</span><strong>{active}</strong></article>
      <article><span>Con username</span><strong>{withUsername}</strong></article>
    </div>
    <div className="panel users-toolbar">
      <label className="search-field">Cerca<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, email, username o UID" /></label>
      <label>Piano<select value={plan} onChange={(e) => setPlan(e.target.value)}><option value="all">Tutti</option><option value="premium">Premium</option><option value="free">Free</option></select></label>
        <label>Stato<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Tutti</option><option value="active">Attivi</option><option value="pending_deletion">Cancellazione programmata</option><option value="disabled">Disabilitati</option></select></label>
      <label>Provider<select value={provider} onChange={(e) => setProvider(e.target.value)}><option value="all">Tutti</option>{providerOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <div className="results-count">{filtered.length} risultati</div>
    </div>
    <div className={`users-layout ${selected ? "with-detail" : ""}`}>
      <div className="panel table-wrap"><table className="users-table"><thead><tr><th>Utente</th><th>Username</th><th>Piano</th><th>Stato</th><th>Paese</th><th>Provider</th><th>Ultimo accesso</th></tr></thead><tbody>
        {filtered.map((u) => {
          const providers = [...new Set([...(u.providers || []), ...(u.authProviders || [])])].filter(Boolean);
          return <tr key={u.uid} className={selected?.uid === u.uid ? "selected" : ""} onClick={() => setSelected(u)}>
            <td><strong>{u.displayName || u.email || u.uid}</strong><small>{u.email || u.uid}</small></td>
            <td>{u.username || "—"}</td>
            <td><span className={`pill ${normalized(u.plan)}`}>{u.plan || "—"}</span></td>
            <td>{u.deletionStatus === "pending" ? "cancellazione programmata" : u.accountStatus || (u.disabled ? "disabled" : "active")}</td>
            <td>{u.country || "—"}</td>
            <td>{providers.length ? providers.join(", ") : "—"}</td>
            <td>{dateText(u.lastSeenAt)}</td>
          </tr>;
        })}
        {!filtered.length && <tr><td colSpan={7}>Nessun utente corrisponde ai filtri selezionati.</td></tr>}
      </tbody></table></div>
      {selected && <UserDetail
        user={selected}
        session={session}
        onClose={() => setSelected(null)}
        onUsernameSaved={(updated) => {
          setSelected(updated);
          onUserUpdated(updated);
        }}
      />}
    </div>
    <p className="admin-footnote">L'indice utenti usa esclusivamente metadati account necessari all'amministrazione. I dati finanziari e i campi personali non necessari non sono esposti in questa sezione.</p>
  </>;
}

function Config({ session, config, onSaved }: { session: AdminSession; config: PublicAppConfig; onSaved: (v: PublicAppConfig) => void }) {
  const canEdit = hasCapability(session, "config.write");
  const [draft, setDraft] = useState(config);
  const [status, setStatus] = useState("");
  useEffect(() => setDraft(config), [config]);

  async function save() {
    if (!canEdit) return;
    setStatus("Salvataggio…");
    try {
      await savePublicConfig(draft, session.uid, session.email);
      onSaved(draft);
      setStatus("Configurazione salvata");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Errore durante il salvataggio");
    }
  }

  return <div className="panel form-grid">
    <label>Versione minima<input value={draft.minimumVersion || ""} onChange={(e) => setDraft({ ...draft, minimumVersion: e.target.value })} disabled={!canEdit} /></label>
    <label>Versione consigliata<input value={draft.recommendedVersion || ""} onChange={(e) => setDraft({ ...draft, recommendedVersion: e.target.value })} disabled={!canEdit} /></label>
    <label className="toggle"><input type="checkbox" checked={!!draft.maintenanceMode} onChange={(e) => setDraft({ ...draft, maintenanceMode: e.target.checked })} disabled={!canEdit} /> Modalità manutenzione</label>
    <label className="toggle"><input type="checkbox" checked={!!draft.announcementsEnabled} onChange={(e) => setDraft({ ...draft, announcementsEnabled: e.target.checked })} disabled={!canEdit} /> Annunci abilitati</label>
    <div className="form-actions"><button className="primary" onClick={save} disabled={!canEdit}>Salva configurazione</button><span>{canEdit ? status : "Ruolo in sola lettura"}</span></div>
  </div>;
}

function Communications({ session }: { session: AdminSession }) {
  const canPublish = hasCapability(session, "communications.write");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("info");
  const [targetPlan, setTargetPlan] = useState("all");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function publish() {
    if (!canPublish || busy) return;
    if (!title.trim() || !message.trim()) {
      setStatus("Titolo e messaggio sono obbligatori.");
      return;
    }
    if (!window.confirm("Inviare questa comunicazione agli utenti selezionati nell'ambiente Test?")) return;
    setBusy(true);
    setStatus("Pubblicazione in corso…");
    try {
      const id = await publishImportantCommunication(
        { title, message, severity, targetPlan, environment: adminEnvironment },
        session.uid,
        session.email
      );
      setStatus(`Comunicazione accodata correttamente (${id}).`);
      setTitle("");
      setMessage("");
      setSeverity("info");
      setTargetPlan("all");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invio non completato");
    } finally {
      setBusy(false);
    }
  }

  return <div className="panel communication-form">
    <div className="communication-warning">Le comunicazioni di questo pacchetto vengono pubblicate esclusivamente su fAInance Test. Production non viene contattata.</div>
    <label>Titolo<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Titolo mostrato nel centro notifiche" disabled={!canPublish || busy} /></label>
    <label>Messaggio<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1200} rows={7} placeholder="Comunicazione importante per gli utenti" disabled={!canPublish || busy} /></label>
    <div className="communication-options">
      <label>Priorità<select value={severity} onChange={(event) => setSeverity(event.target.value)} disabled={!canPublish || busy}><option value="info">Informativa</option><option value="success">Positiva</option><option value="warning">Importante</option><option value="critical">Critica</option></select></label>
      <label>Destinatari<select value={targetPlan} onChange={(event) => setTargetPlan(event.target.value)} disabled={!canPublish || busy}><option value="all">Tutti i piani</option><option value="free">Gratuito</option><option value="base">Base</option><option value="premium">Completo</option></select></label>
    </div>
    <div className="form-actions"><button className="primary" onClick={publish} disabled={!canPublish || busy || !title.trim() || !message.trim()}>{busy ? "Invio…" : "Pubblica comunicazione"}</button><span>{canPublish ? status : "Ruolo non autorizzato alla pubblicazione"}</span></div>
  </div>;
}

function Audit({ entries, loading }: { entries: AdminAuditEntry[]; loading: boolean }) {
  if (loading) return <div className="panel">Caricamento audit…</div>;
  return <div className="panel table-wrap"><table><thead><tr><th>Data</th><th>Azione</th><th>Amministratore</th><th>Target</th></tr></thead><tbody>
    {entries.map((entry) => <tr key={entry.id}><td>{dateText(entry.createdAt)}</td><td>{entry.action || "—"}</td><td><strong>{entry.actorEmail || entry.actorUid || "—"}</strong><small>{entry.actorUid || ""}</small></td><td>{[entry.targetType, entry.targetId].filter(Boolean).join(" / ") || "—"}</td></tr>)}
    {!entries.length && <tr><td colSpan={4}>Nessuna operazione amministrativa registrata.</td></tr>}
  </tbody></table></div>;
}

function TechnicalLogs({ entries, loading }: { entries: TechnicalLogEntry[]; loading: boolean }) {
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [search, setSearch] = useState("");
  const categories = useMemo(() => [...new Set(entries.map((e) => e.category).filter(Boolean) as string[])].sort(), [entries]);
  const filtered = useMemo(() => entries.filter((entry) => {
    if (category !== "all" && entry.category !== category) return false;
    if (severity !== "all" && entry.severity !== severity) return false;
    const needle = normalized(search);
    if (needle) {
      const haystack = [entry.uid, entry.category, entry.operation, entry.errorCode, entry.environment, entry.appVersion].map(normalized).join(" ");
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }), [entries, category, severity, search]);
  if (loading) return <div className="panel">Caricamento log tecnici…</div>;
  return <>
    <div className="panel users-toolbar technical-toolbar">
      <label className="search-field">Cerca<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="UID, operazione, errore, versione" /></label>
      <label>Categoria<select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">Tutte</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Severità<select value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="all">Tutte</option><option value="info">Info</option><option value="warning">Warning</option><option value="error">Error</option></select></label>
      <div className="results-count">{filtered.length} log</div>
    </div>
    <div className="panel table-wrap"><table><thead><tr><th>Data</th><th>Categoria</th><th>Operazione</th><th>Esito</th><th>Utente</th><th>Errore</th><th>Ambiente</th></tr></thead><tbody>
      {filtered.map((entry) => <tr key={entry.id}><td>{dateText(entry.createdAt || entry.createdAtIso || entry.createdAtMs)}</td><td><strong>{entry.category || "—"}</strong><small>{entry.severity || "info"}</small></td><td>{entry.operation || "—"}</td><td>{entry.result || "—"}</td><td className="mono">{entry.uid || "—"}</td><td>{entry.errorCode || "—"}</td><td>{entry.environment || "—"}<small>{entry.appVersion || ""}</small></td></tr>)}
      {!filtered.length && <tr><td colSpan={7}>Nessun log tecnico corrisponde ai filtri.</td></tr>}
    </tbody></table></div>
    <p className="admin-footnote">I log tecnici non includono password, token o contenuti finanziari. Gli errori di accesso pre-autenticazione vengono caricati dopo una successiva sessione autenticata sul dispositivo.</p>
  </>;
}

function Backups({ entries, loading }: { entries: BackupMetadataEntry[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const needle = normalized(search);
    if (!needle) return entries;
    return entries.filter((entry) => [entry.uid, entry.reason, entry.appVersion, entry.id].map(normalized).join(" ").includes(needle));
  }, [entries, search]);
  const totalCompressed = filtered.reduce((sum, entry) => sum + Number(entry.compressedBytes || 0), 0);
  if (loading) return <div className="panel">Caricamento backup…</div>;
  return <>
    <div className="user-metrics">
      <article><span>Snapshot visibili</span><strong>{filtered.length}</strong></article>
      <article><span>Spazio compresso</span><strong>{(totalCompressed / 1024 / 1024).toFixed(2)} MB</strong></article>
      <article><span>Retention per utente</span><strong>12</strong></article>
      <article><span>Intervallo automatico</span><strong>6h</strong></article>
    </div>
    <div className="panel users-toolbar backup-toolbar"><label className="search-field">Cerca<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="UID, motivo, versione" /></label><div className="results-count">{filtered.length} backup</div></div>
    <div className="panel table-wrap"><table><thead><tr><th>Data</th><th>Utente</th><th>Motivo</th><th>Versione</th><th>Dimensione</th><th>Rapporto</th></tr></thead><tbody>
      {filtered.map((entry) => { const raw = Number(entry.rawBytes || 0), compressed = Number(entry.compressedBytes || 0); return <tr key={`${entry.uid || "u"}_${entry.id}`}><td>{dateText(entry.createdAt || entry.createdAtIso || entry.createdAtMs)}</td><td className="mono">{entry.uid || "—"}</td><td>{entry.reason || "automatic"}</td><td>{entry.appVersion || "—"}</td><td>{(compressed / 1024).toFixed(1)} KB</td><td>{raw > 0 ? `${Math.round((compressed / raw) * 100)}%` : "—"}</td></tr>; })}
      {!filtered.length && <tr><td colSpan={6}>Nessun backup automatico disponibile.</td></tr>}
    </tbody></table></div>
    <p className="admin-footnote">L'Admin visualizza solo i metadati dei backup. Il contenuto del backup resta accessibile esclusivamente al proprietario dell'account.</p>
  </>;
}

function Diagnostics({ session, users }: { session: AdminSession; users: AdminUserMetadata[] }) {
  const lastIndex = users.map((u) => timestampToDate(u.indexedAt)).filter((v): v is Date => !!v).sort((a, b) => b.getTime() - a.getTime())[0];
  return <div className="panel diagnostics">
    <div><span>Ambiente Admin</span><strong>{adminEnvironment}</strong></div>
    <div><span>Firebase project</span><strong>{adminFirebaseConfig.projectId}</strong></div>
    <div><span>UID amministratore</span><strong>{session.uid}</strong></div>
    <div><span>Ruolo</span><strong>{session.role}</strong></div>
    <div><span>Utenti indicizzati</span><strong>{users.length}</strong></div>
    <div><span>Ultimo indice rilevato</span><strong>{lastIndex ? lastIndex.toLocaleString("it-IT") : "—"}</strong></div>
    <p>Il portale usa collezioni amministrative dedicate. L'indice utenti non include indirizzo, telefono, data di nascita o dati finanziari.</p>
  </div>;
}

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [denied, setDenied] = useState(false);
  const [section, setSection] = useState<AdminSection>("overview");
  const [users, setUsers] = useState<AdminUserMetadata[]>([]);
  const [config, setConfig] = useState<PublicAppConfig>({});
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [technicalLogs, setTechnicalLogs] = useState<TechnicalLogEntry[]>([]);
  const [backups, setBackups] = useState<BackupMetadataEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  useEffect(() => onAuthStateChanged(adminAuth, async (user) => {
    setDenied(false);
    if (!user) { setSession(null); setAuthReady(true); return; }
    const resolved = await sessionFromUser(user);
    if (!resolved) { setSession(null); setDenied(true); setAuthReady(true); return; }
    setSession(resolved); setAuthReady(true);
  }), []);

  useEffect(() => {
    if (!session) return;
    setLoading(true); setDataError("");
    Promise.all([
      listRecentUsers(500),
      readPublicConfig(),
      hasCapability(session, "audit.read") ? listRecentAudit(100) : Promise.resolve([]),
      hasCapability(session, "technical_logs.read") ? listRecentTechnicalLogs(300) : Promise.resolve([]),
      hasCapability(session, "backups.read") ? listRecentBackupMetadata(300) : Promise.resolve([])
    ])
      .then(([u, c, a, logs, backupRows]) => { setUsers(u); setConfig(c); setAudit(a); setTechnicalLogs(logs); setBackups(backupRows); })
      .catch((e) => setDataError(e instanceof Error ? e.message : "Dati Admin non disponibili"))
      .finally(() => setLoading(false));
  }, [session]);

  function updateUserMetadata(updated: AdminUserMetadata) {
    setUsers((current) => current.map((item) => item.uid === updated.uid ? { ...item, ...updated } : item));
  }

  const title = useMemo(() => ({ overview: "Dashboard", users: "Utenti", communications: "Comunicazioni", config: "Configurazione", audit: "Audit", technicalLogs: "Log tecnici", backups: "Backup", diagnostics: "Diagnostica" })[section], [section]);

  if (!authReady) return <main className="center">Caricamento…</main>;
  if (!session) return <>{denied && <div className="denied-banner">Account autenticato ma privo di ruolo Admin.</div>}<Login /></>;

  return <div className="admin-shell">
    <aside>
      <div className="brand"><div className="brand-mark small">fA</div><div><strong>fAInance</strong><span>Admin</span></div></div>
      <nav>
        {(["overview", "users", ...(hasCapability(session, "communications.write") ? ["communications" as AdminSection] : []), "config", ...(hasCapability(session, "audit.read") ? ["audit" as AdminSection] : []), ...(hasCapability(session, "technical_logs.read") ? ["technicalLogs" as AdminSection] : []), ...(hasCapability(session, "backups.read") ? ["backups" as AdminSection] : []), "diagnostics"] as AdminSection[]).map((item) => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}>{({overview:"Dashboard",users:"Utenti",communications:"Comunicazioni",config:"Configurazione",audit:"Audit",technicalLogs:"Log tecnici",backups:"Backup",diagnostics:"Diagnostica"} as Record<AdminSection,string>)[item]}</button>)}
      </nav>
      <div className="sidebar-footer"><span>{session.email}</span><strong>{session.role}</strong><button onClick={() => signOut(adminAuth)}>Esci</button></div>
    </aside>
    <main className="content">
      <header><div><h1>{title}</h1><p>fAInance Admin · {adminEnvironment}</p></div><span className={`env ${adminEnvironment}`}>{adminEnvironment.toUpperCase()}</span></header>
      {dataError && <div className="warning-box">{dataError}</div>}
      {section === "overview" && <Overview users={users} config={config} />}
      {section === "users" && <Users users={users} loading={loading} session={session} onUserUpdated={updateUserMetadata} />}
      {section === "communications" && hasCapability(session, "communications.write") && <Communications session={session} />}
      {section === "config" && <Config session={session} config={config} onSaved={setConfig} />}
      {section === "audit" && hasCapability(session, "audit.read") && <Audit entries={audit} loading={loading} />}
      {section === "technicalLogs" && hasCapability(session, "technical_logs.read") && <TechnicalLogs entries={technicalLogs} loading={loading} />}
      {section === "backups" && hasCapability(session, "backups.read") && <Backups entries={backups} loading={loading} />}
      {section === "diagnostics" && <Diagnostics session={session} users={users} />}
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
