import {incomeReceiptText} from '../i18n/incomeReceiptTranslations';
// Legacy income.methodId was populated by bulk entry even without a location picker.
// Only an explicit receivedInMethodId identifies where an income was received.
export function incomeReceiptFields(row:any,methods:any[]=[]){
 const raw=row?.receivedInMethodId,id=raw===undefined||raw===null?"":String(raw).trim();
 if(!id)return {receivedInMethodId:"",receivedInMethodName:""};
 const method=methods.find(item=>String(item.id)===id);
 return {receivedInMethodId:id,receivedInMethodName:String(method?.name||row?.receivedInMethodName||"")};
}
export function incomeReceiptLabel(row:any,methods:any[]=[],lang="it"){
 const value=incomeReceiptFields(row,methods);
 return value.receivedInMethodId?(value.receivedInMethodName||incomeReceiptText(lang,'unavailable')):incomeReceiptText(lang,'unspecified');
}
export function incomeReceiptExportName(row:any,methods:any[]=[]){return incomeReceiptFields(row,methods).receivedInMethodName;}
