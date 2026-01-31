import type { ArtifactIndex, IndexEntry } from "#/schemas";
import { CATEGORIES } from "#/categories";
import type { IndexGeneratorInput, SerializeIndexOptions } from "./artifactIndex.types";

/** Terminology block for AIs to understand artifact types */
const TERMINOLOGY_BLOCK = `<terminology>Each artifact has a \`grk-type\` field that identifies the tool type.</terminology>`;

/**
 * Generate an artifact index from a list of artifacts.
 * Produces a flat list of entries, deduplicated by artifactId.
 */
export function generateIndex(artifacts: IndexGeneratorInput[]): ArtifactIndex {
  const seen = new Set<string>();
  const entries: IndexEntry[] = [];

  for (const artifact of artifacts) {
    // Check if artifact has any components
    const hasComponents = CATEGORIES.some(
      (category) => artifact.components[category].length > 0
    );

    if (hasComponents && !seen.has(artifact.artifactId)) {
      seen.add(artifact.artifactId);
      entries.push({
        artifactId: artifact.artifactId,
        keywords: artifact.keywords,
        mode: artifact.mode,
      });
    }
  }

  return { version: 1, entries };
}

/**
 * Serialize the full index to a minified flat list format.
 *
 * Format:
 * <terminology>...</terminology>
 * @scope/artifact:keyword1,keyword2|core
 * @scope/other:keyword3
 */
export function serializeIndex(index: ArtifactIndex, options?: SerializeIndexOptions): string {
  const lines: string[] = [];

  if (options?.includeTerminology) {
    lines.push(TERMINOLOGY_BLOCK);
  }

  for (const entry of index.entries) {
    const keywords = entry.keywords.join(",");
    const modeSuffix = entry.mode === "core" ? "|core" : "";
    lines.push(`${entry.artifactId}:${keywords}${modeSuffix}`);
  }

  return lines.join("\n");
}

/**
 * Parse a serialized index back into an ArtifactIndex object.
 */
export function parseIndex(content: string): ArtifactIndex {
  const entries: IndexEntry[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    // Skip terminology block and empty lines
    if (!line.trim() || line.startsWith("<")) continue;

    // Parse entry: @scope/artifact:keyword1,keyword2|mode
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const artifactId = line.slice(0, colonIndex);
    let remainder = line.slice(colonIndex + 1);

    // Check for mode suffix (|core or |lazy)
    let mode: "core" | "lazy" = "lazy";
    const pipeIndex = remainder.lastIndexOf("|");
    if (pipeIndex !== -1) {
      const modeSuffix = remainder.slice(pipeIndex + 1);
      if (modeSuffix === "core" || modeSuffix === "lazy") {
        mode = modeSuffix;
        remainder = remainder.slice(0, pipeIndex);
      }
    }

    const keywords = remainder ? remainder.split(",") : [];

    entries.push({ artifactId, keywords, mode });
  }

  return { version: 1, entries };
}
