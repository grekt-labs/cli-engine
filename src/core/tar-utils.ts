/**
 * Tar extraction security utilities.
 *
 * PRE-EXTRACT validation using tar to list contents before extraction.
 * This prevents path traversal and symlink attacks by rejecting unsafe tarballs
 * before any files are written.
 */

import { resolve, normalize, isAbsolute, relative } from "path";
import type { ShellExecutor } from "./interfaces";

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
 * @param shell - Shell executor for running tar commands
 * @param tarballPath - Path to the tarball file
 * @param targetDir - Directory where files will be extracted
 * @param stripComponents - Number of leading path components to strip (matches extraction)
 */
export function validateTarballContents(
  shell: ShellExecutor,
  tarballPath: string,
  targetDir: string,
  stripComponents: number = 1
): TarValidationResult {
  const violations: string[] = [];
  const resolvedTargetDir = resolve(targetDir);

  try {
    // Get list of entries (names only, works same on BSD and GNU)
    const listOutput = shell.execFile("tar", ["-tf", tarballPath]);
    const entries = listOutput.trim().split("\n").filter(Boolean);

    // Get verbose output to detect symlinks (parse carefully for BSD/GNU compat)
    const verboseOutput = shell.execFile("tar", ["-tvf", tarballPath]);
    const verboseLines = verboseOutput.trim().split("\n").filter(Boolean);

    // Build a map of symlink targets
    const symlinkTargets = parseSymlinks(verboseLines);

    for (const entry of entries) {
      if (!entry.trim()) continue;

      // Apply strip-components to simulate what extraction will do
      const strippedPath = applyStripComponents(entry, stripComponents);

      // If path is completely stripped (was only the prefix dir), skip
      if (!strippedPath) continue;

      // Check for absolute paths after stripping
      if (isAbsolute(strippedPath)) {
        violations.push(`Absolute path in tarball: ${entry}`);
        continue;
      }

      // Normalize and check for path traversal
      const normalized = normalize(strippedPath);
      if (normalized.startsWith("..")) {
        violations.push(`Path traversal in tarball: ${entry} (after strip: ${strippedPath})`);
        continue;
      }

      // Check entry would be within target
      const resolvedEntry = resolve(resolvedTargetDir, normalized);
      if (!isWithinTarget(resolvedTargetDir, resolvedEntry)) {
        violations.push(`Entry escapes target directory: ${entry}`);
        continue;
      }

      // Check symlink targets
      const symlinkTarget = symlinkTargets.get(entry);
      if (symlinkTarget) {
        // Resolve symlink target relative to the symlink's location (after strip)
        const symlinkDir = resolve(resolvedTargetDir, normalize(strippedPath), "..");
        const resolvedTarget = resolve(symlinkDir, symlinkTarget);

        // Check if symlink points outside target directory
        if (!isWithinTarget(resolvedTargetDir, resolvedTarget)) {
          violations.push(`Symlink escapes target directory: ${entry} -> ${symlinkTarget}`);
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
 * Parse symlink targets from tar -tvf output.
 * Works with both GNU and BSD tar formats by looking for " -> " pattern.
 *
 * BSD format: "lrwxr-xr-x  0 user   group       0 Jan  1 00:00 link -> target"
 * GNU format: "lrwxrwxrwx user/group 0 2024-01-01 00:00 link -> target"
 *
 * Returns a map of entry name -> symlink target
 */
function parseSymlinks(lines: string[]): Map<string, string> {
  const symlinks = new Map<string, string>();

  for (const line of lines) {
    // Only process symlinks (start with 'l')
    if (!line.startsWith("l")) continue;

    // Find the " -> " separator that indicates a symlink
    const arrowIndex = line.indexOf(" -> ");
    if (arrowIndex === -1) continue;

    const target = line.substring(arrowIndex + 4);

    // Extract the name by finding the last space-separated field before " -> "
    // This works for both BSD and GNU because the name is always right before " -> "
    const beforeArrow = line.substring(0, arrowIndex);

    // The name is everything after the last whitespace sequence that follows a non-space
    // We need to find where the name starts - it's after time field
    // Look for the name by finding the rightmost part that isn't metadata
    const name = extractNameFromVerboseLine(beforeArrow);

    if (name) {
      symlinks.set(name, target);
    }
  }

  return symlinks;
}

/**
 * Extract file name from the portion of a tar -tvf line before " -> ".
 * Handles both BSD and GNU tar output formats.
 */
function extractNameFromVerboseLine(lineBeforeArrow: string): string | null {
  // Strategy: The name is the rightmost "word" that could be a path
  // Both formats have the name as the last field before " -> "
  // We can find it by looking for common patterns

  // BSD: "lrwxr-xr-x  0 user   group       0 Jan  1 00:00 name"
  // GNU: "lrwxrwxrwx user/group 0 2024-01-01 00:00 name"

  // Match time pattern (HH:MM) and take everything after it
  const timePattern = /\d{1,2}:\d{2}\s+(.+)$/;
  const match = lineBeforeArrow.match(timePattern);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallback: just take the last non-empty segment after splitting on whitespace
  // This is less reliable but better than nothing
  const parts = lineBeforeArrow.trim().split(/\s+/);
  const last = parts.length > 0 ? parts[parts.length - 1] : undefined;
  return last ? last : null;
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
