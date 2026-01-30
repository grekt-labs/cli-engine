import type { ArtifactIndex, IndexEntry } from "#/schemas";
import { CATEGORIES, isValidCategory, type Category } from "#/categories";
import type { IndexGeneratorInput, SerializeIndexOptions } from "./artifactIndex.types";

/** Terminology block for AIs that need term translation */
const TERMINOLOGY_BLOCK = `<terminology>
If you don't recognize these terms:
- agent = custom agent / persona with specific expertise
- skill = reusable capability invoked on-demand (same as Copilot/Windsurf skills)
- command = slash command / workflow (e.g., /review)
- rules = coding guidelines / instructions
</terminology>`;

/** Create an empty index with all category arrays initialized */
function createEmptyIndex(): ArtifactIndex {
  const index = { version: 1 } as ArtifactIndex;
  for (const category of CATEGORIES) {
    index[category] = [];
  }
  return index;
}

/**
 * Generate an artifact index from a list of artifacts.
 * The index contains all components from all artifacts, categorized by type.
 */
export function generateIndex(artifacts: IndexGeneratorInput[]): ArtifactIndex {
  const index = createEmptyIndex();

  for (const artifact of artifacts) {
    const baseEntry = {
      artifactId: artifact.artifactId,
      keywords: artifact.keywords,
      mode: artifact.mode,
    };

    for (const category of CATEGORIES) {
      for (const path of artifact.components[category]) {
        index[category].push({ ...baseEntry, path });
      }
    }
  }

  return index;
}

/**
 * Serialize index entries for a specific section.
 * Format: @scope/artifact:keyword1,keyword2|mode
 * Mode suffix: |core or |lazy (lazy is default, can be omitted)
 */
function serializeEntries(entries: IndexEntry[]): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    // Deduplicate by artifactId (one line per artifact per section)
    if (seen.has(entry.artifactId)) continue;
    seen.add(entry.artifactId);

    const keywords = entry.keywords.join(",");
    const modeSuffix = entry.mode === "core" ? "|core" : "";
    lines.push(`${entry.artifactId}:${keywords}${modeSuffix}`);
  }

  return lines;
}

/**
 * Serialize the full index to a minified text format.
 * Includes ALL artifacts (CORE and LAZY) for observability.
 *
 * Format:
 * <terminology>...</terminology> (optional)
 *
 * [agents]
 * @scope/artifact:keyword1,keyword2|core
 * @scope/other:keyword3
 *
 * [skills]
 * @scope/artifact:keyword1,keyword2
 */
export function serializeIndex(index: ArtifactIndex, options?: SerializeIndexOptions): string {
  const sections: string[] = [];

  // Add terminology block if requested (for AIs that need term translation)
  if (options?.includeTerminology) {
    sections.push(TERMINOLOGY_BLOCK);
    sections.push(""); // Empty line after terminology
  }

  for (const category of CATEGORIES) {
    if (index[category].length > 0) {
      sections.push(`[${category}]`);
      sections.push(...serializeEntries(index[category]));
    }
  }

  return sections.join("\n");
}

/**
 * Parse a serialized index back into an ArtifactIndex object.
 * Used for reading existing index files.
 */
export function parseIndex(content: string): ArtifactIndex {
  const index = createEmptyIndex();

  let currentSection: Category | null = null;

  const lines = content.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    // Section header
    const sectionMatch = line.match(/^\[(\w+)\]$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      if (sectionName && isValidCategory(sectionName)) {
        currentSection = sectionName;
      }
      continue;
    }

    if (!currentSection) continue;

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

    const entry: IndexEntry = {
      artifactId,
      keywords,
      mode,
      path: "", // Path not stored in serialized format
    };

    index[currentSection].push(entry);
  }

  return index;
}
