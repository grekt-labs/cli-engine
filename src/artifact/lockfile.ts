import { stringify } from "yaml";
import type { FileSystem } from "#/core";
import { LockfileSchema, type Lockfile } from "#/schemas";
import { safeParseYaml, type ParseResult } from "#/friendly-errors";

export function getLockfile(fs: FileSystem, lockfilePath: string) {
  if (!fs.exists(lockfilePath)) {
    return { success: true as const, data: createEmptyLockfile() };
  }
  const content = fs.readFile(lockfilePath);
  return safeParseYaml(content, LockfileSchema, lockfilePath);
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
