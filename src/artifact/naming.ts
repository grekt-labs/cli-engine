import { basename } from "path";
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
 * Create a namespaced filename to avoid collisions between artifacts.
 * Used when syncing artifacts to target directories.
 *
 * @example getSafeFilename("@grekt/analyzer", "skills/analyze.md") → "grekt-analyzer_analyze.md"
 * @example getSafeFilename("my-artifact", "agent.md") → "my-artifact_agent.md"
 */
export function getSafeFilename(artifactId: string, filepath: string): string {
  const safeName = artifactId.replace("@", "").replace("/", "-");
  const filename = basename(filepath);
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
