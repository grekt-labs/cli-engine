import type { ArtifactFrontmatter, ArtifactManifest } from "#/schemas";
import type { Category } from "#/categories";

// Reasons why a file was considered invalid
export type InvalidFileReason =
  | "no-frontmatter"
  | "invalid-frontmatter"
  | "missing-type"
  | "missing-name"
  | "missing-description"
  | "invalid-json"
  | "invalid-type-for-format";

export interface InvalidFile {
  path: string;
  reason: InvalidFileReason;
  missingFields?: string[];
}

export interface ParsedArtifact {
  frontmatter: ArtifactFrontmatter;
  content: string;
}

// Parsed component for JSON files (mcp, rule)
export interface ParsedComponent {
  frontmatter: ArtifactFrontmatter;
  content: unknown;
}

// Scanned file entry (path + parsed content)
export interface ScannedFile {
  path: string;
  parsed: ParsedArtifact | ParsedComponent;
}

// ArtifactInfo with dynamic category keys
export type ArtifactInfo = {
  manifest: ArtifactManifest;
  invalidFiles: InvalidFile[];
} & Record<Category, ScannedFile[]>;
