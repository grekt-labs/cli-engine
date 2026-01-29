import type { ArtifactFrontmatter, ArtifactManifest } from "#/schemas";

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

export interface ArtifactInfo {
  manifest: ArtifactManifest;
  agent?: { path: string; parsed: ParsedArtifact };
  skills: { path: string; parsed: ParsedArtifact }[];
  commands: { path: string; parsed: ParsedArtifact }[];
  mcps: { path: string; parsed: ParsedComponent }[];
  rules: { path: string; parsed: ParsedComponent }[];
  invalidFiles: InvalidFile[];
}
