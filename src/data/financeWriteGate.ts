// A same-account snapshot can temporarily close the validated financial writer.
// This is a retryable wait, never permission to write an unvalidated document.
export function assertFinanceWriteReady(compatible: boolean, validatedUid: string, uid: string) {
  const sameAccount = !!uid && String(validatedUid || '') === String(uid);
  if (compatible && sameAccount) return;
  const pending = !compatible && sameAccount;
  const error: any = new Error(pending ? 'FINANCE_SCHEMA_VALIDATION_PENDING' : 'UNSUPPORTED_FINANCE_SCHEMA');
  if (pending) error.code = 'aborted';
  throw error;
}
