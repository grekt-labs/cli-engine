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

// Re-export for convenience
export type { ArtifactIndex, IndexEntry, ArtifactMode };
