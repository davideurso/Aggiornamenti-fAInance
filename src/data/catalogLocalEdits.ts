// Durable local user intent; the existing account writer remains the only cloud writer.
export const catalogEditKeys = ['cats_v10','expense_groups_v1','meth_v10','method_groups_v1','income_groups_v1','custom_income_types_v1','income_type_overrides_v1'];
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])]));
  return value;
}
export function catalogEditEqual(a: any,b: any) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
export function readCatalogEdits(storage: any, journalKey: string): any {
  const journal = JSON.parse(storage.getItem(journalKey) || '{}');
  if (!journal || typeof journal !== 'object' || Array.isArray(journal)) throw new Error('CATALOG_EDIT_JOURNAL_INVALID');
  return Object.fromEntries(catalogEditKeys.filter(key => journal[key] && Object.prototype.hasOwnProperty.call(journal[key],'value')).map(key => [key,journal[key]]));
}
export function persistCatalogEdit(storage: any,journalKey: string,storageKey: string,key: string,value: any,now: number) {
  if (!catalogEditKeys.includes(key)) throw new Error('CATALOG_EDIT_KEY_INVALID');
  const journal = readCatalogEdits(storage,journalKey);
  journal[key] = {value,updatedAtMs:now};
  // Journal first: a process exit between these writes can still recover the new value.
  storage.setItem(journalKey,JSON.stringify(journal));
  storage.setItem(storageKey,JSON.stringify(value));
}
export function protectCatalogEdit(storage: any,journalKey: string,key: string,value: any) {
  const entry = readCatalogEdits(storage,journalKey)[key];
  return entry ? entry.value : value;
}
export function confirmCatalogEdits(storage: any,journalKey: string,catalog: any) {
  if (Number(catalog?.schemaVersion) !== 4) return;
  const sections: any = {cats_v10:['expenseCatalog','categories'],expense_groups_v1:['expenseCatalog','groups'],meth_v10:['paymentCatalog','methods'],method_groups_v1:['paymentCatalog','groups'],income_groups_v1:['incomeCatalog','groups'],custom_income_types_v1:['incomeCatalog','customTypes'],income_type_overrides_v1:['incomeCatalog','overrides']};
  const journal = readCatalogEdits(storage,journalKey);
  let changed = false;
  Object.keys(journal).forEach(key => {
    const [section,field] = sections[key], data = catalog[section]?.data;
    if (data && Object.prototype.hasOwnProperty.call(data,field) && catalogEditEqual(data[field],journal[key].value)) { delete journal[key]; changed = true; }
  });
  if (changed) { if (Object.keys(journal).length) storage.setItem(journalKey,JSON.stringify(journal)); else storage.removeItem(journalKey); }
}

// Older APKs persisted a pending flag and per-catalog timestamps, but no edit
// journal. Preserve that intent only against a confirmed older server section.
export function migrateLegacyCatalogEdits(storage: any,journalKey: string,storageKey: (key:string)=>string,catalog: any,pending: boolean,localStamp:(key:string)=>number) {
  if (!pending || Number(catalog?.schemaVersion)!==4) return 0;
  const sections:any[]=[
    ['expenseCatalog',['expense_catalog_v2','cats'],[['cats_v10','categories'],['expense_groups_v1','groups']]],
    ['paymentCatalog',['payment_catalog_v2','methods'],[['meth_v10','methods'],['method_groups_v1','groups']]],
    ['incomeCatalog',['income_catalog_v2','income_catalog_v1'],[['income_groups_v1','groups'],['custom_income_types_v1','customTypes'],['income_type_overrides_v1','overrides']]]
  ];
  const journal=readCatalogEdits(storage,journalKey);let migrated=0;
  for(const [name,clocks,fields] of sections){
    const section=catalog[name],remote=Number(section?.updatedAtMs||0),local=Math.max(...clocks.map(localStamp));
    if(!section?.data || !Number.isFinite(remote)||remote<=0||!Number.isFinite(local)||local<=remote)continue;
    for(const [key,field] of fields){
      if(journal[key]||!Object.prototype.hasOwnProperty.call(section.data,field))continue;
      const raw=storage.getItem(storageKey(key));if(raw===null)continue;
      let value:any;try{value=JSON.parse(raw)}catch{continue}
      const valid=key==='income_type_overrides_v1'?value&&typeof value==='object'&&!Array.isArray(value):Array.isArray(value)&&value.every(item=>item&&typeof item==='object'&&item.id!==undefined&&item.id!==null);
      if(!valid||catalogEditEqual(value,section.data[field]))continue;
      persistCatalogEdit(storage,journalKey,storageKey(key),key,value,local);migrated++;
    }
  }
  return migrated;
}
