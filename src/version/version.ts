/**
 * Version utilities
 *
 * Thin wrapper over the semver package for version validation and comparison.
 * Used to validate artifact versions and determine "latest" by semver (not publish date).
 */

import semver, { type ReleaseType } from "semver";

export type BumpType = "patch" | "minor" | "major";

/**
 * Bump a version by the specified type.
 * Returns the new version string.
 */
export function bumpVersion(currentVersion: string, type: BumpType): string {
  const newVersion = semver.inc(currentVersion, type as ReleaseType);
  if (!newVersion) {
    throw new Error(`Failed to bump version ${currentVersion} by ${type}`);
  }
  return newVersion;
}

/**
 * Check if a string is a valid semver version.
 * Rejects versions with 'v' prefix (e.g., "v1.0.0" is invalid, "1.0.0" is valid).
 */
export function isValidSemver(version: string): boolean {
  // Reject v prefix - semver package accepts it but we want strict format
  if (version.startsWith("v") || version.startsWith("V")) {
    return false;
  }
  return semver.valid(version) !== null;
}

/**
 * Compare two semver versions.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 * Throws if either version is invalid.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const result = semver.compare(a, b);
  return result as -1 | 0 | 1;
}

/**
 * Sort versions in descending order (highest first).
 * Invalid versions are filtered out.
 */
export function sortVersionsDesc(versions: string[]): string[] {
  const valid = versions.filter(isValidSemver);
  return valid.sort((a, b) => compareSemver(b, a));
}

/**
 * Get the highest version from a list.
 * Returns null if the list is empty or has no valid versions.
 */
export function getHighestVersion(versions: string[]): string | null {
  const sorted = sortVersionsDesc(versions);
  return sorted[0] ?? null;
}

/**
 * Check if version a is greater than version b.
 */
export function isGreaterThan(a: string, b: string): boolean {
  return semver.gt(a, b);
}

/**
 * Check if version a is less than version b.
 */
export function isLessThan(a: string, b: string): boolean {
  return semver.lt(a, b);
}
