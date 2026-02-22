/**
 * Tar extraction security utilities.
 *
 * PRE-EXTRACT validation using TarOperations to list contents before extraction.
 * This prevents path traversal and symlink attacks by rejecting unsafe tarballs
 * before any files are written.
 */

import { resolve, normalize, isAbsolute, relative, join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import type { TarOperations } from "./interfaces";

export interface TarValidationResult {
  safe: boolean;
  violations: string[];
}

/**
 * Validate tarball contents BEFORE extraction.
 * Checks for:
 * - Path traversal (entries containing ".." that escape target after strip-components)
 * - Absolute paths
 * - Symlinks pointing outside target directory
 *
 * This is called BEFORE extraction to prevent malicious files from being written.
 *
 * @param tar - Tar operations for listing tarball contents
 * @param tarballPath - Path to the tarball file
 * @param targetDir - Directory where files will be extracted
 * @param stripComponents - Number of leading path components to strip (matches extraction)
 */
export function validateTarballContents(
  tar: TarOperations,
  tarballPath: string,
  targetDir: string,
  stripComponents: number = 1
): TarValidationResult {
  const violations: string[] = [];
  const resolvedTargetDir = resolve(targetDir);

  try {
    const entries = tar.list(tarballPath);

    for (const entry of entries) {
      if (!entry.path.trim()) continue;

      // Apply strip-components to simulate what extraction will do
      const strippedPath = applyStripComponents(entry.path, stripComponents);

      // If path is completely stripped (was only the prefix dir), skip
      if (!strippedPath) continue;

      // Check for absolute paths after stripping
      if (isAbsolute(strippedPath)) {
        violations.push(`Absolute path in tarball: ${entry.path}`);
        continue;
      }

      // Normalize and check for path traversal
      const normalized = normalize(strippedPath);
      if (normalized.startsWith("..")) {
        violations.push(`Path traversal in tarball: ${entry.path} (after strip: ${strippedPath})`);
        continue;
      }

      // Check entry would be within target
      const resolvedEntry = resolve(resolvedTargetDir, normalized);
      if (!isWithinTarget(resolvedTargetDir, resolvedEntry)) {
        violations.push(`Entry escapes target directory: ${entry.path}`);
        continue;
      }

      // Check symlink targets
      if (entry.type === "symlink" && entry.linkTarget) {
        // Resolve symlink target relative to the symlink's location (after strip)
        const symlinkDir = resolve(resolvedTargetDir, normalize(strippedPath), "..");
        const resolvedTarget = resolve(symlinkDir, entry.linkTarget);

        // Check if symlink points outside target directory
        if (!isWithinTarget(resolvedTargetDir, resolvedTarget)) {
          violations.push(`Symlink escapes target directory: ${entry.path} -> ${entry.linkTarget}`);
        }
      }
    }
  } catch (err) {
    // If we can't list the tarball, it's not safe to extract
    const message = err instanceof Error ? err.message : "Unknown error";
    violations.push(`Cannot validate tarball: ${message}`);
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

/**
 * Apply strip-components to a path.
 * Removes the first N path components, matching tar --strip-components behavior.
 *
 * @example
 * applyStripComponents("a/b/c", 1) → "b/c"
 * applyStripComponents("a/b/c", 2) → "c"
 * applyStripComponents("a/", 1) → null (completely stripped)
 */
function applyStripComponents(path: string, count: number): string | null {
  if (count <= 0) return path;

  const parts = path.split("/").filter(Boolean);
  if (parts.length <= count) {
    return null; // Path would be completely stripped
  }

  return parts.slice(count).join("/");
}

/**
 * Sanitize a path component to remove dangerous characters.
 * Use for user-provided path components before joining.
 */
export function sanitizePathComponent(component: string): string {
  // Remove path separators and null bytes
  return component
    .replace(/[/\\]/g, "")
    .replace(/\0/g, "")
    .replace(/\.\./g, "");
}

function isWithinTarget(resolvedTargetDir: string, resolvedPath: string): boolean {
  if (resolvedPath === resolvedTargetDir) return true;
  const rel = relative(resolvedTargetDir, resolvedPath);
  return !(rel.startsWith("..") || isAbsolute(rel));
}

/**
 * Generate a secure temporary file path for tarball downloads.
 * Uses os.tmpdir() for cross-platform compatibility and crypto.randomUUID for uniqueness.
 *
 * @param prefix - Optional prefix to identify the source (e.g., "github", "gitlab")
 */
export function generateSecureTempPath(prefix?: string): string {
  const uuid = randomUUID();
  const fileName = prefix ? `grekt-${prefix}-${uuid}.tar.gz` : `grekt-${uuid}.tar.gz`;
  return join(tmpdir(), fileName);
}
