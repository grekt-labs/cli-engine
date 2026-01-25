import { join, relative } from "path";
import { parse } from "yaml";
import type { FileSystem } from "#/core";
import { ArtifactManifestSchema, type ArtifactManifest } from "#/schemas";
import { parseFrontmatter, type ParsedArtifact } from "./frontmatter";

export interface ArtifactInfo {
  manifest: ArtifactManifest;
  agent?: { path: string; parsed: ParsedArtifact };
  skills: { path: string; parsed: ParsedArtifact }[];
  commands: { path: string; parsed: ParsedArtifact }[];
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

function findMdFiles(fs: FileSystem, dir: string): string[] {
  const results: string[] = [];

  const entries = fs.readdir(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = fs.stat(fullPath);

    if (stat.isDirectory) {
      results.push(...findMdFiles(fs, fullPath));
    } else if (entry.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}

export function scanArtifact(fs: FileSystem, artifactDir: string): ArtifactInfo | null {
  const manifest = readArtifactManifest(fs, artifactDir);
  if (!manifest) return null;

  const info: ArtifactInfo = {
    manifest,
    skills: [],
    commands: [],
  };

  // Scan for .md files recursively
  const mdFiles = findMdFiles(fs, artifactDir);

  for (const filePath of mdFiles) {
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
    }
  }

  return info;
}
