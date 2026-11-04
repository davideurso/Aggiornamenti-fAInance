// Post-commit integration. Business writes and their acknowledgements stay unchanged.
// The first integration is local-only; no production transport is enabled here.
import { firebaseApp, fbAuth } from '../firebase/client';
import {getFunctions, httpsCallable} from 'firebase/functions';
import {pendingGrowthCreations,acknowledgeGrowthCreations,growthCreationCaptureComplete} from './growthCreationIntents';
type Domain = 'MOVEMENTS' | 'FUNCTIONS';
type Reason = 'ORDINARY' | 'REPLACEMENT' | 'MIGRATION' | 'SNAPSHOT';
type Request = { uid: string; domains: Domain[]; reasons: Reason[] };
let publisher: ((request: Request) => Promise<unknown>) | null = firebaseApp.options.projectId === 'fainance-test-20260823195207'
 ? async request => {
   const response = await httpsCallable(getFunctions(firebaseApp,'europe-west1'),'fainanceGrowthMetricsTest')({operation:'refresh',creationIntents:pendingGrowthCreations(request.uid),creationCaptureComplete:growthCreationCaptureComplete(request.uid)});
   const value = response.data as any;
   if(value?.available !== true || value.testOnly !== true || value.numericExportAllowed !== false) throw new Error('METRICS_CHECK_NOT_CONFIRMED');
   acknowledgeGrowthCreations(request.uid,Array.isArray(value.acknowledgedCreationNonces)?value.acknowledgedCreationNonces:[]);
   if(value.creationQualification?.status==='N_D') throw new Error('METRICS_CREATIONS_NOT_CONFIRMED');
   // Test-only technical receipt. No identifiers, financial values or source payloads.
   console.info('FAINANCE_GROWTH_TEST_POST_COMMIT_CHECK_COMPLETED', request.domains.join(','));
   return response;
 }
 : null;
const queues = new Map<string, { domains: Set<Domain>; reasons: Set<Reason>; promise: Promise<void> | null }>();
let lastError: string | null = null;
// A local skip hint only: counts and qualification always remain server-side.
// In-memory inputs are never logged, persisted or transmitted by this filter.
const attemptedFunctionInputs = new Map<string,string>();
function functionInputs(snapshot: unknown): string {
 const raw = snapshot as any;
 const value = JSON.parse(JSON.stringify({baseCurrency:raw?.baseCurrency,currency:raw?.currency,
  financeEvolution:{budget:raw?.financeEvolution?.budget,rules:raw?.financeEvolution?.rules},
  goals:raw?.goals,alerts:raw?.alerts,shareProjects:raw?.shareProjects}));
 const identities = (rows:any):any => Array.isArray(rows)
  ? {kind:'array',items:rows.map(row=>row && typeof row==='object' && !Array.isArray(row)
    ? {kind:'record',id:row.id} : {kind:row===null?'null':Array.isArray(row)?'array':typeof row})}
  : {kind:rows===null?'null':typeof rows};
 const shareIdentities=(rows:any):any=>Array.isArray(rows)?{kind:'array',items:rows.map(row=>row&&typeof row==='object'&&!Array.isArray(row)?{kind:'record',id:row.id,ownerUid:row.ownerUid}:{kind:row===null?'null':Array.isArray(row)?'array':typeof row})}:identities(rows);
 const overrides=value?.financeEvolution?.budget?.overrides;
 const input = {baseCurrency:value?.baseCurrency,currency:value?.currency,
  budgetVersions:identities(value?.financeEvolution?.budget?.standardVersions),
  budgetOverrides:overrides && typeof overrides==='object' && !Array.isArray(overrides)
    ? {kind:'object',keys:Object.keys(overrides).sort()} : {kind:overrides===null?'null':typeof overrides},
  rules:identities(value?.financeEvolution?.rules),goals:identities(value?.goals),
  alerts:identities(value?.alerts),shareProjects:shareIdentities(value?.shareProjects)};
 const order = (v:any):any => Array.isArray(v) ? v.map(order).sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b))) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,order(v[k])])) : v;
 return JSON.stringify(order(JSON.parse(JSON.stringify(input))));
}
function demoOnly() { if (firebaseApp.options.projectId !== 'demo-fainance-shared-metrics') throw new Error('LOCAL_METRICS_TEST_ONLY'); }
export function bindLocalGrowthMetricsForTest(value: (request: Request) => Promise<unknown>) {
  demoOnly(); if (publisher) throw new Error('METRICS_TRANSPORT_ALREADY_BOUND'); publisher = value;
}
export function notifyGrowthSourceCommitted(uid: string, domain: Domain, reason: Reason, financialSnapshot?: unknown): void {
  if (!publisher || !uid || fbAuth.currentUser?.uid !== uid) return;
  if(domain === 'FUNCTIONS' && financialSnapshot !== undefined){
    try {const signature = functionInputs(financialSnapshot);
      if(attemptedFunctionInputs.get(uid) === signature) return;
      // Keep an unsuccessful attempt too: identical UI saves are not retries.
      attemptedFunctionInputs.set(uid,signature);
    } catch {lastError='METRICS_INPUT_NOT_QUALIFIED';return;}
  }
  const q = queues.get(uid) || { domains: new Set<Domain>(), reasons: new Set<Reason>(), promise: null };
  q.domains.add(domain); q.reasons.add(reason); queues.set(uid, q);
  if (q.promise) return;
  q.promise = Promise.resolve().then(async () => {
    while (q.domains.size && fbAuth.currentUser?.uid === uid) {
      const request = { uid, domains: [...q.domains].sort(), reasons: [...q.reasons].sort() };
      q.domains.clear(); q.reasons.clear();
      try { await publisher!(request); lastError = null; }
      catch { lastError = 'METRICS_REFRESH_NOT_CONFIRMED'; if(firebaseApp.options.projectId === 'fainance-test-20260823195207') console.warn('FAINANCE_GROWTH_TEST_POST_COMMIT_CHECK_UNCONFIRMED'); q.domains.clear(); q.reasons.clear(); break; }
    }
  }).finally(() => { q.promise = null; if (!q.domains.size) queues.delete(uid); });
}
export async function drainGrowthMetricsForTest(uid: string): Promise<{ lastError: string | null }> {
  demoOnly(); while (queues.get(uid)?.promise) await queues.get(uid)!.promise;
  return { lastError };
}
