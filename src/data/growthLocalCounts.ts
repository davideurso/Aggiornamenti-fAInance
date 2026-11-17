// Count-only observation of this device's merged local state. Never a population total.
// No IDs, descriptions, amounts, currencies or financial contents leave this function.
export const GROWTH_COUNT_KEYS = ['expenseCount','incomeCount','budgetVersions','budgetOverrides','goals','rules','alerts','shareProjects'] as const;
type Key = typeof GROWTH_COUNT_KEYS[number];
const identity=(v:unknown):string|null=>typeof v==='string'&&v.trim()&&v.length<=256?v:typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=Number.MAX_SAFE_INTEGER?String(v):null;
function count(rows:unknown,owner?:string):number|null {
 if(!Array.isArray(rows))return null;
 const seen=new Set<string>();let total=0;
 for(const row of rows){
  if(!row||typeof row!=='object'||Array.isArray(row))return null;
  const key=identity(row.id);if(key===null||seen.has(key))return null;seen.add(key);
  if(owner!==undefined){if(typeof row.ownerUid!=='string'||!row.ownerUid)return null;if(row.ownerUid!==owner)continue;}
  if(row.deleted===true||row.deletedAt!=null)continue;
  total++;
 }
 return total;
}
export function growthLocalCounts(state:any,options:{projectId:string;owner:string;hydrated:boolean;movementReady:boolean;observedAt?:string}){
 if(!['fainance-a7794','fainance-test-20260823195207'].includes(options.projectId)||!options.owner)return null;
 const at=options.observedAt||new Date().toISOString();
 if(!Number.isFinite(Date.parse(at)))return null;
 const overrides=state?.financeEvolution?.budget?.overrides;
 const values:Record<Key,number|null>={
  expenseCount:options.movementReady?count(state?.expenses):null,
  incomeCount:options.movementReady?count(state?.incomes):null,
  budgetVersions:count(state?.financeEvolution?.budget?.standardVersions),
  budgetOverrides:overrides&&typeof overrides==='object'&&!Array.isArray(overrides)?Object.keys(overrides).length:null,
  goals:count(state?.goals),rules:count(state?.financeEvolution?.rules),alerts:count(state?.alerts),shareProjects:count(state?.shareProjects,options.owner)
 };
 if(!options.hydrated)for(const k of GROWTH_COUNT_KEYS)values[k]=null;
 return {schema:'fainance-local-counts-v1',environment:options.projectId==='fainance-a7794'?'production':'test',
  observedAt:at,values,source:'MERGED_LOCAL_STATE',authority:'CLIENT_OBSERVED',
  stockOnly:true,allDevicesVerified:false,wholeAppPopulationQualified:false,numericExportAllowed:false};
}
