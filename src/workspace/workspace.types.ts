/**
 * Workspace types
 *
 * Types for monorepo workspace operations.
 */

import type { ArtifactManifest } from "#/schemas";

/**
 * Represents a discovered artifact within a workspace.
 */
export interface WorkspaceArtifact {
  /** Absolute path to the artifact directory */
  path: string;
  /** Relative path from workspace root */
  relativePath: string;
  /** Parsed manifest from grekt.yaml */
  manifest: ArtifactManifest;
}

/**
 * Result of workspace discovery operation.
 */
export interface WorkspaceDiscoveryResult {
  /** Root directory of the workspace */
  root: string;
  /** All discovered artifacts */
  artifacts: WorkspaceArtifact[];
  /** Paths that matched globs but had no valid grekt.yaml */
  warnings: string[];
}

/**
 * Context for workspace-aware operations.
 */
export interface WorkspaceContext {
  /** Whether we're in a workspace */
  isWorkspace: boolean;
  /** Root of the workspace (if in workspace) */
  workspaceRoot?: string;
  /** Current artifact path (if in artifact subdirectory) */
  currentArtifact?: WorkspaceArtifact;
}
