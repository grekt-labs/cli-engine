/**
 * Sync module
 *
 * Types and constants for the sync system.
 * Implementation stays in CLI (file operations are tool-specific).
 */

export * from "./sync.types";

/** Block marker tag for managed content (single line, inserted at start of file) */
export const GREKT_BLOCK_TAG = "grekt-untrusted-context";
export const GREKT_BLOCK_START = `<${GREKT_BLOCK_TAG}>`;
export const GREKT_BLOCK_END = `</${GREKT_BLOCK_TAG}>`;

/** Default block content for context entry points */
export function generateDefaultBlockContent(): string {
  return `${GREKT_BLOCK_START}This project uses grekt for AI artifact management. Index location: .grekt/index${GREKT_BLOCK_END}`;
}
