import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
import { fbDb } from "../firebase/client";

export interface AdminUserMetadata {
  uid: string;
  email?: string;
  username?: string;
  displayName?: string;
  plan?: string;
  accountStatus?: string;
  platform?: string;
  appVersion?: string;
  language?: string;
  country?: string;
  createdAt?: string;
  lastSeenAt?: string;
}

export interface PublicAppConfig {
  minimumVersion?: string;
  recommendedVersion?: string;
  maintenanceMode?: boolean;
  announcementsEnabled?: boolean;
  updatedAt?: string;
  updatedBy?: string;
  [key: string]: unknown;
}

// Admin deliberately uses dedicated metadata/config collections.
// It never reads users/{uid}/userData or other private financial documents.
const ADMIN_USERS_COLLECTION = "adminUserMetadata";
const SYSTEM_CONFIG_COLLECTION = "systemConfig";
const PUBLIC_CONFIG_DOCUMENT = "public";

export async function readAdminUserMetadata(uid: string): Promise<AdminUserMetadata | null> {
  const snapshot = await getDoc(doc(fbDb, ADMIN_USERS_COLLECTION, uid));
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as AdminUserMetadata) : null;
}

export async function listRecentAdminUserMetadata(maxResults = 100): Promise<AdminUserMetadata[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(maxResults)));
  const q = query(collection(fbDb, ADMIN_USERS_COLLECTION), orderBy("lastSeenAt", "desc"), limit(safeLimit));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ uid: item.id, ...item.data() } as AdminUserMetadata));
}

export async function readPublicAppConfig(): Promise<PublicAppConfig | null> {
  const snapshot = await getDoc(doc(fbDb, SYSTEM_CONFIG_COLLECTION, PUBLIC_CONFIG_DOCUMENT));
  return snapshot.exists() ? (snapshot.data() as PublicAppConfig) : null;
}

export async function mergePublicAppConfig(patch: PublicAppConfig): Promise<void> {
  await setDoc(doc(fbDb, SYSTEM_CONFIG_COLLECTION, PUBLIC_CONFIG_DOCUMENT), patch, { merge: true });
}
