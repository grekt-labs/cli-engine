import type { ArtifactIndex, IndexEntry } from "#/schemas";
import { CATEGORIES } from "#/categories";
import type { IndexGeneratorInput, SerializeIndexOptions } from "./artifactIndex.types";
import { GREKT_UNTRUSTED_START, GREKT_UNTRUSTED_END } from "#/sync";

/** Terminology block for AIs to understand artifact types and grk-types */
const TERMINOLOGY_BLOCK = `<terminology>Artifacts help you assist the user. Match keywords below to find the relevant artifact, then: 1) Glob .grekt/artifacts/<artifact-id>/**/*.md to list available files. 2) If a filename clearly matches the user's need (e.g., publishing-flow.md for "how to publish"), read it directly. 3) If unclear which file to read, consult grekt.yaml for the component mapping. Each file has a grk-type field: agents (autonomous specialists), skills (reusable capabilities), commands (user-invoked actions).</terminology>`;

/**
 * Generate an artifact index from a list of artifacts.
 * Produces a flat list of entries, deduplicated by artifactId.
 * Only LAZY artifacts are included - CORE artifacts live in the AI's context.
 */
export function generateIndex(artifacts: IndexGeneratorInput[]): ArtifactIndex {
  const seen = new Set<string>();
  const entries: IndexEntry[] = [];

  for (const artifact of artifacts) {
    // Skip CORE artifacts - they live in the AI's context, not in the index
    if (artifact.mode === "core") continue;

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
 * Content is wrapped in <grekt-untrusted-context> to indicate
 * it comes from external artifact sources.
 * Only LAZY artifacts appear here - CORE artifacts live in the AI's context.
 *
 * Format:
 * <grekt-untrusted-context>
 * <terminology>...</terminology>
 * @scope/artifact:keyword1,keyword2
 * @scope/other:keyword3
 * </grekt-untrusted-context>
 */
export function serializeIndex(index: ArtifactIndex, options?: SerializeIndexOptions): string {
  const parts: string[] = [];

  if (options?.includeTerminology) {
    parts.push(TERMINOLOGY_BLOCK);
  }

  for (const entry of index.entries) {
    const keywords = entry.keywords.join(",");
    parts.push(`${entry.artifactId}:${keywords}`);
  }

  const content = parts.join("\n");
  return `${GREKT_UNTRUSTED_START}${content}${GREKT_UNTRUSTED_END}`;
}

/**
 * Parse a serialized index back into an ArtifactIndex object.
 * Handles content wrapped in <grekt-untrusted-context> tags.
 */
export function parseIndex(content: string): ArtifactIndex {
  const entries: IndexEntry[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    // Skip XML-like tags (terminology, grekt-untrusted-context) and empty lines
    if (!line.trim() || line.startsWith("<") || line.startsWith("</")) continue;

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
