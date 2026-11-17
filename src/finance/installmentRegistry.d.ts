export interface InstallmentAllocation {number:number; date:string; amount:number}
export interface InstallmentPlan {
  id:string;
  movement:Record<string,any>;
  type:'expense'|'income';
  description:string;
  categoryName:string|null;
  paymentMethod:string|null;
  incomeType:string|null;
  excludedFromTotals:boolean;
  totalAmount:number;
  currency:string;
  originalCurrency:string;
  originalAmount:number|string|null;
  count:number;
  direction:'forward'|'backward';
  minorUnitDigits:number;
  actualDate:string;
  startDate:string;
  endDate:string;
  installments:InstallmentAllocation[];
}
export interface InstallmentCoverage {
  sourceCount:number; installmentSourceCount:number; invalidCount:number; duplicateCount:number;
  inactiveCount:number; legacyIdCount:number; conflictCount:number; omittedCount:number;
}
export type InstallmentRegistryRecord = Omit<InstallmentPlan,'installments'> & {
  annualAmount:number; annualInstallmentCount:number; annualInstallments:InstallmentAllocation[];
  monthlyAmounts:number[];
};
export interface InstallmentRegistrySummary {
  recordCount:number; countedRecordCount:number; excludedRecordCount:number;
  totalAmount:number; countedTotalAmount:number; excludedTotalAmount:number;
  annualAmount:number; countedAnnualAmount:number; excludedAnnualAmount:number;
  installmentCount:number; monthlyAmounts:number[]; countedMonthlyAmounts:number[]; excludedMonthlyAmounts:number[];
}
export interface InstallmentRegistryReady {
  schema:1; status:'LOADED_DATA'; year:number; currency:string;
  period:{start:string; end:string; basis:'calendar_year'};
  records:InstallmentRegistryRecord[]; availableYears:number[];
  summary:InstallmentRegistrySummary;
  coverage:InstallmentCoverage & {validPlanCount:number; relevantRecordCount:number; basis:'active_loaded_expenses';
    includesExcluded:true; accountCompletenessCertified:false};
  basis:'ACCOUNTING_ALLOCATION_NOT_BANK_PAYMENTS';
}
export interface InstallmentRegistryUnavailable {
  status:'N_D'; reason:string; year?:number; currency?:string;
  period?:{start:string;end:string;basis:'calendar_year'};
  records:InstallmentRegistryRecord[]; availableYears:number[];
}
export function collectInstallmentPlans(movements:any[],options?:{
  type?:'expense'|'income';currency?:string;categories?:any[];methods?:any[];incomeTypes?:any[];
  exclude?:(row:any)=>boolean;
}):{plans:InstallmentPlan[];coverage:InstallmentCoverage};
export function buildInstallmentRegistry(options?:{
  expenses?:any[];year?:number|string;currency?:string;categories?:any[];methods?:any[];
  excludeExpense?:(row:any)=>boolean;
}):InstallmentRegistryReady|InstallmentRegistryUnavailable;
export function filterInstallmentRegistryRecords(registry:{records:InstallmentRegistryRecord[]},query?:string):InstallmentRegistryRecord[];
export function sumInstallmentAmounts(rows:any[],field?:string):number;
