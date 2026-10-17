// Keep the call synchronous with the tap: native pickers require user activation.
export function openMovementDatePicker(event: { currentTarget: HTMLInputElement; preventDefault: () => void }) {
  const input = event.currentTarget;
  if (typeof input.showPicker !== 'function') return;
  try {
    input.showPicker();
    // Avoid a second native default action reopening/closing the same picker.
    event.preventDefault();
  } catch {
    // Older/restricted WebViews retain their normal input activation.
  }
}
