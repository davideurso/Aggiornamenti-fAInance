import type { User } from "firebase/auth";
import { measureStartup } from '../utils/startupDiagnostics';
import { doc, getDoc } from "firebase/firestore";
import { fbDb } from "../firebase/client";
import { currentAuthUser, watchAuthState } from "./authService";
import { ensureBaseUserProfile, ensureDefaultUsernameForExistingUser, ensureUsernameLoginAlias, loadUserProfile, mergeUserProfile, splitDisplayName } from "../profile/profileService";
import { fainanceResolveLegalAcceptance } from "./accountIdentity";
import { fainanceExpandAccountCloudDataV5 } from "../data/accountCloudCodec";
import { fainancePromiseTimeout } from "../utils/appRuntime";

export interface FainanceSessionUserData {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  usernameLower: string;
  newsletterConsent: boolean;
  newsletterUpdatedAt: string;
  emailVerificationPolicyVersion: number;
  emailVerificationRequired: boolean;
  deletionStatus: string;
  deletionRequestedAt: string;
  deletionScheduledAt: string;
  profilePhotoDataUrl: string;
  phone: string;
  phonePrefix: string;
  birthDate: string;
  gender: string;
  nationality: string;
  country: string;
  province: string;
  city: string;
  address: string;
  jobType: string;
  appUseReason: string;
  legalAcceptanceV2: any;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  metaEventsConsent: boolean;
  legalAcceptanceDate: string;
}

export function buildSessionUserData(user: User, profile: any = {}): FainanceSessionUserData {
  const legal: any = fainanceResolveLegalAcceptance(profile, profile);
  const split = splitDisplayName(profile.name || user.displayName || "Utente");
  const firstName = String(profile.firstName || split.firstName || "");
  const lastName = String(profile.lastName || split.lastName || "");
  return {
    id: user.uid,
    email: String(user.email || profile.email || "").toLowerCase(),
    name: [firstName,lastName].filter(Boolean).join(" ") || profile.name || user.displayName || "Utente",
    firstName,
    lastName,
    username: String(profile.username || ""),
    usernameLower: String(profile.usernameLower || ""),
    newsletterConsent: !!profile.newsletterConsent,
    newsletterUpdatedAt: String(profile.newsletterUpdatedAt || ""),
    emailVerificationPolicyVersion: Number(profile.emailVerificationPolicyVersion || 0),
    emailVerificationRequired: Number(profile.emailVerificationPolicyVersion || 0) >= 1 && profile.emailVerificationRequired === true,
    deletionStatus: String(profile.deletionStatus || "active"),
    deletionRequestedAt: String(profile.deletionRequestedAt || ""),
    deletionScheduledAt: String(profile.deletionScheduledAt || ""),
    profilePhotoDataUrl: String(profile.profilePhotoDataUrl || ""),
    phone: profile.phone || "",
    phonePrefix: profile.phonePrefix || "+39",
    birthDate: profile.birthDate || "",
    gender: profile.gender || "",
    nationality: profile.nationality || "",
    country: profile.country || "",
    province: profile.province || "",
    city: profile.city || "",
    address: profile.address || "",
    jobType: profile.jobType || "",
    appUseReason: profile.appUseReason || "",
    legalAcceptanceV2: legal,
    termsAccepted: !!legal,
    privacyAccepted: !!legal,
    metaEventsConsent: legal ? !!legal.metaEventsConsent : !!profile.metaEventsConsent,
    legalAcceptanceDate: legal ? String(legal.acceptedAt || "") : String(profile.legalAcceptanceDate || ""),
  };
}

export async function resolveAccountSession(user: User): Promise<FainanceSessionUserData> {
  try {
    const [profileResult, accountResult]: any[] = await Promise.all([
      measureStartup('profile', fainancePromiseTimeout(loadUserProfile(user.uid),7000,"Timeout profilo utente.").catch(error => { throw sessionReadFailure('S1',error); })),
      measureStartup('account', fainancePromiseTimeout(getDoc(doc(fbDb, "userData", user.uid)),9000,"Timeout dati account.").catch(error => { throw sessionReadFailure('S2',error); })),
    ]);
    let profile: any = profileResult;
    const accountData = accountResult?.exists?.() ? await fainanceExpandAccountCloudDataV5(accountResult.data() || {}) : {};
    const legal: any = fainanceResolveLegalAcceptance(profile, accountData);
    const split = splitDisplayName(profile.name || user.displayName || "Utente");
    const firstName = String(profile.firstName || split.firstName || "");
    const lastName = String(profile.lastName || split.lastName || "");
    const displayName = [firstName,lastName].filter(Boolean).join(" ") || profile.name || user.displayName || "Utente";
    const normalizedEmail = String(user.email || profile.email || "").toLowerCase();

    if (!profile.username) {
      try {
        const generated = await fainancePromiseTimeout(ensureDefaultUsernameForExistingUser(user.uid,firstName,lastName,displayName,normalizedEmail),7000,"Timeout username automatico.");
        profile = { ...profile, username: generated.username, usernameLower: generated.usernameLower };
      } catch (_usernameError) {}
    }

    profile = { ...profile, firstName, lastName, name: displayName };
    if (profile.username && normalizedEmail) {
      void fainancePromiseTimeout(
        ensureUsernameLoginAlias(user.uid,String(profile.username),normalizedEmail),
        5000,
        "Timeout alias username.",
      ).catch(() => undefined);
    }
    if (legal) {
      profile = { ...profile, legalAcceptanceV2: legal, termsAccepted: true, privacyAccepted: true, metaEventsConsent: !!legal.metaEventsConsent, legalAcceptanceDate: String(legal.acceptedAt || "") };
    }

    const userData = buildSessionUserData(user, profile);
    const profileUpdate: any = { name: displayName, firstName, lastName, email: normalizedEmail, updatedAt: new Date().toISOString() };
    if (typeof profile.emailVerificationPolicyVersion === "undefined") {
      // Explicit legacy migration: existing accounts are recorded as policy v0 and are never blocked.
      profile.emailVerificationPolicyVersion = 0;
      profile.emailVerificationRequired = false;
      profileUpdate.emailVerificationPolicyVersion = 0;
      profileUpdate.emailVerificationRequired = false;
      profileUpdate.emailVerificationMigratedAt = new Date().toISOString();
    } else {
      profileUpdate.emailVerificationPolicyVersion = Number(profile.emailVerificationPolicyVersion || 0);
      profileUpdate.emailVerificationRequired = Number(profile.emailVerificationPolicyVersion || 0) >= 1 && profile.emailVerificationRequired === true;
    }
    if (profile.deletionStatus) Object.assign(profileUpdate,{deletionStatus:String(profile.deletionStatus||"active"),deletionRequestedAt:String(profile.deletionRequestedAt||""),deletionScheduledAt:String(profile.deletionScheduledAt||"")});
    if (profile.username) Object.assign(profileUpdate,{username:String(profile.username||""),usernameLower:String(profile.usernameLower||"")});
    if (typeof profile.newsletterConsent !== "undefined") Object.assign(profileUpdate,{newsletterConsent:!!profile.newsletterConsent,newsletterUpdatedAt:String(profile.newsletterUpdatedAt||"")});
    if (profile.profilePhotoDataUrl) profileUpdate.profilePhotoDataUrl = String(profile.profilePhotoDataUrl);
    if (legal) Object.assign(profileUpdate,{legalAcceptanceV2:legal,termsAccepted:true,privacyAccepted:true,metaEventsConsent:!!legal.metaEventsConsent,legalAcceptanceDate:String(legal.acceptedAt||"")});
    mergeUserProfile(user.uid, profileUpdate).catch(() => undefined);
    return userData;
  } catch (error) {
    // An unavailable read is not proof that a profile is missing.
    // Never create or backfill profile fields from an unreadable account.
    throw error;
  }
}

function sessionReadFailure(stage: 'S1' | 'S2', error: any): Error {
  const reason = String(error?.message || '').startsWith('Timeout') ? 'T' :
    String(error?.code || '').replace('firestore/','') === 'permission-denied' ? 'P' :
    String(error?.code || '').replace('firestore/','') === 'unavailable' ? 'N' : 'E';
  return new Error(stage + '-' + reason);
}

export function watchResolvedAccountSession(onUser: (user: User, data: FainanceSessionUserData) => void,onSignedOut: () => void,onError?: (error: unknown) => void): () => void {
  let cancelled = false;
  let resolved = false;
  let unsubscribe: (() => void) | null = null;
  async function publishUser(user: User) { try { const data = await resolveAccountSession(user); if (!cancelled) onUser(user, data); } catch (error) { if (!cancelled) onError?.(error); } }
  function resolveCurrentOrSignedOut() { const current = currentAuthUser(); if (current?.uid) void publishUser(current); else if (!cancelled) onSignedOut(); }
  const timer = setTimeout(() => { if (cancelled || resolved) return; resolved = true; resolveCurrentOrSignedOut(); }, 7000);
  try {
    unsubscribe = watchAuthState((user) => { if (cancelled) return; resolved = true; clearTimeout(timer); if (user?.uid) void publishUser(user); else onSignedOut(); },(error: any) => { console.error("Auth state error", error?.code || "unknown"); if (cancelled) return; resolved = true; clearTimeout(timer); resolveCurrentOrSignedOut(); });
  } catch (error: any) {
    console.error("Auth listener setup error", error?.code || "unknown");
    clearTimeout(timer);
    resolveCurrentOrSignedOut();
  }
  return () => { cancelled = true; clearTimeout(timer); try { unsubscribe?.(); } catch { /* best effort */ } };
}
