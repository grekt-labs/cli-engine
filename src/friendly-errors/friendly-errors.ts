/**
 * Friendly Errors
 *
 * Standard utility for parsing YAML + Zod validation with human-readable errors.
 *
 * USAGE: Always use this utility when parsing user-facing config files (grekt.yaml,
 * grekt-workspace.yaml, lockfiles, etc.) to ensure consistent, helpful error messages.
 *
 * @example
 * ```ts
 * const result = safeParseYaml(content, MySchema, "grekt.yaml");
 * if (!result.success) {
 *   console.error(result.error.message);
 *   result.error.details?.forEach(d => console.error(`  ${d}`));
 *   process.exit(1);
 * }
 * const data = result.data;
 * ```
 */

import { parse as parseYaml, YAMLParseError } from "yaml";
import type { ZodType, ZodTypeDef, ZodError } from "zod";

export type ParseErrorType = "yaml" | "validation";

export interface FriendlyError {
  type: ParseErrorType;
  message: string;
  details?: string[];
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: FriendlyError };

function formatZodIssues(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
}

function formatYamlError(error: YAMLParseError): string {
  // Extract the useful part: "Nested mappings are not allowed in compact mappings"
  // from the full error which includes stack traces
  return error.message.split("\n")[0] ?? error.message;
}

/**
 * Parse YAML content and validate against a Zod schema.
 * Returns a result object with friendly error messages.
 *
 * @param content - Raw YAML string
 * @param schema - Zod schema to validate against
 * @param filepath - Optional file path for error context
 */
export function safeParseYaml<Output, Input = Output>(
  content: string,
  schema: ZodType<Output, ZodTypeDef, Input>,
  filepath?: string
): ParseResult<Output> {
  const fileContext = filepath ? ` in ${filepath}` : "";

  // Step 1: Parse YAML
  let raw: unknown;
  try {
    raw = parseYaml(content);
  } catch (err) {
    if (err instanceof YAMLParseError) {
      return {
        success: false,
        error: {
          type: "yaml",
          message: `Invalid YAML syntax${fileContext}`,
          details: [formatYamlError(err)],
        },
      };
    }
    return {
      success: false,
      error: {
        type: "yaml",
        message: `Failed to parse YAML${fileContext}`,
        details: [err instanceof Error ? err.message : String(err)],
      },
    };
  }

  // Step 2: Validate with Zod
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      error: {
        type: "validation",
        message: `Invalid configuration${fileContext}`,
        details: formatZodIssues(result.error),
      },
    };
  }

  return { success: true, data: result.data };
}
