import type { ArtifactMode, ArtifactIndex, IndexEntry } from "#/schemas";

// Input for generating index entries
export interface IndexGeneratorInput {
  artifactId: string;
  keywords: string[];
  mode: ArtifactMode;
  components: {
    agents: string[]; // relative paths
    skills: string[];
    commands: string[];
    mcps: string[];
    rules: string[];
  };
}

// Options for serializing the index
export interface SerializeIndexOptions {
  /** Include terminology block for AIs that need term translation */
  includeTerminology?: boolean;
}

// Re-export for convenience
export type { ArtifactIndex, IndexEntry, ArtifactMode };
