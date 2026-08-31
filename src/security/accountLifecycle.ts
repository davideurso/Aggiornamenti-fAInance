import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from "firebase/firestore";
import { deleteUser, type User } from "firebase/auth";
import { fbDb } from "../firebase/client";

export const ACCOUNT_DELETION_GRACE_DAYS = 15;

export interface AccountDeletionState {
  status: "active" | "pending" | "due";
  requestedAt: string;
  scheduledAt: string;
  cancelledAt?: string;
}

function nowIso(): string { return new Date().toISOString(); }
function addDaysIso(days: number): string { return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(); }

function fromData(data: any): AccountDeletionState {
  const requestedAt = String(data?.deletionRequestedAt || "");
  const scheduledAt = String(data?.deletionScheduledAt || "");
  if (String(data?.deletionStatus || "") !== "pending" || !scheduledAt) {
    return { status: "active", requestedAt: "", scheduledAt: "", cancelledAt: String(data?.deletionCancelledAt || "") };
  }
  return { status: Date.parse(scheduledAt) <= Date.now() ? "due" : "pending", requestedAt, scheduledAt };
}

export async function loadAccountDeletionState(uid: string): Promise<AccountDeletionState> {
  if (!uid) return { status: "active", requestedAt: "", scheduledAt: "" };
  const snapshot = await getDoc(doc(fbDb, "users", uid));
  return fromData(snapshot.exists() ? snapshot.data() : {});
}

export function watchAccountDeletionState(uid: string, callback: (state: AccountDeletionState) => void): () => void {
  if (!uid) return () => undefined;
  return onSnapshot(doc(fbDb, "users", uid), (snapshot) => callback(fromData(snapshot.exists() ? snapshot.data() : {})), () => undefined);
}

export async function requestAccountDeletion(uid: string): Promise<AccountDeletionState> {
  if (!uid) throw new Error("ACCOUNT_UID_REQUIRED");
  const requestedAt = nowIso();
  const scheduledAt = addDaysIso(ACCOUNT_DELETION_GRACE_DAYS);
  const payload = {
    uid,
    status: "pending",
    requestedAt,
    scheduledAt,
    graceDays: ACCOUNT_DELETION_GRACE_DAYS,
    updatedAt: requestedAt,
  };
  await setDoc(doc(fbDb, "users", uid), {
    deletionStatus: "pending",
    deletionRequestedAt: requestedAt,
    deletionScheduledAt: scheduledAt,
    deletionGraceDays: ACCOUNT_DELETION_GRACE_DAYS,
    deletionCancelledAt: "",
    updatedAt: requestedAt,
  }, { merge: true });
  await setDoc(doc(fbDb, "accountDeletionRequests", uid), payload, { merge: true });
  return { status: "pending", requestedAt, scheduledAt };
}

export async function cancelAccountDeletion(uid: string): Promise<AccountDeletionState> {
  if (!uid) throw new Error("ACCOUNT_UID_REQUIRED");
  const cancelledAt = nowIso();
  await setDoc(doc(fbDb, "users", uid), {
    deletionStatus: "active",
    deletionCancelledAt: cancelledAt,
    deletionRequestedAt: "",
    deletionScheduledAt: "",
    updatedAt: cancelledAt,
  }, { merge: true });
  await setDoc(doc(fbDb, "accountDeletionRequests", uid), {
    uid,
    status: "cancelled",
    cancelledAt,
    updatedAt: cancelledAt,
  }, { merge: true });
  return { status: "active", requestedAt: "", scheduledAt: "", cancelledAt };
}

export function isAccountDeletionDue(state: AccountDeletionState | null | undefined): boolean {
  return !!state && (state.status === "due" || (!!state.scheduledAt && Date.parse(state.scheduledAt) <= Date.now()));
}

export function isRecentAuthentication(user: User, maxAgeMinutes = 10): boolean {
  const last = Date.parse(String(user?.metadata?.lastSignInTime || ""));
  return Number.isFinite(last) && Date.now() - last <= maxAgeMinutes * 60 * 1000;
}

export async function finalizeDueAccountDeletion(user: User): Promise<boolean> {
  if (!user?.uid) return false;
  const state = await loadAccountDeletionState(user.uid);
  if (!isAccountDeletionDue(state)) return false;
  if (!isRecentAuthentication(user)) return false;

  const uid = user.uid;
  const profileSnap = await getDoc(doc(fbDb, "users", uid));
  const profile: any = profileSnap.exists() ? profileSnap.data() : {};
  const usernameLower = String(profile.usernameLower || "").trim().toLowerCase();
  const phone = String(profile.phone || "").replace(/[^0-9]/g, "");
  const email = String(user.email || profile.email || "").trim().toLowerCase();

  const usernameRef = usernameLower ? doc(fbDb, "usernames", usernameLower) : null;
  const usernameLoginRef = usernameLower ? doc(fbDb, "usernameLogin", usernameLower) : null;
  const emailLookupRef = email ? doc(fbDb, "userLookup", "email:" + email.replace(/\//g, "_")) : null;
  const phoneLookupRef = phone ? doc(fbDb, "userLookup", "phone:" + phone) : null;

  const [projects, invitedInvites, sentInvites, notifications, devices, backups, customIcons, backupMetadata, usernameSnap, usernameLoginSnap, emailLookupSnap, phoneLookupSnap] = await Promise.all([
    getDocs(query(collection(fbDb, "shareProjects"), where("ownerUid", "==", uid))),
    getDocs(query(collection(fbDb, "shareInvites"), where("invitedUid", "==", uid))),
    getDocs(query(collection(fbDb, "shareInvites"), where("invitedByUid", "==", uid))),
    getDocs(query(collection(fbDb, "shareNotifications"), where("userUid", "==", uid))),
    getDocs(collection(fbDb, "users", uid, "devices")),
    getDocs(collection(fbDb, "users", uid, "backups")),
    getDocs(collection(fbDb, "users", uid, "customIcons")),
    getDocs(query(collection(fbDb, "accountBackupMetadata"), where("uid", "==", uid))),
    usernameRef ? getDoc(usernameRef).catch(() => null) : Promise.resolve(null),
    usernameLoginRef ? getDoc(usernameLoginRef).catch(() => null) : Promise.resolve(null),
    emailLookupRef ? getDoc(emailLookupRef).catch(() => null) : Promise.resolve(null),
    phoneLookupRef ? getDoc(phoneLookupRef).catch(() => null) : Promise.resolve(null),
  ]);

  const batch = writeBatch(fbDb);
  batch.delete(doc(fbDb, "userData", uid));
  batch.delete(doc(fbDb, "accountDeletionRequests", uid));
  projects.docs.forEach((row) => batch.delete(row.ref));
  invitedInvites.docs.forEach((row) => batch.delete(row.ref));
  sentInvites.docs.forEach((row) => batch.delete(row.ref));
  notifications.docs.forEach((row) => batch.delete(row.ref));
  devices.docs.forEach((row) => batch.delete(row.ref));
  backups.docs.forEach((row) => batch.delete(row.ref));
  customIcons.docs.forEach((row) => batch.delete(row.ref));
  backupMetadata.docs.forEach((row) => batch.delete(row.ref));
  if (usernameRef && usernameSnap && usernameSnap.exists() && String(usernameSnap.data()?.uid || "") === uid) batch.delete(usernameRef);
  if (usernameLoginRef && usernameLoginSnap && usernameLoginSnap.exists() && String(usernameLoginSnap.data()?.uid || "") === uid) batch.delete(usernameLoginRef);
  if (emailLookupRef && emailLookupSnap && emailLookupSnap.exists() && String(emailLookupSnap.data()?.uid || "") === uid) batch.delete(emailLookupRef);
  if (phoneLookupRef && phoneLookupSnap && phoneLookupSnap.exists() && String(phoneLookupSnap.data()?.uid || "") === uid) batch.delete(phoneLookupRef);
  await batch.commit();

  // Delete the profile only after its subcollection has been cleared.
  await deleteDoc(doc(fbDb, "users", uid));
  await deleteUser(user);
  return true;
}
