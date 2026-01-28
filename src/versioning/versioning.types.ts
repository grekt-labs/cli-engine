/**
 * Versioning module types
 *
 * Types for automatic semantic versioning of artifacts.
 */

/**
 * Minimal package.json structure for semantic-release
 */
export interface TemporaryPackageJson {
  name: string;
  version: string;
  private?: boolean;
}

/**
 * Result of version calculation for a single artifact
 */
export interface VersionResult {
  artifactPath: string;
  artifactId: string;
  previousVersion: string;
  newVersion: string | null; // null if no changes
  releaseType: "major" | "minor" | "patch" | null;
  commits: number;
}

/**
 * Options for the version command
 */
export interface VersionOptions {
  dryRun?: boolean;
  debug?: boolean;
}

/**
 * Result from multirelease execution
 */
export interface MultireleaseResult {
  name: string;
  result:
    | {
        lastRelease: { version: string };
        nextRelease: { version: string; type: string };
        commits: Array<{ message: string }>;
      }
    | false;
}
