import { basename, dirname } from "path";
import type { ArtifactManifest } from "#/schemas";

/**
 * Regex to match scoped artifact names: @scope/name
 */
const SCOPED_NAME_REGEX = /^@([^/]+)\/(.+)$/;

/**
 * Check if a name is scoped (@scope/name format).
 *
 * @example isScoped("@grekt/analyzer") → true
 * @example isScoped("my-tool") → false
 */
export function isScoped(name: string): boolean {
  return SCOPED_NAME_REGEX.test(name);
}

/**
 * Parse a name into scope and base name.
 * Returns null for scope if name is not scoped.
 *
 * @example parseName("@grekt/analyzer") → { scope: "@grekt", baseName: "analyzer", artifactId: "@grekt/analyzer" }
 * @example parseName("my-tool") → { scope: null, baseName: "my-tool", artifactId: "my-tool" }
 */
export function parseName(name: string): {
  scope: string | null;
  baseName: string;
  artifactId: string;
} {
  const match = name.match(SCOPED_NAME_REGEX);

  if (match) {
    const scope = `@${match[1]}`;
    const baseName = match[2]!;
    return {
      scope,
      baseName,
      artifactId: name, // Already in @scope/name format
    };
  }

  return {
    scope: null,
    baseName: name,
    artifactId: name,
  };
}

/**
 * Filenames considered generic — their identity comes from the parent directory, not the file itself.
 * When a file uses one of these names, the parent directory name is used to disambiguate.
 */
const GENERIC_FILENAMES = ["SKILL.md", "agent.md"];

/**
 * Extract a meaningful filename from a filepath.
 * For generic filenames (SKILL.md, agent.md), uses the parent directory name instead.
 *
 * @example resolveComponentFilename("skills/analyze.md") → "analyze.md"
 * @example resolveComponentFilename("lockfile-io/SKILL.md") → "lockfile-io.md"
 * @example resolveComponentFilename("artifact-ops/agent.md") → "artifact-ops.md"
 * @example resolveComponentFilename("agent.md") → "agent.md" (no parent, keeps as-is)
 */
export function resolveComponentFilename(filepath: string): string {
  const filename = basename(filepath);

  if (GENERIC_FILENAMES.includes(filename)) {
    const parentDir = basename(dirname(filepath));
    if (parentDir && parentDir !== ".") {
      const extension = filename.substring(filename.lastIndexOf("."));
      return `${parentDir}${extension}`;
    }
  }

  return filename;
}

/**
 * Create a namespaced filename to avoid collisions between artifacts.
 * Used when syncing artifacts to target directories.
 *
 * For generic filenames (SKILL.md, agent.md inside subdirectories),
 * the parent directory name is used to disambiguate.
 *
 * @example getSafeFilename("@grekt/analyzer", "skills/analyze.md") → "grekt-analyzer_analyze.md"
 * @example getSafeFilename("my-artifact", "agent.md") → "my-artifact_agent.md"
 * @example getSafeFilename("@scope/art", "ops/lockfile-io/SKILL.md") → "scope-art_lockfile-io.md"
 * @example getSafeFilename("@scope/art", "core-ops/agent.md") → "scope-art_core-ops.md"
 */
export function getSafeFilename(artifactId: string, filepath: string): string {
  const safeName = artifactId.replace("@", "").replace("/", "-");
  const filename = resolveComponentFilename(filepath);
  return `${safeName}_${filename}`;
}

/**
 * Convert artifact ID to safe directory/file name format.
 * Removes @ prefix and replaces / with -
 *
 * @example toSafeName("@grekt/analyzer") → "grekt-analyzer"
 */
export function toSafeName(artifactId: string): string {
  return artifactId.replace("@", "").replace("/", "-");
}

/**
 * Build artifact ID from scope and name.
 *
 * @example buildArtifactId("grekt", "analyzer") → "@grekt/analyzer"
 */
export function buildArtifactId(scope: string, name: string): string {
  const normalizedScope = scope.startsWith("@") ? scope.slice(1) : scope;
  return `@${normalizedScope}/${name}`;
}

/**
 * Get artifact ID from manifest.
 * Extracts from name field directly (name can be @scope/name or just name).
 *
 * @example getArtifactIdFromManifest({ name: "@grekt/analyzer", ... }) → "@grekt/analyzer"
 * @example getArtifactIdFromManifest({ name: "my-tool", ... }) → "my-tool"
 */
export function getArtifactIdFromManifest(manifest: ArtifactManifest): string {
  return parseName(manifest.name).artifactId;
}
