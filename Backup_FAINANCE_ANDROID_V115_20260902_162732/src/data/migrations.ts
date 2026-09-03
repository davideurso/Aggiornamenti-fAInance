import type { VersionedRecord } from "./schema";

export type DataMigration = (document: VersionedRecord) => VersionedRecord;
const migrations: Record<number, DataMigration> = {};

export function migrateRecord<T extends VersionedRecord>(input: T, targetVersion: number): T {
  let current = { ...input } as VersionedRecord;
  let version = Number(current.schemaVersion || 1);
  if (version > targetVersion) return current as T;
  while (version < targetVersion) {
    const nextVersion = version + 1;
    const migration = migrations[nextVersion];
    if (!migration) throw new Error(`MISSING_SCHEMA_MIGRATION_${version}_TO_${nextVersion}`);
    current = migration(current);
    current.schemaVersion = nextVersion;
    version = nextVersion;
  }
  return current as T;
}
