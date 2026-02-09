/**
 * Sync templates
 *
 * Format-agnostic template bodies for sync plugins.
 * Each plugin wraps these with its own format (frontmatter, file naming, etc.).
 */

import skillRouterContent from "./skill-router.md" with { type: "text" };

/** Body of the skill router template (no frontmatter) */
export function getSkillRouterTemplate(): string {
  return skillRouterContent;
}
