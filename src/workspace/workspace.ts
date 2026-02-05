/**
 * Workspace operations
 *
 * Pure functions for workspace discovery and validation.
 * Glob expansion is handled by CLI, these functions process already-expanded paths.
 */

import { join, relative } from "path";
import type { FileSystem } from "#/core";
import { ArtifactManifestSchema, WorkspaceConfigSchema, type ArtifactManifest } from "#/schemas";
import { safeParseYaml, type ParseResult } from "#/friendly-errors";
import type {
  WorkspaceArtifact,
  WorkspaceContext,
  WorkspaceDiscoveryResult,
} from "./workspace.types";

const WORKSPACE_CONFIG_FILE = "grekt-workspace.yaml";
const ARTIFACT_MANIFEST_FILE = "grekt.yaml";

/**
 * Parse and validate workspace config from raw YAML content.
 * Returns a result object with friendly error messages.
 */
export function parseWorkspaceConfig(content: string, filepath?: string) {
  return safeParseYaml(content, WorkspaceConfigSchema, filepath);
}

/**
 * Check if a directory is a workspace root (has grekt-workspace.yaml).
 */
export function isWorkspaceRoot(fs: FileSystem, dir: string): boolean {
  const configPath = join(dir, WORKSPACE_CONFIG_FILE);
  return fs.exists(configPath);
}

/**
 * Find workspace root by walking up from a directory.
 * Returns undefined if not inside a workspace.
 */
export function findWorkspaceRoot(fs: FileSystem, startDir: string): string | undefined {
  let current = startDir;

  while (current !== "/") {
    if (isWorkspaceRoot(fs, current)) {
      return current;
    }
    const parent = join(current, "..");
    if (parent === current) break;
    current = parent;
  }

  return undefined;
}

/**
 * Load artifact manifest from a directory.
 * Returns a result object with friendly error messages.
 */
export function loadArtifactManifest(
  fs: FileSystem,
  artifactDir: string
): ParseResult<ArtifactManifest> {
  const manifestPath = join(artifactDir, ARTIFACT_MANIFEST_FILE);

  if (!fs.exists(manifestPath)) {
    return {
      success: false,
      error: {
        type: "yaml",
        message: `No ${ARTIFACT_MANIFEST_FILE} found in ${artifactDir}`,
      },
    };
  }

  const content = fs.readFile(manifestPath);
  return safeParseYaml(content, ArtifactManifestSchema, manifestPath);
}

/**
 * Process expanded artifact paths and load their manifests.
 * CLI handles glob expansion, this processes the results.
 *
 * @param fs - FileSystem interface
 * @param workspaceRoot - Absolute path to workspace root
 * @param artifactPaths - Absolute paths to artifact directories (already expanded from globs)
 */
export function discoverWorkspaceArtifacts(
  fs: FileSystem,
  workspaceRoot: string,
  artifactPaths: string[]
): WorkspaceDiscoveryResult {
  const artifacts: WorkspaceArtifact[] = [];
  const warnings: string[] = [];

  for (const artifactPath of artifactPaths) {
    const result = loadArtifactManifest(fs, artifactPath);

    if (!result.success) {
      const details = result.error.details?.join(", ") ?? "";
      const suffix = details ? ` (${details})` : "";
      warnings.push(`${artifactPath}: ${result.error.message}${suffix}`);
      continue;
    }

    artifacts.push({
      path: artifactPath,
      relativePath: relative(workspaceRoot, artifactPath),
      manifest: result.data,
    });
  }

  return {
    root: workspaceRoot,
    artifacts,
    warnings,
  };
}

/**
 * Determine workspace context for current directory.
 * Used by commands to know if they're in a workspace and which artifact.
 *
 * @param fs - FileSystem interface
 * @param currentDir - Current working directory
 * @param expandedArtifactPaths - All artifact paths in workspace (if known)
 */
export function getWorkspaceContext(
  fs: FileSystem,
  currentDir: string,
  expandedArtifactPaths?: string[]
): WorkspaceContext {
  const workspaceRoot = findWorkspaceRoot(fs, currentDir);

  if (!workspaceRoot) {
    return { isWorkspace: false };
  }

  // Check if current directory is an artifact
  let currentArtifact: WorkspaceArtifact | undefined;

  if (expandedArtifactPaths) {
    // Check if currentDir matches any artifact path
    const matchingPath = expandedArtifactPaths.find(
      (p) => currentDir === p || currentDir.startsWith(p + "/")
    );

    if (matchingPath) {
      const result = loadArtifactManifest(fs, matchingPath);
      if (result.success) {
        currentArtifact = {
          path: matchingPath,
          relativePath: relative(workspaceRoot, matchingPath),
          manifest: result.data,
        };
      }
    }
  } else {
    // Try to load manifest from current directory
    const result = loadArtifactManifest(fs, currentDir);
    if (result.success) {
      currentArtifact = {
        path: currentDir,
        relativePath: relative(workspaceRoot, currentDir),
        manifest: result.data,
      };
    }
  }

  return {
    isWorkspace: true,
    workspaceRoot,
    currentArtifact,
  };
}
