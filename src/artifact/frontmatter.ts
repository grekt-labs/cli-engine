import matter from "gray-matter";
import { ArtifactFrontmatterSchema } from "#/schemas";
import type { InvalidFileReason, ParsedArtifact } from "./scanner.types";

export type FrontmatterParseResult =
  | { success: true; parsed: ParsedArtifact }
  | { success: false; reason: InvalidFileReason; missingFields?: string[]; details?: string };

function getReasonFromMissingFields(missingFields: string[]): InvalidFileReason {
  if (missingFields.includes("grk-type")) return "missing-type";
  if (missingFields.includes("grk-name")) return "missing-name";
  return "missing-description";
}

export function parseFrontmatter(content: string): FrontmatterParseResult {
  let data: Record<string, unknown>;
  let body: string;

  try {
    const result = matter(content);
    data = result.data;
    body = result.content;
  } catch {
    return { success: false, reason: "no-frontmatter" };
  }

  if (!data || Object.keys(data).length === 0) {
    return { success: false, reason: "no-frontmatter" };
  }

  const missingFields: string[] = [];
  if (!data["grk-type"]) missingFields.push("grk-type");
  if (!data["grk-name"]) missingFields.push("grk-name");
  if (!data["grk-description"]) missingFields.push("grk-description");

  if (missingFields.length > 0) {
    const reason = getReasonFromMissingFields(missingFields);
    return { success: false, reason, missingFields };
  }

  const schemaResult = ArtifactFrontmatterSchema.safeParse(data);
  if (!schemaResult.success) {
    // Extract detailed error message from Zod
    const details = schemaResult.error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        const received = data[issue.path[0] as string];
        if (issue.code === "invalid_enum_value") {
          return `${path}: got '${received}', expected one of: ${(issue as { options: string[] }).options.join(", ")}`;
        }
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    return { success: false, reason: "invalid-frontmatter", details };
  }

  return { success: true, parsed: { frontmatter: schemaResult.data, content: body } };
}

export type { ParsedArtifact } from "./scanner.types";
