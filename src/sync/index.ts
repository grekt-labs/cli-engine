/**
 * Sync module
 *
 * Types and constants for the sync system.
 * Implementation stays in CLI (file operations are tool-specific).
 */

export * from "./sync.types";

/** Block marker for untrusted content (index file) */
export const GREKT_UNTRUSTED_TAG = "grekt-untrusted-context";
export const GREKT_UNTRUSTED_START = `<${GREKT_UNTRUSTED_TAG}>`;
export const GREKT_UNTRUSTED_END = `</${GREKT_UNTRUSTED_TAG}>`;

/** Section header to detect if grekt block exists in context entry point */
export const GREKT_SECTION_HEADER = "## Grekt Artifacts (MANDATORY)";

/** Content block for context entry points (CLAUDE.md, etc.) */
export function generateDefaultBlockContent(): string {
  return `${GREKT_SECTION_HEADER}

**Always read \`.grekt/index\` at the start of a session.**`;
}
