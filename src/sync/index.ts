/**
 * Sync module
 *
 * Types and constants for the sync system.
 * Implementation stays in CLI (file operations are tool-specific).
 */

export * from "./sync.types";
export * from "./templates";

/** Block marker for untrusted content (index file) */
export const GREKT_UNTRUSTED_TAG = "grekt-untrusted-context";
export const GREKT_UNTRUSTED_START = `<${GREKT_UNTRUSTED_TAG}>`;
export const GREKT_UNTRUSTED_END = `</${GREKT_UNTRUSTED_TAG}>`;

/** Section header to detect if grekt block exists in context entry point */
export const GREKT_SECTION_HEADER = "**MANDATORY:**";

/** Shared entry point text used by all targets (built-in and custom) */
export const GREKT_ENTRY_POINT_TEXT = `${GREKT_SECTION_HEADER} Read \`.grekt/index\` at session start to discover tools that will help with the user's tasks. Use them when relevant. NEVER modify files inside \`.grekt/\`.`;

/** Content block for context entry points (CLAUDE.md, etc.) */
export function generateDefaultBlockContent(): string {
  return GREKT_ENTRY_POINT_TEXT;
}
