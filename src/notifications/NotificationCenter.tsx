import {useNotificationArrivalOrder} from './useNotificationArrivalOrder';
import {spendingAlertNotices} from '../finance/spendingAlerts.js';
import { createPortal } from "react-dom";
import { SummaryActions } from "../ui/AppSummaryHeader";
import { RichNotification } from "./RichNotification";
import { NotificationMediaView, openNotificationDestination } from "./NotificationMedia";
import { readableDarkText } from '../ui/textContrast';
import { closurePreview } from "../finance/savingsClosure";
import { shiftPeriodKey, periodLabel } from "../finance/periodEngine";
import { closureText } from "../i18n/savingsClosureTranslations";
import { SavingsClosurePanel } from "../sections/SavingsClosurePanel";
import { todayStr } from "../core";
import { periodClosureNoticeId, periodClosureNoticeVisible, periodClosureNoticeRead, periodClosureNoticeText, updatePeriodClosureNotice } from "./periodClosureNotice.mjs";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../core";
import { PopupCloseButton } from "../widget";
import { recurringDueOccurrences } from "../finance/recurringOccurrences";
import {
  isMundelyBridgeEnabled,
  pullMundelyBridge,
  respondMundelyLink,
  syncMundelyTripsToShare,
  syncMundelyExpensesToShare,
  syncMundelyCategoryCatalogToShare,
  reconcileFainanceShareExpensesToMundely,
  syncMundelyBridgeNow,
  type MundelyLinkRequest,
} from "../integrations/mundelyBridge";
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
  if (item.type === "recurring_confirmation") return "🔁";
  if (item.type === "period_closure") return "📅";
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
  if (item.type === "recurring_confirmation") {
    return {
      title: L("Transazioni ricorrenti"),
      message: String(item.message || ""),
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

function useSpendingAlertNotificationItems(userId:string):AppNotificationRecord[]{
 const ctx:any=useApp();
 return useMemo(()=>spendingAlertNotices({rows:ctx.allTriggeredAlertsData||[],seen:ctx.shownAlertIds||[],dismissed:ctx.notifPrefs?.spendingAlertDismissedKeys||[],userId}) as AppNotificationRecord[],[userId,ctx.allTriggeredAlertsData,ctx.shownAlertIds,ctx.notifPrefs?.spendingAlertDismissedKeys]);
}
function updateSpendingAlertNotification(ctx:any,item:AppNotificationRecord,action:"read"|"dismiss"){
 const key=String(item.actionValue||"");
 const row=(ctx.allTriggeredAlertsData||[]).find((value:any)=>String(value._alertKey)===key);
 if(row&&typeof ctx.markAlertsSeen==="function")ctx.markAlertsSeen([row]);
 if(action==="dismiss"&&typeof ctx.setNotifPrefs==="function")ctx.setNotifPrefs((previous:any)=>({...previous,spendingAlertDismissedKeys:[...new Set([...(previous?.spendingAlertDismissedKeys||[]),key])].slice(-200)}));
}

function useRecurringNotificationItems(userId: string): AppNotificationRecord[] {
  const ctx: any = useApp();
  return useMemo(() => {
    if (!userId || !ctx?.notifPrefs?.spesaRicorrente) return [];
    const rules = Array.isArray(ctx.recurring) ? ctx.recurring : [];
    const today = String(ctx.accountingDate || "").slice(0, 10);
    if (!today) return [];
    const settings = ctx.accountingPeriod?.settings;
    const locale = String(ctx.lang || "it");
    const formatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
    const amountText = (value: any) => {
      try {
        if (typeof ctx.fmt === "function") return String(ctx.fmt(Number(value) || 0));
      } catch (_formatError) {}
      return String(value ?? "");
    };
    const rows: AppNotificationRecord[] = [];
    rules.forEach((rule: any) => {
      const generated = rule?.rtype === "expense" ? (ctx.expenses || []) : (ctx.incomes || []);
      const occurrences = recurringDueOccurrences(rule, today, settings, generated);
      occurrences.forEach((occurrence: any) => {
        const rawDate = String(occurrence?._occurrenceDate || "");
        let dueDate = rawDate;
        try { dueDate = formatter.format(new Date(rawDate + "T12:00:00")); } catch (_dateError) {}
        rows.push({
          id: `virtual_recurring_${String(rule?.id ?? "")}_${rawDate}`,
          targetUid: String(userId),
          type: "recurring_confirmation",
          title: "Transazioni ricorrenti",
          message: `${String(rule?.name || "")} · ${amountText(rule?.amount)} · ${dueDate}`,
          severity: "warning",
          actionType: "open_recurring",
          actionValue: String(rule?.id ?? ""),
          recurringRuleId: String(rule?.id ?? ""),
          recurringOccurrenceKey: String(occurrence?._occurrenceKey || ""),
          recurringOccurrenceDate: rawDate,
          createdAt: rawDate ? rawDate + "T08:00:00" : new Date().toISOString(),
          createdAtMs: rawDate ? new Date(rawDate + "T08:00:00").getTime() : Date.now(),
          read: false,
          status: "active",
          virtual: true,
        });
      });
    });
    return rows.sort((a, b) => Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0));
  }, [
    userId,
    ctx?.notifPrefs?.spesaRicorrente,
    ctx?.recurring,
    ctx?.expenses,
    ctx?.incomes,
    ctx?.accountingDate,
    ctx?.accountingPeriod?.settings,
    ctx?.lang,
    ctx?.fmt,
  ]);
}

function usePeriodClosureNotice(userId: string): AppNotificationRecord[] {
  const ctx: any = useApp();
  return useMemo(() => {
    if (!userId || !ctx.financeEvolution || !ctx.accountingPeriod
      || !ctx.notifPrefs || ctx.notifPrefs.periodClosureActive === false) return [];
    const currency = String(ctx.currency || "EUR");
    const activeBuckets = Array.isArray(ctx.financeEvolution?.savings?.buckets)
      && ctx.financeEvolution.savings.buckets.some((bucket: any) =>
        bucket.active !== false && bucket.currency === currency);
    if (!activeBuckets) return [];
    try {
      const today = todayStr();
      const current = ctx.accountingPeriod.forDate(today);
      const periodKey = shiftPeriodKey(current.key, -1);
      const previous = ctx.accountingPeriod.forKey(periodKey);
      if (previous.end >= current.start) return [];
      const id = periodClosureNoticeId(periodKey, currency);
      if (!periodClosureNoticeVisible(ctx.notifPrefs, id)) return [];
      const preview = closurePreview(
        ctx.financeEvolution, ctx.legacyBudgetPlan,
        ctx.countedExpensesForAnalysis || ctx.expensesForAnalysis || ctx.expenses || [],
        ctx.countedIncomes || ctx.incomes || [],
        periodKey, currency, today,
      );
      if (preview.existing || !preview.snapshot) return [];
      const summary = preview.snapshot;
      if (![summary.realMinor, summary.depositedMinor, summary.availableMinor].every(Number.isFinite)) return [];
      const money = (n: number) => new Intl.NumberFormat(
        String(ctx.lang || "it"), { style: "currency", currency },
      ).format(n / 100);
      const title = closureText(ctx.lang || "it", "title") + " · " + periodLabel(periodKey, ctx.lang || "it");
      const message = closureText(ctx.lang || "it", "real") + ": " + money(summary.realMinor)
        + " · " + closureText(ctx.lang || "it", "deposited") + ": " + money(summary.depositedMinor)
        + " · " + closureText(ctx.lang || "it", "available") + ": " + money(summary.availableMinor);
      const createdAt = current.start + "T09:00:00";
      return [{
        id, targetUid: userId, type: "period_closure", title, message,
        severity: "info", actionType: "open_period_closure", actionValue: periodKey,
        source: "period_closure", virtual: true,
        createdAt, createdAtMs: new Date(createdAt).getTime(),
        read: periodClosureNoticeRead(ctx.notifPrefs, id), status: "active",
      }];
    } catch (_error) { return []; }
  }, [
    userId, ctx.financeEvolution, ctx.accountingPeriod, ctx.legacyBudgetPlan,
    ctx.countedExpensesForAnalysis, ctx.expensesForAnalysis, ctx.expenses,
    ctx.countedIncomes, ctx.incomes, ctx.currency, ctx.lang, ctx.notifPrefs,
  ]);
}

function updateClosureNotification(ctx: any, item: AppNotificationRecord, action: "read" | "dismiss") {
  if (item.type !== "period_closure" || typeof ctx.setNotifPrefs !== "function") return;
  ctx.setNotifPrefs((previous: any) => updatePeriodClosureNotice(previous, item.id, action));
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
  const textC = ctx.textC || (dark ? "#F4F7FB" : "#14263D");
  const subC = ctx.subC || (dark ? "#B3C0CE" : "#5D6B7C");
  const borderC = ctx.borderC || (dark ? "#29455F" : "#D8E1EA");
  const primary = dark ? "#8CC6FF" : "#052A5F";
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [confirmingId, setConfirmingId] = useState("");

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
      if(item.type==="spending_alert")updateSpendingAlertNotification(ctx,item,"dismiss");
      else if (item.type === "period_closure") updateClosureNotification(ctx, item, "dismiss");
      else await deleteAppNotification(userId, item.id);
    } catch (_deleteError: any) {
      // FAINANCE V113: never expose raw Firebase/provider text in a different language.
      setDeleteError(L("Eliminazione notifica non riuscita."));
    } finally {
      setDeletingId("");
    }
  }

  async function confirmRecurringNotification(item: AppNotificationRecord) {
    if (confirmingId || item.type !== "recurring_confirmation") return;
    const rule = (Array.isArray(ctx.recurring) ? ctx.recurring : []).find(
      (row: any) => String(row?.id ?? "") === String(item.recurringRuleId || item.actionValue || ""),
    );
    if (!rule || typeof ctx.confirmRecurring !== "function") return;
    setConfirmingId(item.id);
    try {
      await Promise.resolve(
        ctx.confirmRecurring(
          {
            ...rule,
            _occurrenceKey: String(item.recurringOccurrenceKey || ""),
            _occurrenceDate: String(item.recurringOccurrenceDate || ""),
          },
          String(item.recurringOccurrenceKey || ""),
        ),
      );
    } finally {
      setConfirmingId("");
    }
  }

  return (
    <>
      {deleteError && (
        <div style={{ marginBottom: 8, borderRadius: 10, padding: "8px 10px", background: dark ? "#3a2020" : "#FFF0F0", color: readableDarkText("#E24B4A", dark, dark ? "#3a2020" : "#FFF0F0"), fontSize: 10 }}>
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
              flexWrap: "wrap",
              alignItems: "flex-start",
              gap: 7,
              padding: compact ? 7 : 8,
              marginBottom: 8,
              borderRadius: 15,
              border: "1px solid " + (!item.read ? primary + "66" : borderC),
              background: !item.read ? primary + "12" : dark ? "#031A3D" : "#F7F9FC",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={async () => {
                if(item.type==="spending_alert"){updateSpendingAlertNotification(ctx,item,"read");ctx.setTab?.("alerts");onOpen?.(item);}
                else if (item.type === "period_closure") {
                  if (!item.read) updateClosureNotification(ctx, item, "read");
                  window.dispatchEvent(new CustomEvent("fainance:open-period-closure", {
                    detail: { periodKey: String(item.actionValue || "") },
                  }));
                } else {
                  if (!item.read && !item.virtual) await markAppNotificationRead(userId, item.id, true).catch(() => undefined);
                  onOpen?.(item);
                }
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
                color: readableDarkText(textC, dark, "transparent"),
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: compact ? 20 : 23 }}>{notificationIcon(item)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: item.read ? 750 : 950 }}>{display.title}</span>
                <span style={{ display: "block", fontSize: 12, lineHeight: 1.42, color: readableDarkText(subC, dark, "transparent"), marginTop: 3 }}>{!item.richContent && display.message}</span>
                {item.type === "period_closure" && <span style={{ display: "block", color: primary, fontSize: 12, marginTop: 5, fontWeight: 800 }}>{periodClosureNoticeText(ctx.lang || "it", "open")} →</span>}
                <span style={{ display: "block", fontSize: 10, color: readableDarkText(subC, dark, "transparent"), marginTop: 6 }}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                </span>
              </span>
              {!item.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: primary, marginTop: 5, flexShrink: 0 }} />}
            </button>
            {item.richContent && <RichNotification value={item.richContent} />}
            {item.media && <NotificationMediaView value={item.media} dark={dark} L={L} onNavigate={() => { openNotificationDestination(item.media); onOpen?.({ ...item, actionType: "open_media_destination" }); }} />}
            {item.type === "recurring_confirmation" ? (
              <button
                type="button"
                disabled={confirmingId === item.id}
                onClick={(event) => {
                  event.stopPropagation();
                  void confirmRecurringNotification(item);
                }}
                style={{
                  minHeight: 32,
                  borderRadius: 10,
                  border: 0,
                  background: "#1D9E75",
                  color: readableDarkText("#fff", dark, "#1D9E75"),
                  padding: "0 10px",
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: confirmingId === item.id ? "default" : "pointer",
                  opacity: confirmingId === item.id ? 0.6 : 1,
                }}
              >
                ✅ {L("Conferma")}
              </button>
            ) : (
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
                color: readableDarkText("#E24B4A", dark, "#FEE2E2"),
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
            )}
          </div>
        );
      })}
    </>
  );
}

export function NotificationInboxSettingsCard({ userId }: { userId: string }) {
  const ctx: any = useApp();
  const [storedItems, setStoredItems] = useNotificationItems(userId);
  const closureItems = usePeriodClosureNotice(userId);
  const spendingItems = useSpendingAlertNotificationItems(userId);
  const items = useNotificationArrivalOrder([...spendingItems, ...closureItems, ...storedItems],userId);
  const L = (text: string) =>
    ctx.translateUiRuntimeText ? ctx.translateUiRuntimeText(text) : text;
  const dark = !!ctx.dark;
  const cardBg = ctx.cardBg || (dark ? "#10243A" : "#fff");
  const textC = ctx.textC || (dark ? "#F4F7FB" : "#14263D");
  const subC = ctx.subC || (dark ? "#B3C0CE" : "#5D6B7C");
  const borderC = ctx.borderC || (dark ? "#29455F" : "#D8E1EA");
  const primary = dark ? "#8CC6FF" : "#052A5F";
  const unread = useMemo(() => items.filter((item) => !item.read), [items]);
  if (!userId) return null;

  async function markAllRead() {
    const pending = unread.filter((item) => !item.virtual);
    spendingItems.filter((item)=>!item.read).forEach(item=>updateSpendingAlertNotification(ctx,item,"read"));
    closureItems.filter((item) => !item.read).forEach((item) => updateClosureNotification(ctx, item, "read"));
    setStoredItems((current) => current.map((row) => ({ ...row, read: true })) as AppNotificationRecord[]);
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
          <button type="button" onClick={markAllRead} style={{ border: 0, background: "transparent", color: readableDarkText(primary, dark, "transparent"), fontWeight: 850, cursor: "pointer", fontSize: 11 }}>
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


function MundelyLinkRequestRows({
  requests,
  busyId,
  onDecision,
}: {
  requests: MundelyLinkRequest[];
  busyId: string;
  onDecision: (request: MundelyLinkRequest, decision: "approve" | "reject") => Promise<void>;
}) {
  const ctx: any = useApp();
  const L = (text: string) => ctx.translateUiRuntimeText ? ctx.translateUiRuntimeText(text) : text;
  const dark = !!ctx.dark;
  const textC = ctx.textC || (dark ? "#F4F7FB" : "#14263D");
  const subC = ctx.subC || (dark ? "#B3C0CE" : "#5D6B7C");
  const borderC = ctx.borderC || (dark ? "#29455F" : "#D8E1EA");
  const primary = dark ? "#8CC6FF" : "#052A5F";
  if (!requests.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      {requests.map((request) => (
        <div key={request.id} style={{ border: `1px solid ${primary}66`, background: primary + "10", borderRadius: 15, padding: 11, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 23, lineHeight: 1.1 }}>🔗</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: textC, fontWeight: 950, fontSize: 13 }}>{L("Collega Mundely")}</div>
              <div style={{ color: subC, fontSize: 12, lineHeight: 1.42, marginTop: 4 }}>
                {L("Una richiesta da Mundely vuole collegare questo account fAInance. Accetta per sincronizzare automaticamente ogni viaggio con un progetto Share.")}
              </div>
              <div style={{ color: subC, fontSize: 10, marginTop: 5 }}>
                {L("Account richiesto")}: {request.requestedIdentifier}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => void onDecision(request, "reject")}
                  style={{ flex: 1, minHeight: 34, borderRadius: 10, border: `1px solid ${borderC}`, background: dark ? "#2a2a3a" : "#fff", color: textC, fontWeight: 850, cursor: "pointer" }}
                >
                  {L("Rifiuta")}
                </button>
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => void onDecision(request, "approve")}
                  style={{ flex: 1, minHeight: 34, borderRadius: 10, border: 0, background: primary, color: readableDarkText("#fff", dark, primary), fontWeight: 900, cursor: "pointer" }}
                >
                  {busyId === request.id ? L("Attendi...") : L("Collega")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationCenter({
  userId,
  onOpen,
  onProfile,
  actionsHost,
}: {
  userId: string;
  onOpen?: (notification: AppNotificationRecord) => void;
  onProfile?: () => void;
  actionsHost?: HTMLElement | null;
}) {
  const ctx: any = useApp();
  const [storedItems, setStoredItems] = useNotificationItems(userId);
  const recurringItems = useRecurringNotificationItems(userId);
  const closureItems = usePeriodClosureNotice(userId);
  const spendingItems = useSpendingAlertNotificationItems(userId);
  const items = useNotificationArrivalOrder([...spendingItems, ...closureItems, ...recurringItems, ...storedItems],userId);
  const [open, setOpen] = useState(false);
  const [closurePeriodKey, setClosurePeriodKey] = useState("");
  const [mundelyRequests, setMundelyRequests] = useState<MundelyLinkRequest[]>([]);
  const [mundelyBusyId, setMundelyBusyId] = useState("");
  const L = (text: string) =>
    ctx.translateUiRuntimeText ? ctx.translateUiRuntimeText(text) : text;
  const dark = !!ctx.dark;
  const cardBg = ctx.cardBg || (dark ? "#10243A" : "#fff");
  const textC = ctx.textC || (dark ? "#F4F7FB" : "#14263D");
  const subC = ctx.subC || (dark ? "#B3C0CE" : "#5D6B7C");
  const borderC = ctx.borderC || (dark ? "#29455F" : "#D8E1EA");
  const primary = dark ? "#8CC6FF" : "#052A5F";
  const unread = useMemo(() => items.filter((item) => !item.read), [items]);
  const unreadStored = useMemo(() => storedItems.filter((item) => !item.read), [storedItems]);
  const notificationCount = unread.length + mundelyRequests.length;
  useEffect(() => {
    const onPeriodClosure = (event: Event) => {
      const key = String((event as CustomEvent).detail?.periodKey || "");
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return;
      setOpen(false);
      setClosurePeriodKey(key);
    };
    const showNotifications = () => setOpen(true);
    window.addEventListener("fainance:open-notifications", showNotifications);
    window.addEventListener("fainance:open-period-closure", onPeriodClosure);
    return () => {
      window.removeEventListener("fainance:open-notifications", showNotifications);
      window.removeEventListener("fainance:open-period-closure", onPeriodClosure);
    };
  }, []);
  useEffect(() => {
    if (!userId || !isMundelyBridgeEnabled()) {
      setMundelyRequests([]);
      return;
    }
    let cancelled = false;
    let running = false;
    const refresh = async () => {
      if (running || cancelled) return;
      running = true;
      try {
        const payload = await pullMundelyBridge();
        if (cancelled) return;
        setMundelyRequests(payload.linkRequests);
        await syncMundelyTripsToShare(payload.tripSyncs);
        await syncMundelyCategoryCatalogToShare(payload.linkedTrips);
        await syncMundelyExpensesToShare(payload.expenseSyncs);
        await reconcileFainanceShareExpensesToMundely(payload.linkedTrips);
      } catch (_error) {
        // Test bridge failures remain silent in the notification center; Mundely stays fail-closed.
      } finally {
        running = false;
      }
    };
    const refreshBridgeOnly = () => { void syncMundelyBridgeNow().catch(() => undefined); };
    (window as any).__mundelyBridgeRefreshNow = refreshBridgeOnly;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    const onFocus = () => void refresh();
    const onVisibility = () => {
      // hidden fires while the user is leaving fAInance: start the reverse sync
      // before Android suspends WebView timers. visible is the normal safety pass.
      if (document.visibilityState === "hidden") refreshBridgeOnly();
      else void refresh();
    };
    const onPageHide = () => refreshBridgeOnly();
    const onShareMutation = () => {
      refreshBridgeOnly();
      [100, 450, 1100, 2400].forEach((delay) => window.setTimeout(refreshBridgeOnly, delay));
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("fainance:share-mutated", onShareMutation as EventListener);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if ((window as any).__mundelyBridgeRefreshNow === refreshBridgeOnly) delete (window as any).__mundelyBridgeRefreshNow;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("fainance:share-mutated", onShareMutation as EventListener);
    };
  }, [userId]);
  if (!userId) return null;

  async function openItem(item: AppNotificationRecord) {
    if (!item.read && !item.virtual) {
      setStoredItems((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)) as AppNotificationRecord[]);
      await markAppNotificationRead(userId, item.id, true).catch(() => undefined);
    }
    if (item.actionType || item.type === "share_invite") {
      onOpen?.(item);
      setOpen(false);
    }
  }

  async function decideMundelyLink(request: MundelyLinkRequest, decision: "approve" | "reject") {
    if (!request?.id || mundelyBusyId) return;
    setMundelyBusyId(request.id);
    try {
      await respondMundelyLink(request.id, decision);
      setMundelyRequests((current) => current.filter((item) => item.id !== request.id));
      if (decision === "approve") {
        const payload = await pullMundelyBridge().catch(() => ({ linkRequests: [], tripSyncs: [], expenseSyncs: [], linkedTrips: [] }));
        setMundelyRequests(payload.linkRequests);
        await syncMundelyTripsToShare(payload.tripSyncs);
        await syncMundelyCategoryCatalogToShare(payload.linkedTrips);
        await syncMundelyExpensesToShare(payload.expenseSyncs);
        await reconcileFainanceShareExpensesToMundely(payload.linkedTrips);
      }
    } finally {
      setMundelyBusyId("");
    }
  }

  async function markAllRead() {
    const pending = unreadStored.slice();
    spendingItems.filter((item)=>!item.read).forEach(item=>updateSpendingAlertNotification(ctx,item,"read"));
    closureItems.filter((item) => !item.read).forEach((item) => updateClosureNotification(ctx, item, "read"));
    setStoredItems((current) => current.map((row) => ({ ...row, read: true })) as AppNotificationRecord[]);
    await Promise.all(pending.map((item) => markAppNotificationRead(userId, item.id, true).catch(() => undefined)));
  }

  const actionButton = {
    width: 34,
    height: 34,
    borderRadius: ctx.isMobile ? 12 : 0,
    border: ctx.isMobile ? "1px solid " + borderC : "none",
    background: ctx.isMobile ? cardBg : "transparent",
    color: textC,
    boxShadow: ctx.isMobile ? (dark ? "none" : "0 5px 16px rgba(15,23,42,.13)") : "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    padding: 0,
  };

  return (
    <>
      <style>{`
        .notification-media { flex: 1 0 100%; min-width: 0; }
      `}</style>
      {actionsHost && createPortal(<SummaryActions dark={dark} style={actionButton} count={notificationCount} translate={L} onProfile={onProfile} onNotifications={() => setOpen(true)} background={cardBg} />, actionsHost)}

      {open && (
        <div role="dialog" aria-modal="true" aria-label={L("Centro notifiche")} onClick={(event) => event.target === event.currentTarget && setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(15,23,42,.48)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "max(82px,calc(env(safe-area-inset-top,0px) + 72px)) 12px 16px", boxSizing: "border-box" }}>
          <section style={{ width: "min(430px,100%)", maxHeight: "calc(100dvh - 98px)", overflowY: "auto", background: cardBg, border: "1px solid " + borderC, borderRadius: 22, padding: 14, boxShadow: dark ? "none" : "0 22px 70px rgba(15,23,42,.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: textC, fontSize: 18, fontWeight: 950 }}>{L("Notifiche")}</div>
                <div style={{ color: subC, fontSize: 11 }}>{L("Inviti Share e comunicazioni importanti")}</div>
              </div>
              {unread.length > 0 && (
                <button type="button" onClick={markAllRead} style={{ border: 0, background: "transparent", color: readableDarkText(primary, dark, "transparent"), fontWeight: 850, cursor: "pointer", fontSize: 11 }}>
                  {L("Segna tutte come lette")}
                </button>
              )}
              <PopupCloseButton onClick={() => setOpen(false)} dark={dark} label={L("Chiudi")} />
            </div>
            <MundelyLinkRequestRows requests={mundelyRequests} busyId={mundelyBusyId} onDecision={decideMundelyLink} />
            <NotificationRows items={items} userId={userId} onOpen={openItem} />
          </section>
        </div>
      )}
      {closurePeriodKey && (
        <div
          role="dialog" aria-modal="true"
          aria-label={periodClosureNoticeText(ctx.lang || "it", "settingTitle")}
          onClick={(event) => {
            if (event.target === event.currentTarget) setClosurePeriodKey("");
          }}
          style={{
            position: "fixed", inset: 0, zIndex: 10060,
            background: "rgba(3,26,61,.72)", display: "flex",
            alignItems: "flex-start", justifyContent: "center",
            padding: "max(70px,env(safe-area-inset-top,0px)) 12px 24px",
            overflowY: "auto", boxSizing: "border-box",
          }}
        >
          <div style={{
            background: cardBg, color: textC, border: "1px solid " + borderC,
            borderRadius: 16, padding: 16, width: "min(100%,520px)", minWidth: 0,
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 12,
            }}>
              <strong style={{ fontSize: 17 }}>
                {periodClosureNoticeText(ctx.lang || "it", "open")}
              </strong>
              <PopupCloseButton onClick={() => setClosurePeriodKey("")} dark={dark} label={L("Chiudi")} />
            </div>
            <SavingsClosurePanel periodKey={closurePeriodKey} />
          </div>
        </div>
      )}
    </>
  );
}
