import { join, relative } from "path";
import { parse } from "yaml";
import type { FileSystem } from "#/core";
import { ArtifactManifestSchema, type ArtifactManifest, type ArtifactFrontmatter } from "#/schemas";
import { type Category, getCategoriesForFormat, createCategoryRecord, isValidCategory } from "#/categories";
import { parseFrontmatter } from "./frontmatter";
import type {
  InvalidFileReason,
  InvalidFile,
  ParsedComponent,
  ScannedFile,
  ArtifactInfo,
} from "./scanner.types";

const MD_CATEGORIES = getCategoriesForFormat("md");
const JSON_CATEGORIES = getCategoriesForFormat("json");

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

  const rawType = data["grk-type"];
  if (typeof rawType !== "string" || !isValidCategory(rawType)) {
    return { success: false, reason: "missing-type" };
  }
  if (!JSON_CATEGORIES.includes(rawType)) {
    return { success: false, reason: "invalid-type-for-format" };
  }

  const frontmatter: ArtifactFrontmatter = {
    "grk-type": rawType,
    "grk-name": data["grk-name"] as string,
    "grk-description": data["grk-description"] as string,
  };

  const { "grk-type": _type, "grk-name": _name, "grk-description": _desc, ...rest } = data;

  return { success: true, parsed: { frontmatter, content: rest } };
}

export function scanArtifact(fs: FileSystem, artifactDir: string): ArtifactInfo | null {
  const manifest = readArtifactManifest(fs, artifactDir);
  if (!manifest) return null;

  // Initialize info with empty arrays for all categories
  const info: ArtifactInfo = {
    manifest,
    invalidFiles: [],
    ...createCategoryRecord<ScannedFile[]>(() => []),
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
    const category = parsed.frontmatter["grk-type"];

    if (MD_CATEGORIES.includes(category)) {
      info[category].push({ path: relativePath, parsed });
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
    const category = parsed.frontmatter["grk-type"];

    if (JSON_CATEGORIES.includes(category)) {
      info[category].push({ path: relativePath, parsed });
    }
  }

  return info;
}

export type {
  InvalidFileReason,
  InvalidFile,
  ParsedComponent,
  ParsedArtifact,
  ScannedFile,
  ArtifactInfo,
} from "./scanner.types";
