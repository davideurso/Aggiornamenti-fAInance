// Shared translation fallback used by large legacy modules during decomposition.
// It intentionally preserves the exact previous behavior.
export function FAI_TRANSLATE(value: any) {
  try {
    const fn = typeof window !== "undefined" ? (window as any).fainanceTranslateUi : null;
    if (fn) return fn(value);
  } catch (_e) {}
  return value;
}

export function L(value: any) {
  return FAI_TRANSLATE(value);
}

export function PL(value: any) {
  return FAI_TRANSLATE(value);
}
