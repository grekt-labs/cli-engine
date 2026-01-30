import type { ArtifactMode, ArtifactIndex, IndexEntry } from "#/schemas";
import type { Category } from "#/categories";

// Component file paths indexed by category (for index generation)
export type CategoryFilePaths = Record<Category, string[]>;

// Input for generating index entries
export interface IndexGeneratorInput {
  artifactId: string;
  keywords: string[];
  mode: ArtifactMode;
  components: CategoryFilePaths;
}

// Options for serializing the index
export interface SerializeIndexOptions {
  /** Include terminology block for AIs that need term translation */
  includeTerminology?: boolean;
}

// Re-export for convenience
export type { ArtifactIndex, IndexEntry, ArtifactMode };
