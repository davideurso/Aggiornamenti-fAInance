import { Capacitor } from '@capacitor/core';
import { FainanceWidgetBridge, type FainanceWidgetPayload } from '../native/FainanceWidgetBridge';

export async function syncIosWidgets(payload: FainanceWidgetPayload): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;

  await FainanceWidgetBridge.saveAll({
    payload: {
      updatedAt: new Date().toISOString(),
      locale: payload.locale ?? 'it-IT',
      currencySymbol: payload.currencySymbol ?? '€',
      colors: {
        primaryHex: payload.colors?.primaryHex ?? '#315CFF',
        secondaryHex: payload.colors?.secondaryHex ?? '#8C4DFF',
        incomeHex: payload.colors?.incomeHex ?? '#18A957',
        expenseHex: payload.colors?.expenseHex ?? '#E44B4B',
        textHex: payload.colors?.textHex ?? '#FFFFFF',
        cardHex: payload.colors?.cardHex ?? '#12172A',
      },
      quickAdd: payload.quickAdd ?? { sampleExpenseLabel: '+ Spesa', sampleIncomeLabel: '+ Entrata' },
      fidelity: payload.fidelity,
      shopping: payload.shopping,
      note: payload.note,
      goal: payload.goal,
      share: payload.share,
      debts: payload.debts,
    },
  });
}

export async function reloadIosWidgets(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;
  await FainanceWidgetBridge.reload();
}
