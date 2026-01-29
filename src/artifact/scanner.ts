import { join, relative } from "path";
import { parse } from "yaml";
import type { FileSystem } from "#/core";
import { ArtifactManifestSchema, type ArtifactManifest, type ArtifactFrontmatter } from "#/schemas";
import { parseFrontmatter } from "./frontmatter";
import type {
  InvalidFileReason,
  InvalidFile,
  ParsedComponent,
  ArtifactInfo,
} from "./scanner.types";

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

type JsonParseResult =
  | { success: true; parsed: ParsedComponent }
  | { success: false; reason: InvalidFileReason; missingFields?: string[] };

function getReasonFromMissingFields(missingFields: string[]): InvalidFileReason {
  if (missingFields.includes("grk-type")) return "missing-type";
  if (missingFields.includes("grk-name")) return "missing-name";
  return "missing-description";
}

function parseJsonComponent(content: string): JsonParseResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content);
  } catch {
    return { success: false, reason: "invalid-json" };
  }

  const missingFields: string[] = [];
  if (!data["grk-type"]) missingFields.push("grk-type");
  if (!data["grk-name"]) missingFields.push("grk-name");
  if (!data["grk-description"]) missingFields.push("grk-description");

  if (missingFields.length > 0) {
    const reason = getReasonFromMissingFields(missingFields);
    return { success: false, reason, missingFields };
  }

  if (data["grk-type"] !== "mcp" && data["grk-type"] !== "rule") {
    return { success: false, reason: "invalid-type-for-format" };
  }

  const frontmatter: ArtifactFrontmatter = {
    "grk-type": data["grk-type"] as "mcp" | "rule",
    "grk-name": data["grk-name"] as string,
    "grk-description": data["grk-description"] as string,
  };

  const { "grk-type": _type, "grk-name": _name, "grk-description": _desc, ...rest } = data;

  return { success: true, parsed: { frontmatter, content: rest } };
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
    invalidFiles: [],
  };

  const files = findFiles(fs, artifactDir);

  for (const filePath of files.mdFiles) {
    const content = fs.readFile(filePath);
    const result = parseFrontmatter(content);
    const relativePath = relative(artifactDir, filePath);

    if (!result.success) {
      info.invalidFiles.push({
        path: relativePath,
        reason: result.reason,
        missingFields: result.missingFields,
      });
      continue;
    }

    const { parsed } = result;

    switch (parsed.frontmatter["grk-type"]) {
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

  for (const filePath of files.jsonFiles) {
    const content = fs.readFile(filePath);
    const result = parseJsonComponent(content);
    const relativePath = relative(artifactDir, filePath);

    if (!result.success) {
      info.invalidFiles.push({
        path: relativePath,
        reason: result.reason,
        missingFields: result.missingFields,
      });
      continue;
    }

    const { parsed } = result;

    switch (parsed.frontmatter["grk-type"]) {
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

export type {
  InvalidFileReason,
  InvalidFile,
  ParsedComponent,
  ArtifactInfo,
} from "./scanner.types";
