import { createHash } from "crypto";
import { join, relative } from "path";
import type { FileSystem } from "#/core";

function hashContent(content: string): string {
  const hash = createHash("sha256").update(content).digest("hex");
  return `sha256:${hash.slice(0, 32)}`;
}

/**
 * Hash all files in a directory recursively
 * Returns a map of relative paths to their hashes
 */
export function hashDirectory(fs: FileSystem, dir: string): Record<string, string> {
  const hashes: Record<string, string> = {};

  function walkDir(currentDir: string): void {
    const entries = fs.readdir(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = fs.stat(fullPath);

      if (stat.isDirectory) {
        walkDir(fullPath);
      } else if (stat.isFile) {
        const relativePath = relative(dir, fullPath);
        const content = fs.readFile(fullPath);
        hashes[relativePath] = hashContent(content);
      }
    }
  }

  walkDir(dir);
  return hashes;
}

/**
 * Calculate integrity hash for entire artifact (hash of sorted file hashes)
 */
export function calculateIntegrity(fileHashes: Record<string, string>): string {
  const sortedKeys = Object.keys(fileHashes).sort();
  const combined = sortedKeys.map((k) => `${k}:${fileHashes[k]}`).join("\n");
  const hash = createHash("sha256").update(combined).digest("hex");
  return `sha256:${hash.slice(0, 32)}`;
}

export interface IntegrityResult {
  valid: boolean;
  missingFiles: string[];
  modifiedFiles: { path: string; expected: string; actual: string }[];
  extraFiles: string[];
}

/**
 * Verify integrity of an artifact against lockfile hashes
 */
export function verifyIntegrity(
  fs: FileSystem,
  artifactDir: string,
  expectedFiles: Record<string, string>
): IntegrityResult {
  const result: IntegrityResult = {
    valid: true,
    missingFiles: [],
    modifiedFiles: [],
    extraFiles: [],
  };

  const actualHashes = hashDirectory(fs, artifactDir);
  const expectedPaths = new Set(Object.keys(expectedFiles));
  const actualPaths = new Set(Object.keys(actualHashes));

  // Check for missing files
  for (const path of expectedPaths) {
    if (!actualPaths.has(path)) {
      result.missingFiles.push(path);
      result.valid = false;
    }
  }

  // Check for modified files
  for (const path of expectedPaths) {
    const actualHash = actualHashes[path];
    const expectedHash = expectedFiles[path];
    if (actualHash && expectedHash && actualHash !== expectedHash) {
      result.modifiedFiles.push({
        path,
        expected: expectedHash,
        actual: actualHash,
      });
      result.valid = false;
    }
  }

  // Check for extra files (not necessarily invalid, but noteworthy)
  for (const path of actualPaths) {
    if (!expectedPaths.has(path)) {
      result.extraFiles.push(path);
    }
  }

  return result;
}

/**
 * Get total size of all files in a directory (in bytes)
 */
export function getDirectorySize(fs: FileSystem, dir: string): number {
  let totalSize = 0;

  function walkDir(currentDir: string): void {
    const entries = fs.readdir(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = fs.stat(fullPath);

      if (stat.isDirectory) {
        walkDir(fullPath);
      } else if (stat.isFile) {
        totalSize += stat.size;
      }
    }
  }

  walkDir(dir);
  return totalSize;
}
