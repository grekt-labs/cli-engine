/**
 * Workspace operations
 *
 * Pure functions for workspace discovery and validation.
 * Glob expansion is handled by CLI, these functions process already-expanded paths.
 */

import { join, relative } from "path";
import { parse as parseYaml } from "yaml";
import type { FileSystem } from "#/core";
import { ArtifactManifestSchema, WorkspaceConfigSchema } from "#/schemas";
import type {
  WorkspaceArtifact,
  WorkspaceContext,
  WorkspaceDiscoveryResult,
} from "./workspace.types";

const WORKSPACE_CONFIG_FILE = "grekt-workspace.yaml";
const ARTIFACT_MANIFEST_FILE = "grekt.yaml";

/**
 * Parse and validate workspace config from raw YAML content.
 */
export function parseWorkspaceConfig(content: string) {
  const raw = parseYaml(content);
  return WorkspaceConfigSchema.parse(raw);
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
 * Returns undefined if no valid manifest found.
 */
export function loadArtifactManifest(
  fs: FileSystem,
  artifactDir: string
): ReturnType<typeof ArtifactManifestSchema.safeParse> {
  const manifestPath = join(artifactDir, ARTIFACT_MANIFEST_FILE);

  if (!fs.exists(manifestPath)) {
    return { success: false, error: new Error(`No ${ARTIFACT_MANIFEST_FILE} found`) } as never;
  }

  try {
    const content = fs.readFile(manifestPath);
    const raw = parseYaml(content);
    return ArtifactManifestSchema.safeParse(raw);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    } as never;
  }
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
      warnings.push(`${artifactPath}: ${result.error?.message || "Invalid manifest"}`);
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
