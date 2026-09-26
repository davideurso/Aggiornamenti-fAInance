import { doc, getDoc, setDoc } from "firebase/firestore";
import { appEnvironment, firebaseConfig, functionsRegion } from "../config/env";
import { fbAuth, fbDb } from "../firebase/client";

const MUNDELY_TEST_PROJECT_ID = "tripai-test-ccb16";
const FAINANCE_TEST_PROJECT_ID = "fainance-test-20260823195207";
const BRIDGE_VERSION = 13;

export interface MundelyLinkRequest {
  id: string;
  mundelyUid: string;
  sourceLabel: string;
  requestedIdentifier: string;
  requestedIdentifierType: string;
  createdAtMs: number;
}

export interface MundelyTripSync {
  id: string;
  mundelyUid: string;
  tripId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  archived?: boolean;
  syncMode?: "create" | "update";
  targetShareProjectId: string;
}


export interface MundelyExpenseSync {
  id: string;
  mundelyUid: string;
  tripId: string;
  expenseId: string;
  targetShareProjectId: string;
  targetShareActivityKey: string;
  targetShareActivityId?: number;
  amount: number;
  description: string;
  category: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  currency: string;
  origin?: string;
  bridgeOrigin?: string;
  sourceShareActivityId?: number;
  date: string;
  time: string;
  deleted: boolean;
  syncMode?: "create" | "update";
}

export interface MundelyLinkedTrip {
  mundelyUid: string;
  tripId: string;
  targetShareProjectId: string;
  activeExpenseIds?: string[];
  deletedShareActivityKeys?: string[];
  categories?: Array<{ key: string; name: string; icon?: string; color?: string }>;
}

interface BridgePullResponse {
  ok: boolean;
  environment?: string;
  targetProjectId?: string;
  bridgeVersion?: number;
  linkRequests?: MundelyLinkRequest[];
  tripSyncs?: MundelyTripSync[];
  expenseSyncs?: MundelyExpenseSync[];
  linkedTrips?: MundelyLinkedTrip[];
  removeShareActivityKeys?: string[];
  error?: string;
}

function bridgeAvailable(): boolean {
  return appEnvironment === "test" && firebaseConfig.projectId === FAINANCE_TEST_PROJECT_ID;
}

function bridgeUrl(): string {
  return `https://${functionsRegion}-${MUNDELY_TEST_PROJECT_ID}.cloudfunctions.net/fainanceBridgeExchange`;
}

async function bridgeRequest(body: Record<string, unknown>): Promise<BridgePullResponse> {
  if (!bridgeAvailable()) throw new Error("MUNDELY_BRIDGE_TEST_ONLY");
  const currentUser = fbAuth.currentUser;
  if (!currentUser) throw new Error("FAINANCE_AUTH_REQUIRED");
  const token = await currentUser.getIdToken();
  const response = await fetch(bridgeUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...body, bridgeVersion: BRIDGE_VERSION }),
  });
  const payload = (await response.json().catch(() => ({}))) as BridgePullResponse;
  if (!response.ok || payload.ok !== true) throw new Error(String(payload.error || "MUNDELY_BRIDGE_UNAVAILABLE"));
  if (payload.environment !== "test" || payload.targetProjectId !== FAINANCE_TEST_PROJECT_ID || Number(payload.bridgeVersion || 0) < BRIDGE_VERSION) {
    throw new Error("MUNDELY_BRIDGE_ENVIRONMENT_MISMATCH");
  }
  return payload;
}

export async function pullMundelyBridge(): Promise<{ linkRequests: MundelyLinkRequest[]; tripSyncs: MundelyTripSync[]; expenseSyncs: MundelyExpenseSync[]; linkedTrips: MundelyLinkedTrip[] }> {
  if (!bridgeAvailable() || !fbAuth.currentUser) return { linkRequests: [], tripSyncs: [], expenseSyncs: [], linkedTrips: [] };
  const payload = await bridgeRequest({ action: "pull" });
  return {
    linkRequests: Array.isArray(payload.linkRequests) ? payload.linkRequests : [],
    tripSyncs: Array.isArray(payload.tripSyncs) ? payload.tripSyncs : [],
    expenseSyncs: Array.isArray(payload.expenseSyncs) ? payload.expenseSyncs : [],
    linkedTrips: Array.isArray(payload.linkedTrips) ? payload.linkedTrips : [],
  };
}

export async function respondMundelyLink(requestId: string, decision: "approve" | "reject"): Promise<void> {
  await bridgeRequest({ action: "respondLink", requestId: String(requestId || ""), decision });
}

async function acknowledgeMundelyTrip(
  syncId: string,
  syncStatus: "completed" | "error",
  targetShareProjectId: string,
  errorCode?: string,
): Promise<void> {
  await bridgeRequest({
    action: "ackTrip",
    syncId: String(syncId || ""),
    syncStatus,
    targetShareProjectId: String(targetShareProjectId || ""),
    errorCode: String(errorCode || ""),
  });
}

async function acknowledgeMundelyExpense(
  syncId: string,
  syncStatus: "completed" | "error",
  errorCode?: string,
): Promise<void> {
  await bridgeRequest({
    action: "ackExpense",
    syncId: String(syncId || ""),
    syncStatus,
    errorCode: String(errorCode || ""),
  });
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function currentUserName(profile: Record<string, unknown> | null): string {
  const profileName = clean(profile?.name) || [clean(profile?.firstName), clean(profile?.lastName)].filter(Boolean).join(" ");
  return profileName || clean(fbAuth.currentUser?.displayName) || "Io";
}

function canonicalMundelyCategoryKey(value: unknown): string {
  const raw = clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    food: "food", cibo: "food", meal: "food", meals: "food", dining: "food", restaurant: "food",
    transport: "transport", trasporti: "transport", transportation: "transport", travel: "transport",
    accommodation: "accommodation", alloggio: "accommodation", stay: "accommodation", lodging: "accommodation", hotel: "accommodation", hotels: "accommodation",
    activities: "activities", activity: "activities", attivita: "activities", experience: "activities", experiences: "activities",
    shopping: "shopping", shops: "shopping",
    other: "other", altro: "other", misc: "other", miscellaneous: "other",
  };
  return aliases[raw] || raw || "other";
}

function mundelyCategoryDisplayName(key: string, explicitName?: unknown): string {
  const normalizedExplicit = clean(explicitName);
  if (normalizedExplicit && canonicalMundelyCategoryKey(normalizedExplicit) !== key) return normalizedExplicit;
  let lang = "en";
  try {
    lang = String(document.documentElement.lang || navigator.language || "en").toLowerCase().slice(0, 2);
  } catch (_error) {}
  const labels: Record<string, Record<string, string>> = {
    it: { food: "Cibo", transport: "Trasporti", accommodation: "Alloggio", activities: "Attività", shopping: "Shopping", other: "Altro" },
    es: { food: "Comida", transport: "Transporte", accommodation: "Alojamiento", activities: "Actividades", shopping: "Compras", other: "Otro" },
    fr: { food: "Repas", transport: "Transport", accommodation: "Hébergement", activities: "Activités", shopping: "Achats", other: "Autre" },
    de: { food: "Essen", transport: "Transport", accommodation: "Unterkunft", activities: "Aktivitäten", shopping: "Einkäufe", other: "Sonstiges" },
    en: { food: "Food", transport: "Transport", accommodation: "Accommodation", activities: "Activities", shopping: "Shopping", other: "Other" },
  };
  return labels[lang]?.[key] || labels.en[key] || normalizedExplicit || key;
}

function mundelyCategoryMeta(
  rawValue: unknown,
  rawName?: unknown,
  rawIcon?: unknown,
  rawColor?: unknown,
): { key: string; name: string; icon: string; color: string; id: string } {
  const raw = clean(rawValue) || clean(rawName) || "other";
  const key = canonicalMundelyCategoryKey(raw);
  const explicitName = clean(rawName);
  const name = mundelyCategoryDisplayName(key, explicitName) || raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "Other";
  const defaultVisuals: Record<string, { icon: string; color: string }> = {
    food: { icon: "🍽️", color: "#E67E22" },
    transport: { icon: "🚗", color: "#378ADD" },
    accommodation: { icon: "🏨", color: "#8E6CEF" },
    activities: { icon: "🎟️", color: "#00A67E" },
    shopping: { icon: "🛍️", color: "#D45DB5" },
    other: { icon: "📦", color: "#607D8B" },
  };
  const fallback = defaultVisuals[key] || { icon: "📦", color: "#607D8B" };
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return {
    key,
    name,
    icon: clean(rawIcon) || fallback.icon,
    color: clean(rawColor) || fallback.color,
    id: `sc_mundely_${key.slice(0, 26)}_${(hash >>> 0).toString(36)}`,
  };
}

async function upsertShareProjectFromMundely(sync: MundelyTripSync): Promise<string> {
  const user = fbAuth.currentUser;
  if (!user) throw new Error("FAINANCE_AUTH_REQUIRED");
  const projectId = clean(sync.targetShareProjectId);
  if (!projectId || !clean(sync.tripId) || !clean(sync.name)) throw new Error("MUNDELY_SYNC_PAYLOAD_INVALID");

  const userProfileSnap = await getDoc(doc(fbDb, "users", user.uid)).catch(() => null);
  const userProfile = userProfileSnap && userProfileSnap.exists() ? (userProfileSnap.data() as Record<string, unknown>) : null;
  const ownerName = currentUserName(userProfile);
  const ownerEmail = clean(userProfile?.email || user.email).toLowerCase();
  const nowIso = new Date().toISOString();

  // Nessuna lettura preventiva su shareProjects.
  // Le regole Firestore autorizzano direttamente la create quando ownerUid
  // coincide con l'utente autenticato. Le letture preventive su un documento
  // ancora inesistente possono invece produrre permission-denied.
  const projectRef = doc(fbDb, "shareProjects", projectId);
  const descriptionParts = ["Mundely", clean(sync.destination), [clean(sync.startDate), clean(sync.endDate)].filter(Boolean).join(" → ")].filter(Boolean);
  const basePatch: Record<string, unknown> = {
    name: clean(sync.name),
    description: descriptionParts.join(" · "),
    ownerUid: user.uid,
    ownerName,
    ownerEmail,
    memberUids: [user.uid],
    sourceApp: "mundely",
    sourceEnvironment: "test",
    mundelyTripId: clean(sync.tripId),
    mundelyUid: clean(sync.mundelyUid),
    mundelyDestination: clean(sync.destination),
    mundelyStartDate: clean(sync.startDate),
    mundelyEndDate: clean(sync.endDate),
    mundelyTripStatus: clean(sync.status) || "planning",
    mundelyTripArchived: sync.archived === true,
    archived: sync.archived === true,
    status: sync.archived === true ? "archived" : "active",
    archivedAt: sync.archived === true ? nowIso : null,
    updatedAt: nowIso,
    updatedAtMs: Date.now(),
    shareRevision: Date.now(),
  };

  if (sync.syncMode === "update") {
    await setDoc(projectRef, basePatch, { merge: true });
    return projectRef.id;
  }

  const owner = {
    id: "me",
    uid: user.uid,
    name: ownerName,
    email: ownerEmail,
    kind: "registered",
    type: "registered",
    role: "owner",
    status: "active",
  };
  await setDoc(projectRef, {
    ...basePatch,
    icon: "✈️",
    color: "#4F8FF7",
    participants: [owner],
    categories: [{
      id: `sc_mundely_${clean(sync.tripId).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 24)}`,
      name: "Altro",
      icon: "📦",
      color: "#4F8FF7",
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso,
    }],
    activities: [],
    createdAt: nowIso,
  }, { merge: false });
  return projectRef.id;
}

export async function syncMundelyTripsToShare(items: MundelyTripSync[]): Promise<void> {
  if (!bridgeAvailable() || !fbAuth.currentUser || !Array.isArray(items) || items.length === 0) return;
  for (const sync of items) {
    const projectId = clean(sync.targetShareProjectId);
    try {
      const resolvedProjectId = await upsertShareProjectFromMundely(sync);
      await acknowledgeMundelyTrip(sync.id, "completed", resolvedProjectId);
    } catch (error) {
      const code = clean((error as { code?: string; message?: string })?.code || (error as Error)?.message || "MUNDELY_SYNC_FAILED").slice(0, 120);
      await acknowledgeMundelyTrip(sync.id, "error", projectId, code).catch(() => undefined);
    }
  }
}


function shareActivityKey(value: unknown): string {
  return clean(value);
}

function shareActivityIdValue(key: string): string | number {
  if (/^\d+$/.test(key)) {
    const numeric = Number(key);
    if (Number.isSafeInteger(numeric) && numeric > 0) return numeric;
  }
  return key;
}

function normalizeShareActivities(rawActivities: unknown[]): Array<Record<string, unknown>> {
  const activities = (Array.isArray(rawActivities) ? rawActivities : []).filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  const allIds = new Set(activities.map((item) => shareActivityKey(item.id)).filter(Boolean));
  const seenIds = new Set<string>();
  const seenMundelyIds = new Set<string>();
  const result: Array<Record<string, unknown>> = [];

  for (const item of activities) {
    const id = shareActivityKey(item.id);
    if (id && seenIds.has(id)) continue;
    const sourceKey = shareActivityKey(item.sourceShareActivityKey || item.sourceShareActivityId);
    if (clean(item.bridgeOrigin) === "fainance" && sourceKey && sourceKey !== id && allIds.has(sourceKey)) continue;
    const mundelyExpenseId = clean(item.mundelyExpenseId);
    if (mundelyExpenseId && seenMundelyIds.has(mundelyExpenseId)) continue;
    if (id) seenIds.add(id);
    if (mundelyExpenseId) seenMundelyIds.add(mundelyExpenseId);
    result.push(item);
  }
  return result;
}

function roundMoney(value: unknown): number {
  return Math.round(Number(value || 0) * 100) / 100;
}

async function resolveBridgeBaseAmount(
  amount: number,
  fromCurrencyRaw: unknown,
  baseCurrencyRaw: unknown,
): Promise<{ baseAmount: number; baseCurrency: string; exchangeRate: number; exchangeRateSource: string; exchangeRateDate: string }> {
  const fromCurrency = clean(fromCurrencyRaw || "EUR").toUpperCase() || "EUR";
  const baseCurrency = clean(baseCurrencyRaw || "EUR").toUpperCase() || "EUR";
  const today = new Date().toISOString().slice(0, 10);
  if (fromCurrency === baseCurrency) {
    return { baseAmount: roundMoney(amount), baseCurrency, exchangeRate: 1, exchangeRateSource: "base", exchangeRateDate: today };
  }

  try {
    const payload = await bridgeRequest({
      action: "convertCurrency",
      amount,
      fromCurrency,
      toCurrency: baseCurrency,
    }) as BridgePullResponse & { baseAmount?: number; baseCurrency?: string; exchangeRate?: number; exchangeRateSource?: string; exchangeRateDate?: string };
    const rate = Number(payload.exchangeRate || 0);
    const converted = Number(payload.baseAmount);
    if (rate > 0 && Number.isFinite(converted)) {
      return {
        baseAmount: roundMoney(converted),
        baseCurrency: clean(payload.baseCurrency || baseCurrency).toUpperCase() || baseCurrency,
        exchangeRate: rate,
        exchangeRateSource: clean(payload.exchangeRateSource || "bridge"),
        exchangeRateDate: clean(payload.exchangeRateDate || today) || today,
      };
    }
  } catch (_error) {}

  const readers: Array<{ source: string; url: string; read: (payload: any) => number }> = [
    { source: "open.er-api.com", url: `https://open.er-api.com/v6/latest/${encodeURIComponent(fromCurrency)}`, read: (payload) => Number(payload?.rates?.[baseCurrency] || 0) },
    { source: "exchangerate-api.com", url: `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(fromCurrency)}`, read: (payload) => Number(payload?.rates?.[baseCurrency] || 0) },
    { source: "frankfurter.app", url: `https://api.frankfurter.app/latest?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(baseCurrency)}`, read: (payload) => Number(payload?.rates?.[baseCurrency] || 0) },
  ];
  for (const reader of readers) {
    try {
      const response = await fetch(reader.url);
      if (!response.ok) continue;
      const payload = await response.json();
      const rate = reader.read(payload);
      if (!(rate > 0) || !Number.isFinite(rate)) continue;
      return {
        baseAmount: roundMoney(amount * rate),
        baseCurrency,
        exchangeRate: rate,
        exchangeRateSource: reader.source,
        exchangeRateDate: today,
      };
    } catch (_error) {}
  }

  // Never label a 1:1 fallback as the user's base currency. If every provider
  // is unavailable, preserve the original currency explicitly instead of
  // showing a mathematically false EUR conversion.
  return {
    baseAmount: roundMoney(amount),
    baseCurrency: fromCurrency,
    exchangeRate: 1,
    exchangeRateSource: "unavailable",
    exchangeRateDate: today,
  };
}

function rebalanceShareAmounts(rawShares: unknown, nextBaseAmount: number): Record<string, number> {
  const shares = rawShares && typeof rawShares === "object" ? rawShares as Record<string, unknown> : {};
  const entries = Object.entries(shares)
    .map(([key, value]) => [key, Number(value || 0)] as const)
    .filter(([, value]) => Number.isFinite(value) && value >= 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (entries.length === 0 || !(total > 0)) return { me: roundMoney(nextBaseAmount) };
  const result: Record<string, number> = {};
  let assigned = 0;
  entries.forEach(([key, value], index) => {
    const next = index === entries.length - 1
      ? roundMoney(nextBaseAmount - assigned)
      : roundMoney(nextBaseAmount * (value / total));
    result[key] = next;
    assigned = roundMoney(assigned + next);
  });
  return result;
}

async function upsertShareExpenseFromMundely(sync: MundelyExpenseSync): Promise<void> {
  const user = fbAuth.currentUser;
  if (!user) throw new Error("FAINANCE_AUTH_REQUIRED");
  const projectId = clean(sync.targetShareProjectId);
  const activityKey = clean(sync.targetShareActivityKey || sync.targetShareActivityId);
  if (!projectId || !clean(sync.expenseId) || !activityKey) throw new Error("MUNDELY_EXPENSE_PAYLOAD_INVALID");

  const projectRef = doc(fbDb, "shareProjects", projectId);
  const snapshot = await getDoc(projectRef);
  if (!snapshot.exists()) throw new Error("MUNDELY_SHARE_PROJECT_NOT_READY");
  const project = snapshot.data() as Record<string, unknown>;
  if (clean(project.ownerUid) !== user.uid && !((project.memberUids as unknown[]) || []).map(String).includes(user.uid)) {
    throw new Error("MUNDELY_SHARE_PROJECT_ACCESS_DENIED");
  }

  const activities = normalizeShareActivities(Array.isArray(project.activities) ? project.activities as unknown[] : []);
  const existing = activities.find((item) => shareActivityKey(item?.id) === activityKey || clean(item?.mundelyExpenseId) === clean(sync.expenseId));
  const filtered = activities.filter((item) => shareActivityKey(item?.id) !== activityKey && clean(item?.mundelyExpenseId) !== clean(sync.expenseId));
  const deletedActivityIds = new Set(
    (Array.isArray(project.deletedActivityIds) ? project.deletedActivityIds : []).map(shareActivityKey).filter(Boolean)
  );
  if (sync.deleted) deletedActivityIds.add(activityKey);
  else deletedActivityIds.delete(activityKey);
  const categories = Array.isArray(project.categories) ? [...project.categories] as Array<Record<string, unknown>> : [];
  let nextCategories = categories;

  if (!sync.deleted) {
    const amount = Math.round(Number(sync.amount || 0) * 100) / 100;
    if (!(amount > 0)) throw new Error("MUNDELY_EXPENSE_AMOUNT_INVALID");
    const nowIso = new Date().toISOString();
    const category = mundelyCategoryMeta(sync.category, sync.categoryName, sync.categoryIcon, sync.categoryColor);
    const projectBaseCurrency = clean(project.baseCurrency || project.currency || "EUR").toUpperCase() || "EUR";
    const fx = await resolveBridgeBaseAmount(amount, sync.currency, projectBaseCurrency);
    const nextShares = rebalanceShareAmounts(existing?.shares, fx.baseAmount);
    const categoryIndex = categories.findIndex((item) => clean(item?.id) === category.id || clean(item?.mundelyCategoryKey) === category.key);
    if (categoryIndex >= 0) {
      nextCategories = categories.map((item, index) => index === categoryIndex ? {
        ...item,
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        status: "active",
        sourceApp: "mundely",
        sourceEnvironment: "test",
        mundelyCategoryKey: category.key,
        updatedAt: nowIso,
      } : item);
    } else {
      nextCategories = [{
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        status: "active",
        sourceApp: "mundely",
        sourceEnvironment: "test",
        mundelyCategoryKey: category.key,
        createdAt: nowIso,
        updatedAt: nowIso,
      }, ...categories];
    }

    filtered.unshift({
      ...(existing || {}),
      id: existing?.id ?? shareActivityIdValue(activityKey),
      kind: "expense",
      // MUNDELY_52_BASE_AMOUNT
      amount: fx.baseAmount,
      desc: clean(sync.description) || "Spesa viaggio",
      paidBy: clean(existing?.paidBy) || "me",
      date: clean(sync.date) || nowIso.slice(0, 10),
      time: clean(sync.time) || clean(existing?.time) || nowIso.slice(11, 16),
      shares: nextShares,
      splitMode: clean(existing?.splitMode) || "equal",
      sharedWith: Array.isArray(existing?.sharedWith) ? existing?.sharedWith : ["me"],
      category: category.name,
      categoryName: category.name,
      categoryId: category.id,
      shareCategoryId: category.id,
      categoryIcon: category.icon,
      categoryColor: category.color,
      createdAt: clean(existing?.createdAt) || nowIso,
      updatedAt: nowIso,
      sourceApp: clean(sync.origin) === "fainance" ? (clean(existing?.sourceApp) || "fainance") : "mundely",
      sourceEnvironment: "test",
      mundelyTripId: clean(sync.tripId),
      mundelyExpenseId: clean(sync.expenseId),
      mundelyCategory: clean(sync.category),
      mundelyCategoryKey: category.key,
      currency: clean(sync.currency) || clean(existing?.currency) || "EUR",
      originalCurrency: clean(sync.currency) || clean(existing?.originalCurrency) || "EUR",
      originalAmount: amount,
      baseCurrency: fx.baseCurrency,
      baseAmount: fx.baseAmount,
      exchangeRate: fx.exchangeRate,
      exchangeRateSource: fx.exchangeRateSource,
      exchangeRateDate: fx.exchangeRateDate,
      mundelyCurrency: clean(sync.currency) || "EUR",
      bridgeOrigin: clean(sync.origin) === "fainance" ? "fainance" : clean(sync.bridgeOrigin),
      sourceShareActivityKey: activityKey,
      sourceShareActivityId: /^\d+$/.test(activityKey) ? Number(activityKey) : undefined,
    });
  }

  await setDoc(projectRef, {
    activities: filtered,
    categories: nextCategories,
    deletedActivityIds: [...deletedActivityIds],
    updatedAt: new Date().toISOString(),
    updatedAtMs: Date.now(),
    shareRevision: Date.now(),
  }, { merge: true });
}

export async function syncMundelyExpensesToShare(items: MundelyExpenseSync[]): Promise<void> {
  if (!bridgeAvailable() || !fbAuth.currentUser || !Array.isArray(items) || items.length === 0) return;
  for (const sync of items) {
    try {
      await upsertShareExpenseFromMundely(sync);
      await acknowledgeMundelyExpense(sync.id, "completed");
    } catch (error) {
      const code = clean((error as { code?: string; message?: string })?.code || (error as Error)?.message || "MUNDELY_EXPENSE_SYNC_FAILED").slice(0, 120);
      await acknowledgeMundelyExpense(sync.id, "error", code).catch(() => undefined);
    }
  }
}

export async function syncMundelyCategoryCatalogToShare(items: MundelyLinkedTrip[]): Promise<void> {
  const user = fbAuth.currentUser;
  if (!bridgeAvailable() || !user || !Array.isArray(items) || items.length === 0) return;
  for (const linked of items) {
    const projectId = clean(linked.targetShareProjectId);
    if (!projectId) continue;
    const projectRef = doc(fbDb, "shareProjects", projectId);
    const snapshot = await getDoc(projectRef).catch(() => null);
    if (!snapshot || !snapshot.exists()) continue;
    const project = snapshot.data() as Record<string, unknown>;
    if (clean(project.ownerUid) !== user.uid && !((project.memberUids as unknown[]) || []).map(String).includes(user.uid)) continue;

    const source = Array.isArray(linked.categories) && linked.categories.length
      ? linked.categories
      : [
          { key: "food", name: "food", icon: "🍽️", color: "#E67E22" },
          { key: "transport", name: "transport", icon: "🚗", color: "#378ADD" },
          { key: "accommodation", name: "accommodation", icon: "🏨", color: "#8E6CEF" },
          { key: "activities", name: "activities", icon: "🎟️", color: "#00A67E" },
          { key: "shopping", name: "shopping", icon: "🛍️", color: "#D45DB5" },
          { key: "other", name: "other", icon: "📦", color: "#607D8B" },
        ];
    const nowIso = new Date().toISOString();
    const nextCategories = source.map((raw) => {
      const meta = mundelyCategoryMeta(raw?.key, raw?.name, raw?.icon, raw?.color);
      return {
        id: meta.id,
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        status: "active",
        sourceApp: "mundely",
        sourceEnvironment: "test",
        mundelyCategoryKey: meta.key,
        updatedAt: nowIso,
      };
    });
    const existing = Array.isArray(project.categories) ? project.categories as Array<Record<string, unknown>> : [];
    const existingSig = JSON.stringify(existing.map((x) => [clean(x.id), clean(x.name), clean(x.icon), clean(x.color), clean(x.mundelyCategoryKey)]));
    const nextSig = JSON.stringify(nextCategories.map((x) => [x.id, x.name, x.icon, x.color, x.mundelyCategoryKey]));
    const activeExpenseIds = new Set((Array.isArray(linked.activeExpenseIds) ? linked.activeExpenseIds : []).map(clean).filter(Boolean));
    const explicitDeletedKeys = new Set((Array.isArray(linked.deletedShareActivityKeys) ? linked.deletedShareActivityKeys : []).map(clean).filter(Boolean));
    const rawActivities = normalizeShareActivities(Array.isArray(project.activities) ? project.activities as unknown[] : []);
    const removedKeys = new Set<string>();
    const nextActivities = rawActivities.filter((item) => {
      const key = shareActivityKey(item?.id);
      if (key && explicitDeletedKeys.has(key)) {
        removedKeys.add(key);
        return false;
      }
      if (
        clean(item?.sourceApp) === "mundely"
        && clean(item?.mundelyTripId) === clean(linked.tripId)
        && clean(item?.mundelyExpenseId)
        && !activeExpenseIds.has(clean(item?.mundelyExpenseId))
      ) {
        if (key) removedKeys.add(key);
        return false;
      }
      return true;
    });
    const deletedIds = new Set((Array.isArray(project.deletedActivityIds) ? project.deletedActivityIds : []).map(clean).filter(Boolean));
    for (const key of removedKeys) deletedIds.add(key);
    const activitiesChanged = nextActivities.length !== rawActivities.length;
    const categoriesChanged = existingSig !== nextSig;
    if (categoriesChanged || activitiesChanged || removedKeys.size > 0) {
      await setDoc(projectRef, {
        categories: nextCategories,
        activities: nextActivities,
        deletedActivityIds: [...deletedIds],
        updatedAt: nowIso,
        updatedAtMs: Date.now(),
        shareRevision: Date.now()
      }, { merge: true });
    }
  }
}

export async function reconcileFainanceShareExpensesToMundely(items: MundelyLinkedTrip[]): Promise<void> {
  const user = fbAuth.currentUser;
  if (!bridgeAvailable() || !user || !Array.isArray(items) || items.length === 0) return;

  for (const linked of items) {
    const projectId = clean(linked.targetShareProjectId);
    const tripId = clean(linked.tripId);
    const mundelyUid = clean(linked.mundelyUid);
    if (!projectId || !tripId || !mundelyUid) continue;

    const projectRef = doc(fbDb, "shareProjects", projectId);
    const projectSnap = await getDoc(projectRef).catch(() => null);
    if (!projectSnap || !projectSnap.exists()) continue;
    const project = projectSnap.data() as Record<string, unknown>;
    if (clean(project.ownerUid) !== user.uid && !((project.memberUids as unknown[]) || []).map(String).includes(user.uid)) continue;

    const deletedActivityKeys = new Set(
      (Array.isArray(project.deletedActivityIds) ? project.deletedActivityIds : []).map(shareActivityKey).filter(Boolean)
    );
    const rawActivities = Array.isArray(project.activities) ? project.activities as unknown[] : [];
    const normalizedActivities = normalizeShareActivities(rawActivities);
    const activities = normalizedActivities.filter((item) => !deletedActivityKeys.has(shareActivityKey(item?.id)));
    if (activities.length !== rawActivities.length) {
      await setDoc(projectRef, {
        activities,
        deletedActivityIds: [...deletedActivityKeys],
        updatedAt: new Date().toISOString(),
        updatedAtMs: Date.now(),
        shareRevision: Date.now()
      }, { merge: true });
    }

    const categories = Array.isArray(project.categories) ? project.categories as Array<Record<string, unknown>> : [];
    const categoryById = new Map(categories.map((item) => [clean(item?.id), item] as const));
    const expenses = activities
      .filter((item) => clean(item?.kind) === "expense")
      .map((item) => {
        const key = shareActivityKey(item?.id);
        const categoryId = clean(item?.categoryId || item?.shareCategoryId);
        const category = categoryById.get(categoryId);
        return {
          activityKey: key,
          activityId: /^\d+$/.test(key) ? Number(key) : key,
          mundelyExpenseId: clean(item?.mundelyExpenseId),
          amount: Number(item?.originalAmount ?? item?.amount ?? 0),
          description: clean(item?.desc || item?.description) || "Spesa Share",
          category: clean(item?.mundelyCategory || category?.mundelyCategoryKey || item?.categoryName || item?.category || category?.name || "other"),
          categoryName: clean(category?.name || item?.categoryName || item?.category),
          categoryIcon: clean(category?.icon || item?.categoryIcon),
          categoryColor: clean(category?.color || item?.categoryColor),
          currency: clean(item?.currency || item?.originalCurrency || item?.mundelyCurrency || "EUR"),
          date: clean(item?.date),
          time: clean(item?.time),
        };
      })
      .filter((item) => item.activityKey && item.amount > 0);

    const result = await bridgeRequest({
      action: "reconcileShareExpenses",
      mundelyUid,
      tripId,
      targetShareProjectId: projectId,
      deletedActivityKeys: [...deletedActivityKeys],
      expenses,
    });

    const removeKeys = new Set((Array.isArray(result.removeShareActivityKeys) ? result.removeShareActivityKeys : []).map(clean).filter(Boolean));
    if (removeKeys.size) {
      const cleaned = activities.filter((item) => !removeKeys.has(shareActivityKey(item?.id)));
      for (const key of removeKeys) deletedActivityKeys.add(key);
      if (cleaned.length !== activities.length || removeKeys.size) {
        await setDoc(projectRef, {
          activities: cleaned,
          deletedActivityIds: [...deletedActivityKeys],
          updatedAt: new Date().toISOString(),
          updatedAtMs: Date.now(),
          shareRevision: Date.now()
        }, { merge: true });
      }
    }
  }
}


export async function syncMundelyBridgeNow(): Promise<void> {
  if (!bridgeAvailable() || !fbAuth.currentUser) return;
  const payload = await pullMundelyBridge();
  await syncMundelyTripsToShare(payload.tripSyncs);
  await syncMundelyCategoryCatalogToShare(payload.linkedTrips);
  await syncMundelyExpensesToShare(payload.expenseSyncs);
  await reconcileFainanceShareExpensesToMundely(payload.linkedTrips);
}

export function isMundelyBridgeEnabled(): boolean {
  return bridgeAvailable();
}
