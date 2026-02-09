/**
 * Sync templates
 *
 * Format-agnostic template bodies for sync plugins.
 * Each plugin wraps these with its own format (frontmatter, file naming, etc.).
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const DIST_DIR = dirname(fileURLToPath(import.meta.url));

/** Body of the skill router template (no frontmatter) */
export function getSkillRouterTemplate(): string {
  return readFileSync(join(DIST_DIR, "skill-router.md"), "utf-8");
}
