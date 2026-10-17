import { accountSyncRecordKey, mergeSyncRecords, mergeSyncTombstones } from './syncAlgorithms';

// The existing legacy movement merge, extracted without changing timestamp,
// explicit-tombstone or tie-breaking rules. V2 still bypasses legacy hydration.
export function mergeIncomingMovements(local: any = {}, cloud: any = {}) {
  const deleted = mergeSyncTombstones(local.deleted, cloud.accountDeletedRecords);
  return {
    expenses: mergeSyncRecords(local.expenses, cloud.expenses, deleted,
      item => accountSyncRecordKey('expense', item), true),
    incomes: mergeSyncRecords(local.incomes, cloud.incomes, deleted,
      item => accountSyncRecordKey('income', item), true),
    deleted,
  };
}
