import type { ArtifactIndex, IndexEntry } from "#/schemas";
import type { IndexGeneratorInput } from "./artifactIndex.types";

/**
 * Generate an artifact index from a list of artifacts.
 * The index contains all components from all artifacts, categorized by type.
 */
export function generateIndex(artifacts: IndexGeneratorInput[]): ArtifactIndex {
  const index: ArtifactIndex = {
    version: 1,
    agents: [],
    skills: [],
    commands: [],
    mcps: [],
    rules: [],
  };

  for (const artifact of artifacts) {
    const baseEntry = {
      artifactId: artifact.artifactId,
      keywords: artifact.keywords,
      mode: artifact.mode,
    };

    // Add agents
    for (const path of artifact.components.agents) {
      index.agents.push({ ...baseEntry, path });
    }

    // Add skills
    for (const path of artifact.components.skills) {
      index.skills.push({ ...baseEntry, path });
    }

    // Add commands
    for (const path of artifact.components.commands) {
      index.commands.push({ ...baseEntry, path });
    }

    // Add MCPs
    for (const path of artifact.components.mcps) {
      index.mcps.push({ ...baseEntry, path });
    }

    // Add rules
    for (const path of artifact.components.rules) {
      index.rules.push({ ...baseEntry, path });
    }
  }

  return index;
}

/**
 * Serialize index entries for a specific section.
 * Format: @scope/artifact:keyword1,keyword2,keyword3
 */
function serializeEntries(entries: IndexEntry[]): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    // Deduplicate by artifactId (one line per artifact per section)
    if (seen.has(entry.artifactId)) continue;
    seen.add(entry.artifactId);

    const keywords = entry.keywords.join(",");
    const modePrefix = entry.mode === "core" ? "*" : "";
    lines.push(`${modePrefix}${entry.artifactId}:${keywords}`);
  }

  return lines;
}

/**
 * Serialize the full index to a minified text format.
 *
 * Format:
 * [agents]
 * *@scope/artifact:keyword1,keyword2  (* = core mode)
 * @scope/other:keyword1,keyword2
 *
 * [skills]
 * @scope/artifact:keyword1,keyword2
 */
export function serializeIndex(index: ArtifactIndex): string {
  const sections: string[] = [];

  if (index.agents.length > 0) {
    sections.push("[agents]");
    sections.push(...serializeEntries(index.agents));
  }

  if (index.skills.length > 0) {
    sections.push("[skills]");
    sections.push(...serializeEntries(index.skills));
  }

  if (index.commands.length > 0) {
    sections.push("[commands]");
    sections.push(...serializeEntries(index.commands));
  }

  if (index.mcps.length > 0) {
    sections.push("[mcps]");
    sections.push(...serializeEntries(index.mcps));
  }

  if (index.rules.length > 0) {
    sections.push("[rules]");
    sections.push(...serializeEntries(index.rules));
  }

  return sections.join("\n");
}

/**
 * Parse a serialized index back into an ArtifactIndex object.
 * Used for reading existing index files.
 */
export function parseIndex(content: string): ArtifactIndex {
  const index: ArtifactIndex = {
    version: 1,
    agents: [],
    skills: [],
    commands: [],
    mcps: [],
    rules: [],
  };

  let currentSection: keyof Omit<ArtifactIndex, "version"> | null = null;

  const lines = content.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    // Section header
    const sectionMatch = line.match(/^\[(\w+)\]$/);
    if (sectionMatch) {
      const section = sectionMatch[1] as keyof Omit<ArtifactIndex, "version">;
      if (section in index && section !== "version") {
        currentSection = section;
      }
      continue;
    }

    if (!currentSection) continue;

    // Parse entry: [*]@scope/artifact:keyword1,keyword2
    const isCore = line.startsWith("*");
    const entryLine = isCore ? line.slice(1) : line;
    const colonIndex = entryLine.indexOf(":");

    if (colonIndex === -1) continue;

    const artifactId = entryLine.slice(0, colonIndex);
    const keywordsStr = entryLine.slice(colonIndex + 1);
    const keywords = keywordsStr ? keywordsStr.split(",") : [];

    const entry: IndexEntry = {
      artifactId,
      keywords,
      mode: isCore ? "core" : "lazy",
      path: "", // Path not stored in serialized format
    };

    index[currentSection].push(entry);
  }

  return index;
}
