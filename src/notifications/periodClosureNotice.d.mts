export function periodClosureNoticeId(periodKey: string, currency: string): string;
export function periodClosureNoticeText(lang: string, key: "settingTitle" | "settingDescription" | "open"): string;
export function periodClosureNoticeEnabled(preferences?: Record<string, any>): boolean;
export function periodClosureNoticeVisible(preferences: Record<string, any> | null | undefined, id: string): boolean;
export function periodClosureNoticeRead(preferences: Record<string, any> | null | undefined, id: string): boolean;
export function updatePeriodClosureNotice(preferences: Record<string, any> | null | undefined, id: string, action: "read" | "dismiss"): Record<string, any>;
