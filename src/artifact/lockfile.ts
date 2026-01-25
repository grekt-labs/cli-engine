import { parse, stringify } from "yaml";
import type { FileSystem } from "#/core";
import { LockfileSchema, type Lockfile } from "#/schemas";

export function getLockfile(fs: FileSystem, lockfilePath: string): Lockfile {
  if (!fs.exists(lockfilePath)) {
    return createEmptyLockfile();
  }
  const content = fs.readFile(lockfilePath);
  const raw = parse(content);
  return LockfileSchema.parse(raw);
}

export function saveLockfile(fs: FileSystem, lockfilePath: string, data: Lockfile): void {
  const content = stringify(data);
  fs.writeFile(lockfilePath, content);
}

export function createEmptyLockfile(): Lockfile {
  return {
    version: 1,
    artifacts: {},
  };
}

export function lockfileExists(fs: FileSystem, lockfilePath: string): boolean {
  return fs.exists(lockfilePath);
}
