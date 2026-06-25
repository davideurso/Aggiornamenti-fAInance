import { registerPlugin } from '@capacitor/core';

export type DebtCreditWidgetItem = {
  name: string;
  amount: number;
  type: 'debt' | 'credit';
};

export type FainanceWidgetPayload = {
  updatedAt?: string;
  locale?: string;
  currencySymbol?: string;
  colors?: {
    primaryHex?: string;
    secondaryHex?: string;
    incomeHex?: string;
    expenseHex?: string;
    textHex?: string;
    cardHex?: string;
  };
  quickAdd?: {
    sampleExpenseLabel?: string;
    sampleIncomeLabel?: string;
  };
  fidelity?: {
    title?: string;
    cardName?: string;
    barcode?: string;
    qrCode?: string;
    backgroundHex?: string;
  };
  shopping?: {
    title?: string;
    listName?: string;
    remainingCount?: number;
    completedCount?: number;
    items?: string[];
  };
  note?: {
    title?: string;
    noteTitle?: string;
    body?: string;
  };
  goal?: {
    title?: string;
    goalName?: string;
    currentAmount?: number;
    targetAmount?: number;
    currencySymbol?: string;
  };
  share?: {
    title?: string;
    projectName?: string;
    myBalance?: number;
    currencySymbol?: string;
    participants?: string[];
  };
  debts?: {
    title?: string;
    debtsTotal?: number;
    creditsTotal?: number;
    currencySymbol?: string;
    items?: DebtCreditWidgetItem[];
  };
};

export interface FainanceWidgetBridgePlugin {
  saveAll(options: { payload: FainanceWidgetPayload }): Promise<{ saved: boolean }>;
  reload(): Promise<{ reloaded: boolean }>;
  clear(): Promise<{ cleared: boolean }>;
}

export const FainanceWidgetBridge = registerPlugin<FainanceWidgetBridgePlugin>('FainanceWidgetBridge');
