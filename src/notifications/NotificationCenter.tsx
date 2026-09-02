import { useEffect, useMemo, useState } from "react";
import { useApp } from "../core";
import { PopupCloseButton } from "../widget";
import {
  deleteAppNotification,
  markAppNotificationRead,
  watchAppNotifications,
  type AppNotificationRecord,
} from "./appNotifications";

function notificationIcon(item: AppNotificationRecord): string {
  if (item.type === "share_invite") return "🤝";
  if (item.type === "share_invite_accepted") return "✅";
  if (item.type === "share_project_deleted") return "🗂️";
  if (item.severity === "critical") return "🚨";
  if (item.severity === "warning") return "⚠️";
  if (item.severity === "success") return "✅";
  return "📣";
}


function interpolateNotificationText(template: string, args?: Record<string, string>): string {
  return String(template || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) =>
    String(args && args[key] != null ? args[key] : ""),
  );
}

function notificationDisplayText(
  item: AppNotificationRecord,
  L: (text: string) => string,
): { title: string; message: string } {
  if (item.type === "admin_broadcast") {
    return {
      title: String(item.title || L("Notifica")),
      message: String(item.message || ""),
    };
  }
  if (item.type === "share_invite") {
    return {
      title: L("Invito Share"),
      message: interpolateNotificationText(
        L("{name} ti ha invitato nel progetto {project}"),
        item.messageArgs,
      ),
    };
  }
  if (item.type === "share_invite_accepted") {
    return {
      title: L("Invito Share accettato"),
      message: interpolateNotificationText(
        L("{name} ha accettato l'invito al progetto {project}"),
        item.messageArgs,
      ),
    };
  }
  if (item.type === "share_project_deleted") {
    return {
      title: L("Progetto Share eliminato"),
      message: interpolateNotificationText(
        L("{name} ha eliminato il progetto {project}. Scegli se conservare le tue spese nello storico personale."),
        item.messageArgs,
      ),
    };
  }
  return {
    title: item.title ? L(String(item.title)) : L("Notifica"),
    message: item.message ? L(String(item.message)) : "",
  };
}

function useNotificationItems(userId: string) {
  const [items, setItems] = useState<AppNotificationRecord[]>([]);
  useEffect(() => {
    return watchAppNotifications(String(userId || ""), setItems, () => undefined);
  }, [userId]);
  return [items, setItems] as const;
}

function EmployeeProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.7 20c.55-3.15 3.1-5 7.3-5 2.08 0 3.75.45 4.97 1.28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="15" y="15.5" width="6.2" height="4.8" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M17.1 15.5v-.7c0-.65.53-1.18 1.18-1.18h.02c.65 0 1.18.53 1.18 1.18v.7" stroke="currentColor" strokeWidth="1.45" />
    </svg>
  );
}

function NotificationRows({
  items,
  userId,
  onOpen,
  compact,
}: {
  items: AppNotificationRecord[];
  userId: string;
  onOpen?: (notification: AppNotificationRecord) => void;
  compact?: boolean;
}) {
  const ctx: any = useApp();
  const L = (text: string) =>
    ctx.translateUiRuntimeText ? ctx.translateUiRuntimeText(text) : text;
  const dark = !!ctx.dark;
  const textC = ctx.textC || (dark ? "#f5f5f5" : "#232323");
  const subC = ctx.subC || (dark ? "#a9a9b5" : "#777");
  const borderC = ctx.borderC || (dark ? "#3a3a49" : "#e6e6ec");
  const primary = ctx.confirmButtonColor || "#378ADD";
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");

  if (items.length === 0) {
    return (
      <div style={{ padding: compact ? "18px 10px" : "28px 12px", textAlign: "center", color: subC, fontSize: 13 }}>
        <div style={{ fontSize: compact ? 24 : 30, marginBottom: 8 }}>🔕</div>
        {L("Nessuna notifica ricevuta")}
      </div>
    );
  }

  async function removeItem(item: AppNotificationRecord) {
    if (deletingId) return;
    setDeleteError("");
    setDeletingId(item.id);
    try {
      await deleteAppNotification(userId, item.id);
    } catch (_deleteError: any) {
      // FAINANCE V113: never expose raw Firebase/provider text in a different language.
      setDeleteError(L("Eliminazione notifica non riuscita."));
    } finally {
      setDeletingId("");
    }
  }

  return (
    <>
      {deleteError && (
        <div style={{ marginBottom: 8, borderRadius: 10, padding: "8px 10px", background: dark ? "#3a2020" : "#FFF0F0", color: "#E24B4A", fontSize: 10 }}>
          {deleteError}
        </div>
      )}
      {items.map((item) => {
        const display = notificationDisplayText(item, L);
        return (
          <div
            key={item.id}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "flex-start",
              gap: 7,
              padding: compact ? 7 : 8,
              marginBottom: 8,
              borderRadius: 15,
              border: "1px solid " + (!item.read ? primary + "66" : borderC),
              background: !item.read ? primary + "12" : dark ? "#252535" : "#F8FAFC",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={async () => {
                if (!item.read) await markAppNotificationRead(userId, item.id, true).catch(() => undefined);
                onOpen?.(item);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                gap: compact ? 9 : 11,
                textAlign: "left",
                padding: compact ? 3 : 4,
                border: 0,
                background: "transparent",
                color: textC,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: compact ? 20 : 23 }}>{notificationIcon(item)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: item.read ? 750 : 950 }}>{display.title}</span>
                <span style={{ display: "block", fontSize: 12, lineHeight: 1.42, color: subC, marginTop: 3 }}>{display.message}</span>
                <span style={{ display: "block", fontSize: 10, color: subC, marginTop: 6 }}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                </span>
              </span>
              {!item.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: primary, marginTop: 5, flexShrink: 0 }} />}
            </button>
            <button
              type="button"
              aria-label={L("Elimina notifica")}
              title={L("Elimina notifica")}
              disabled={deletingId === item.id}
              onClick={(event) => {
                event.stopPropagation();
                void removeItem(item);
              }}
              style={{
                width: compact ? 28 : 31,
                height: compact ? 28 : 31,
                borderRadius: 10,
                border: "1px solid #FCA5A5",
                background: "#FEE2E2",
                color: "#E24B4A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 17,
                lineHeight: 1,
                fontWeight: 900,
                cursor: deletingId === item.id ? "default" : "pointer",
                opacity: deletingId === item.id ? 0.55 : 1,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </>
  );
}

export function NotificationInboxSettingsCard({ userId }: { userId: string }) {
  const ctx: any = useApp();
  const [items, setItems] = useNotificationItems(userId);
  const L = (text: string) =>
    ctx.translateUiRuntimeText ? ctx.translateUiRuntimeText(text) : text;
  const dark = !!ctx.dark;
  const cardBg = ctx.cardBg || (dark ? "#1f1f2e" : "#fff");
  const textC = ctx.textC || (dark ? "#f5f5f5" : "#232323");
  const subC = ctx.subC || (dark ? "#a9a9b5" : "#777");
  const borderC = ctx.borderC || (dark ? "#3a3a49" : "#e6e6ec");
  const primary = ctx.confirmButtonColor || "#378ADD";
  const unread = useMemo(() => items.filter((item) => !item.read), [items]);
  if (!userId) return null;

  async function markAllRead() {
    const pending = unread.slice();
    setItems((current) => current.map((row) => ({ ...row, read: true })) as AppNotificationRecord[]);
    await Promise.all(pending.map((item) => markAppNotificationRead(userId, item.id, true).catch(() => undefined)));
  }

  return (
    <div style={{ background: cardBg, border: "1px solid " + borderC, borderRadius: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 13, background: primary + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>🔔</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: textC, fontWeight: 900, fontSize: 14 }}>
            {L("Notifiche ricevute")}{unread.length > 0 ? ` (${unread.length})` : ""}
          </div>
          <div style={{ color: subC, fontSize: 11, marginTop: 2 }}>{L("Le comunicazioni ricevute restano disponibili anche qui.")}</div>
        </div>
        {unread.length > 0 && (
          <button type="button" onClick={markAllRead} style={{ border: 0, background: "transparent", color: primary, fontWeight: 850, cursor: "pointer", fontSize: 11 }}>
            {L("Segna tutte come lette")}
          </button>
        )}
      </div>
      <div style={{ maxHeight: 310, overflowY: "auto" }}>
        <NotificationRows items={items.slice(0, 30)} userId={userId} compact />
      </div>
    </div>
  );
}

export function NotificationCenter({
  userId,
  onOpen,
  onProfile,
}: {
  userId: string;
  onOpen?: (notification: AppNotificationRecord) => void;
  onProfile?: () => void;
}) {
  const ctx: any = useApp();
  const [items, setItems] = useNotificationItems(userId);
  const [open, setOpen] = useState(false);
  const L = (text: string) =>
    ctx.translateUiRuntimeText ? ctx.translateUiRuntimeText(text) : text;
  const dark = !!ctx.dark;
  const cardBg = ctx.cardBg || (dark ? "#1f1f2e" : "#fff");
  const textC = ctx.textC || (dark ? "#f5f5f5" : "#232323");
  const subC = ctx.subC || (dark ? "#a9a9b5" : "#777");
  const borderC = ctx.borderC || (dark ? "#3a3a49" : "#e6e6ec");
  const primary = ctx.confirmButtonColor || "#378ADD";
  const unread = useMemo(() => items.filter((item) => !item.read), [items]);
  if (!userId) return null;

  async function openItem(item: AppNotificationRecord) {
    if (!item.read) {
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)) as AppNotificationRecord[]);
      await markAppNotificationRead(userId, item.id, true).catch(() => undefined);
    }
    if (item.actionType || item.type === "share_invite") {
      onOpen?.(item);
      setOpen(false);
    }
  }

  async function markAllRead() {
    const pending = unread.slice();
    setItems((current) => current.map((row) => ({ ...row, read: true })) as AppNotificationRecord[]);
    await Promise.all(pending.map((item) => markAppNotificationRead(userId, item.id, true).catch(() => undefined)));
  }

  const actionButton = {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: "1px solid " + borderC,
    background: cardBg,
    color: textC,
    boxShadow: dark ? "none" : "0 5px 16px rgba(15,23,42,.13)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
  };

  return (
    <>
      <div style={{ position: "fixed", right: 10, top: "max(40px,calc(env(safe-area-inset-top,0px) + 28px))", zIndex: 9996, display: "flex", gap: 5, alignItems: "center" }}>
        <button type="button" aria-label={L("Apri profilo")} onClick={onProfile} style={actionButton}>
          <EmployeeProfileIcon />
        </button>
        <button type="button" aria-label={L("Apri centro notifiche")} onClick={() => setOpen(true)} style={{ ...actionButton, fontSize: 17 }}>
          🔔
          {unread.length > 0 && (
            <span style={{ position: "absolute", right: -5, top: -6, minWidth: 19, height: 19, padding: "0 4px", borderRadius: 999, background: "#E24B4A", color: "#fff", border: "2px solid " + cardBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 950, boxSizing: "border-box" }}>
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={L("Centro notifiche")} onClick={(event) => event.target === event.currentTarget && setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(15,23,42,.48)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "max(82px,calc(env(safe-area-inset-top,0px) + 72px)) 12px 16px", boxSizing: "border-box" }}>
          <section style={{ width: "min(430px,100%)", maxHeight: "calc(100dvh - 98px)", overflowY: "auto", background: cardBg, border: "1px solid " + borderC, borderRadius: 22, padding: 14, boxShadow: dark ? "none" : "0 22px 70px rgba(15,23,42,.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: textC, fontSize: 18, fontWeight: 950 }}>{L("Notifiche")}</div>
                <div style={{ color: subC, fontSize: 11 }}>{L("Inviti Share e comunicazioni importanti")}</div>
              </div>
              {unread.length > 0 && (
                <button type="button" onClick={markAllRead} style={{ border: 0, background: "transparent", color: primary, fontWeight: 850, cursor: "pointer", fontSize: 11 }}>
                  {L("Segna tutte come lette")}
                </button>
              )}
              <PopupCloseButton onClick={() => setOpen(false)} dark={dark} label={L("Chiudi")} />
            </div>
            <NotificationRows items={items} userId={userId} onOpen={openItem} />
          </section>
        </div>
      )}
    </>
  );
}
