// A widget request survives account loading and the lock screen. Repeated
// deliveries of the same launch coalesce until it can be safely opened.
export function createPendingVoiceLaunch(options: {
  isReady: () => boolean;
  open: () => void;
  schedule: (callback: () => void) => number;
  cancel: (handle: number) => void;
}) {
  let pending = false;
  let frame: number | null = null;
  function notify() {
    if (!pending || frame !== null) return;
    frame = options.schedule(() => {
      frame = null;
      if (!pending || !options.isReady()) return;
      pending = false;
      options.open();
    });
  }
  return {
    request() { pending = true; notify(); },
    notify,
    dispose() {
      pending = false;
      if (frame !== null) options.cancel(frame);
      frame = null;
    },
  };
}
