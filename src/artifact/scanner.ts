import { join, relative } from "path";
import { parse } from "yaml";
import type { FileSystem } from "#/core";
import { ArtifactManifestSchema, type ArtifactManifest, type ArtifactFrontmatter } from "#/schemas";
import { parseFrontmatter, type ParsedArtifact } from "./frontmatter";

// Parsed component for JSON files (mcp, rule)
export interface ParsedComponent {
  frontmatter: ArtifactFrontmatter;
  content: unknown; // JSON content after type field
}

export interface ArtifactInfo {
  manifest: ArtifactManifest;
  agent?: { path: string; parsed: ParsedArtifact };
  skills: { path: string; parsed: ParsedArtifact }[];
  commands: { path: string; parsed: ParsedArtifact }[];
  mcps: { path: string; parsed: ParsedComponent }[];
  rules: { path: string; parsed: ParsedComponent }[];
}

function readArtifactManifest(fs: FileSystem, artifactDir: string): ArtifactManifest | null {
  const manifestPath = join(artifactDir, "grekt.yaml");
  if (!fs.exists(manifestPath)) return null;

  try {
    const content = fs.readFile(manifestPath);
    const raw = parse(content);
    return ArtifactManifestSchema.parse(raw);
  } catch {
    return null;
  }
}

interface FoundFiles {
  mdFiles: string[];
  jsonFiles: string[];
}

function findFiles(fs: FileSystem, dir: string): FoundFiles {
  const result: FoundFiles = { mdFiles: [], jsonFiles: [] };

  const entries = fs.readdir(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = fs.stat(fullPath);

    if (stat.isDirectory) {
      const nested = findFiles(fs, fullPath);
      result.mdFiles.push(...nested.mdFiles);
      result.jsonFiles.push(...nested.jsonFiles);
    } else if (entry.endsWith(".md")) {
      result.mdFiles.push(fullPath);
    } else if (entry.endsWith(".json") && entry !== "package.json") {
      result.jsonFiles.push(fullPath);
    }
  }

  return result;
}

// Parse JSON component files (mcp, rule)
function parseJsonComponent(content: string): ParsedComponent | null {
  try {
    const data = JSON.parse(content);

    // Validate required fields for JSON components
    if (!data.type || !data.name || !data.description) {
      return null;
    }

    // Only accept mcp and rule types for JSON files
    if (data.type !== "mcp" && data.type !== "rule") {
      return null;
    }

    const frontmatter: ArtifactFrontmatter = {
      type: data.type,
      name: data.name,
      description: data.description,
    };

    // Remove frontmatter fields from content
    const { type: _type, name: _name, description: _desc, ...rest } = data;

    return { frontmatter, content: rest };
  } catch {
    return null;
  }
}

export function scanArtifact(fs: FileSystem, artifactDir: string): ArtifactInfo | null {
  const manifest = readArtifactManifest(fs, artifactDir);
  if (!manifest) return null;

  const info: ArtifactInfo = {
    manifest,
    skills: [],
    commands: [],
    mcps: [],
    rules: [],
  };

  // Scan for .md and .json files recursively
  const files = findFiles(fs, artifactDir);

  // Process markdown files
  for (const filePath of files.mdFiles) {
    const content = fs.readFile(filePath);
    const parsed = parseFrontmatter(content);

    if (!parsed) continue;

    const relativePath = relative(artifactDir, filePath);

    switch (parsed.frontmatter.type) {
      case "agent":
        info.agent = { path: relativePath, parsed };
        break;
      case "skill":
        info.skills.push({ path: relativePath, parsed });
        break;
      case "command":
        info.commands.push({ path: relativePath, parsed });
        break;
      case "mcp":
      case "rule":
        // MD files can also define mcp/rule types
        break;
    }
  }

  // Process JSON files
  for (const filePath of files.jsonFiles) {
    const content = fs.readFile(filePath);
    const parsed = parseJsonComponent(content);

    if (!parsed) continue;

    const relativePath = relative(artifactDir, filePath);

    switch (parsed.frontmatter.type) {
      case "mcp":
        info.mcps.push({ path: relativePath, parsed });
        break;
      case "rule":
        info.rules.push({ path: relativePath, parsed });
        break;
    }
  }

  return info;
}
