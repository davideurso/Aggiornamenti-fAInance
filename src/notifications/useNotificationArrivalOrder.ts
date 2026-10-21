import {useEffect,useMemo} from 'react';
import {useApp} from '../core';
import {recordNotificationArrivals,sortNotificationsNewestFirst} from './notificationArrivalOrder.mjs';
import type {AppNotificationRecord} from './appNotifications';
export function useNotificationArrivalOrder(items:AppNotificationRecord[],userId:string):AppNotificationRecord[]{
 const ctx:any=useApp(),stored=ctx.notifPrefs?.notificationArrivalsV1;
 const signature=JSON.stringify(items.map(item=>[item.id,item.virtual,item.createdAtMs,item.createdAt]));
 const observed=useMemo(()=>({at:Date.now(),arrivals:userId?recordNotificationArrivals(stored,items,Date.now()):stored||{}}),[userId,signature,stored]);
 useEffect(()=>{
  if(!userId||observed.arrivals===stored||typeof ctx.setNotifPrefs!=='function')return;
  ctx.setNotifPrefs((previous:any)=>{
   const arrivals=recordNotificationArrivals(previous?.notificationArrivalsV1,items,observed.at);
   return arrivals===previous?.notificationArrivalsV1?previous:{...previous,notificationArrivalsV1:arrivals};
  });
 },[userId,signature,observed,stored,ctx.setNotifPrefs]);
 return useMemo(()=>sortNotificationsNewestFirst(items,observed.arrivals),[items,observed.arrivals]);
}