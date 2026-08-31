export const ACCOUNT_SYNC_SCHEMA_VERSION = 5;
export const DATA_ARCHITECTURE_VERSION = 1;

export type VersionedRecord = Record<string, unknown> & {
  schemaVersion?: number;
};
