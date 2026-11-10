// Reads may time out without discarding an SDK write still awaiting confirmation.
// Do not use this helper to abandon mutations and unlock a data-changing UI.
export function readWithDeadline<T>(operation: Promise<T>, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = Object.assign(new Error('SYNC_V2_READ_TIMEOUT'), { code: 'deadline-exceeded' });
      reject(error);
    }, timeoutMs);
    operation.then(value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); });
  });
}
