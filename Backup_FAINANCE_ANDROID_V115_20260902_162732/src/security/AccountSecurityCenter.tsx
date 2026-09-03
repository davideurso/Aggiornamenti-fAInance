import { useEffect, useMemo, useState } from "react";
import { fbAuth } from "../firebase/client";
import { FainancePickerModal } from "../widget";
import { ACCOUNT_DELETION_GRACE_DAYS, loadAccountDeletionState, type AccountDeletionState } from "./accountLifecycle";
import { currentFainanceDeviceId, listDeviceSessions, revokeAllOtherDeviceSessions, revokeDeviceSession, type FainanceDeviceSession } from "./deviceSessions";

function formatDateTime(value: string): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (_error) { return value; }
}

export function AccountSecurityCenter({
  currentUser,
  dark,
  textC,
  subC,
  borderC,
  cardBg,
  btnRadius,
  translate,
  setToast,
  onRequestAccountDeletion,
  onCancelAccountDeletion,
  onLogout,
  showDevices = true,
  showDeletion = true,
}: any) {
  const L = typeof translate === "function" ? translate : (x: string) => x;
  const uid = String(currentUser?.id || "");
  const [devices, setDevices] = useState<FainanceDeviceSession[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState("");
  const [deletionState, setDeletionState] = useState<AccountDeletionState>({ status: "active", requestedAt: "", scheduledAt: "" });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const currentDeviceId = useMemo(() => currentFainanceDeviceId(), [uid]);

  const hasPasswordProvider = ((fbAuth.currentUser?.providerData || []) as any[]).some((p) => p && p.providerId === "password");

  async function refreshDevices() {
    if (!uid) return;
    setDevicesLoading(true); setDevicesError("");
    try { setDevices(await listDeviceSessions(uid)); }
    catch (_error) { setDevicesError(L("Impossibile caricare i dispositivi associati.")); }
    finally { setDevicesLoading(false); }
  }

  async function refreshDeletion() {
    if (!uid) return;
    try { setDeletionState(await loadAccountDeletionState(uid)); } catch (_error) {}
  }

  useEffect(() => { void refreshDevices(); void refreshDeletion(); }, [uid]);

  async function requestDeletion() {
    if (deleteConfirm !== "ELIMINA" || !onRequestAccountDeletion) return;
    setDeleteBusy(true); setDeleteError("");
    try {
      const state = await onRequestAccountDeletion(deletePassword);
      setDeletionState(state || await loadAccountDeletionState(uid));
      setDeleteOpen(false); setDeleteConfirm(""); setDeletePassword("");
      await refreshDevices();
      setToast?.({ text: L("Cancellazione programmata. Hai 15 giorni per ripensarci."), type: "success", icon: "✅" });
    } catch (error: any) {
      setDeleteError(String(error?.message || L("Impossibile programmare la cancellazione dell’account.")));
    } finally { setDeleteBusy(false); }
  }

  async function cancelDeletion() {
    if (!onCancelAccountDeletion) return;
    setActionBusy("cancel-delete");
    try {
      const state = await onCancelAccountDeletion();
      setDeletionState(state || { status: "active", requestedAt: "", scheduledAt: "" });
      setToast?.({ text: L("Cancellazione account annullata."), type: "success", icon: "✅" });
    } catch (_error) {
      setToast?.({ text: L("Impossibile annullare la cancellazione."), type: "error", icon: "⚠️", color: "#E24B4A" });
    } finally { setActionBusy(""); }
  }

  async function disconnectDevice(device: FainanceDeviceSession) {
    if (!uid || !device?.id) return;
    setActionBusy(device.id);
    try {
      await revokeDeviceSession(uid, device.id);
      if (device.id === currentDeviceId) {
        await Promise.resolve(onLogout?.());
        return;
      }
      await refreshDevices();
      setToast?.({ text: L("Dispositivo disconnesso."), type: "success", icon: "✅" });
    } catch (_error) {
      setToast?.({ text: L("Impossibile disconnettere il dispositivo."), type: "error", icon: "⚠️", color: "#E24B4A" });
    } finally { setActionBusy(""); }
  }

  async function disconnectOthers() {
    if (!uid) return;
    setActionBusy("others");
    try {
      const count = await revokeAllOtherDeviceSessions(uid);
      await refreshDevices();
      setToast?.({ text: count ? L("Tutti gli altri dispositivi sono stati disconnessi.") : L("Non ci sono altri dispositivi attivi."), type: "success", icon: "✅" });
    } catch (_error) {
      setToast?.({ text: L("Impossibile disconnettere gli altri dispositivi."), type: "error", icon: "⚠️", color: "#E24B4A" });
    } finally { setActionBusy(""); }
  }

  const activeDevices = devices.filter((d) => d.active || d.current);
  const panel = { background: cardBg, border: "1px solid " + borderC, borderRadius: 14, padding: 14 };
  const secondaryButton = { border: "1px solid " + borderC, background: dark ? "#2A2A3E" : "#fff", color: textC, borderRadius: btnRadius, padding: "9px 11px", fontSize: 12, fontWeight: 800, cursor: "pointer" } as any;

  return <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
    {showDevices && <div style={panel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div><div style={{ fontSize: 14, fontWeight: 900, color: textC }}>📱 {L("Dispositivi associati")}</div><div style={{ fontSize: 11, color: subC, marginTop: 3 }}>{L("Gestisci i dispositivi che hanno accesso al tuo account.")}</div></div>
        <button type="button" onClick={refreshDevices} disabled={devicesLoading} style={secondaryButton}>{devicesLoading ? "…" : "↻"}</button>
      </div>
      {devicesError && <div style={{ fontSize: 12, color: "#E24B4A", marginBottom: 8 }}>{devicesError}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {activeDevices.map((device) => <div key={device.id} style={{ border: "1px solid " + borderC, borderRadius: 12, padding: "10px 11px", display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", background: dark ? "#232338" : "#FAFBFF" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}><span style={{ fontSize: 13, fontWeight: 900, color: textC }}>{device.deviceName || device.platform || L("Dispositivo")}</span>{device.current && <span style={{ fontSize: 10, fontWeight: 900, color: "#1D9E75", background: dark ? "#16362d" : "#E7F7F0", borderRadius: 20, padding: "2px 7px" }}>{L("Questo dispositivo")}</span>}</div>
            <div style={{ fontSize: 11, color: subC, marginTop: 3 }}>{[device.platform, device.browser, device.appVersion].filter(Boolean).join(" · ")}</div>
            <div style={{ fontSize: 10, color: subC, marginTop: 3 }}>{L("Ultimo accesso")}: {formatDateTime(device.lastSeenAt || device.lastLoginAt)}</div>
          </div>
          <button type="button" onClick={() => disconnectDevice(device)} disabled={!!actionBusy} style={{ ...secondaryButton, color: "#E24B4A", borderColor: "#F3B6B6" }}>{actionBusy === device.id ? "…" : L("Disconnetti")}</button>
        </div>)}
        {!devicesLoading && activeDevices.length === 0 && <div style={{ fontSize: 12, color: subC, padding: "8px 0" }}>{L("Nessun dispositivo attivo trovato.")}</div>}
      </div>
      <button type="button" onClick={disconnectOthers} disabled={!!actionBusy || activeDevices.filter((d) => !d.current).length === 0} style={{ ...secondaryButton, width: "100%", marginTop: 10, opacity: activeDevices.filter((d) => !d.current).length ? 1 : .55 }}>{actionBusy === "others" ? "…" : L("Disconnetti tutti gli altri dispositivi")}</button>
    </div>}

    {showDeletion && <div style={{ ...panel, borderColor: deletionState.status === "active" ? borderC : "#E8B84E", background: deletionState.status === "active" ? cardBg : (dark ? "#352D18" : "#FFF8E4") }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: deletionState.status === "active" ? textC : (dark ? "#FFE19A" : "#805D00") }}>🗑 {L("Cancellazione account")}</div>
      {deletionState.status === "active" ? <>
        <div style={{ fontSize: 11, color: subC, marginTop: 5, lineHeight: 1.45 }}>{L("Dopo la richiesta avrai 15 giorni per annullare la cancellazione. Trascorso il periodo di ripensamento, l’account verrà chiuso.")}</div>
        <button type="button" onClick={() => { setDeleteOpen(true); setDeleteError(""); setDeleteConfirm(""); setDeletePassword(""); }} style={{ ...secondaryButton, width: "100%", marginTop: 10, color: "#E24B4A", borderColor: "#F3B6B6" }}>{L("Cancella Account")}</button>
      </> : <>
        <div style={{ fontSize: 12, color: dark ? "#FFE9B5" : "#6A5200", marginTop: 7, lineHeight: 1.5 }}>{L("Cancellazione programmata per")}: <b>{formatDateTime(deletionState.scheduledAt)}</b>.</div>
        <div style={{ fontSize: 11, color: subC, marginTop: 4 }}>{L("Puoi annullarla in qualsiasi momento prima della scadenza.")}</div>
        <button type="button" onClick={cancelDeletion} disabled={actionBusy === "cancel-delete"} style={{ ...secondaryButton, width: "100%", marginTop: 10, color: "#1D9E75", borderColor: "#9EDCC5" }}>{actionBusy === "cancel-delete" ? "…" : L("Annulla cancellazione account")}</button>
      </>}
    </div>}

    {showDeletion && <FainancePickerModal open={deleteOpen} title={L("Cancella Account")} onClose={() => !deleteBusy && setDeleteOpen(false)}>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ background: dark ? "#352D18" : "#FFF8E4", border: "1px solid #E8B84E", borderRadius: 12, padding: 11, fontSize: 12, lineHeight: 1.5, color: dark ? "#FFE9B5" : "#6A5200" }}>{L("L’account non verrà eliminato subito. Hai 15 giorni di ripensamento e potrai annullare la richiesta dal Profilo.")}</div>
        <div><label style={{ fontSize: 11, color: subC, display: "block", marginBottom: 4 }}>{L("Scrivi ELIMINA per confermare")}</label><input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="ELIMINA" style={{ width: "100%", boxSizing: "border-box", border: "1px solid " + borderC, borderRadius: 12, padding: "11px 12px", background: dark ? "#242437" : "#fff", color: textC }} /></div>
        {hasPasswordProvider && <div><label style={{ fontSize: 11, color: subC, display: "block", marginBottom: 4 }}>{L("Password attuale")}</label><input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid " + borderC, borderRadius: 12, padding: "11px 12px", background: dark ? "#242437" : "#fff", color: textC }} /></div>}
        {deleteError && <div style={{ fontSize: 12, color: "#E24B4A" }}>{deleteError}</div>}
        <button type="button" onClick={requestDeletion} disabled={deleteBusy || deleteConfirm !== "ELIMINA"} style={{ border: "none", borderRadius: btnRadius, padding: 12, background: "#E24B4A", color: "#fff", fontWeight: 900, cursor: "pointer", opacity: deleteConfirm === "ELIMINA" ? 1 : .5 }}>{deleteBusy ? L("Salvataggio...") : L("Cancella Account")}</button>
      </div>
    </FainancePickerModal>}
  </div>;
}
