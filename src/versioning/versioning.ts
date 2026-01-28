/**
 * Versioning utilities
 *
 * Pure functions for transforming artifact manifests to/from package.json
 * for use with semantic-release.
 */

import type { ArtifactManifest } from "#/schemas";
import type { TemporaryPackageJson, VersionResult, MultireleaseResult } from "./versioning.types";

/**
 * Convert artifact manifest to temporary package.json for semantic-release.
 * The package.json is minimal - only what semantic-release needs.
 */
export function manifestToPackageJson(manifest: ArtifactManifest): TemporaryPackageJson {
  const artifactId = `@${manifest.author}/${manifest.name}`;

  return {
    name: artifactId,
    version: manifest.version,
    private: true, // Prevent accidental npm publish
  };
}

/**
 * Update manifest version from semantic-release result.
 * Returns a new manifest object with updated version.
 */
export function updateManifestVersion(
  manifest: ArtifactManifest,
  newVersion: string
): ArtifactManifest {
  return {
    ...manifest,
    version: newVersion,
  };
}

/**
 * Parse multirelease result into a structured version result.
 */
export function parseMultireleaseResult(
  artifactPath: string,
  result: MultireleaseResult
): VersionResult {
  const artifactId = result.name;

  if (!result.result) {
    // No release needed
    return {
      artifactPath,
      artifactId,
      previousVersion: "",
      newVersion: null,
      releaseType: null,
      commits: 0,
    };
  }

  const { lastRelease, nextRelease, commits } = result.result;

  return {
    artifactPath,
    artifactId,
    previousVersion: lastRelease.version,
    newVersion: nextRelease.version,
    releaseType: nextRelease.type as "major" | "minor" | "patch",
    commits: commits.length,
  };
}

/**
 * Format version results for display.
 */
export function formatVersionResults(results: VersionResult[]): string[] {
  const lines: string[] = [];

  for (const result of results) {
    if (result.newVersion) {
      const typeLabel = result.releaseType ? ` (${result.commits} ${result.releaseType} commits)` : "";
      lines.push(
        `${result.artifactId}: ${result.previousVersion} → ${result.newVersion}${typeLabel}`
      );
    } else {
      lines.push(`${result.artifactId}: ${result.previousVersion} (no changes)`);
    }
  }

  return lines;
}

/**
 * Get artifact ID from manifest.
 */
export function getArtifactIdFromManifest(manifest: ArtifactManifest): string {
  return `@${manifest.author}/${manifest.name}`;
}
