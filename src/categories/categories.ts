/**
 * Central definition of artifact component categories.
 *
 * Single source of truth. All categories are plural.
 * Add new categories here and they propagate everywhere.
 */

export const CATEGORIES = ["agents", "skills", "commands", "mcps", "rules"] as const;

export type Category = (typeof CATEGORIES)[number];

export type FileFormat = "md" | "json";

export interface CategoryConfig {
  singular: string;
  defaultPath: string;
  allowedFormats: FileFormat[];
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  agents: { singular: "agent", defaultPath: "agents", allowedFormats: ["md"] },
  skills: { singular: "skill", defaultPath: "skills", allowedFormats: ["md"] },
  commands: { singular: "command", defaultPath: "commands", allowedFormats: ["md"] },
  mcps: { singular: "mcp", defaultPath: "mcps", allowedFormats: ["json"] },
  rules: { singular: "rule", defaultPath: "rules", allowedFormats: ["json"] },
};

export function isValidCategory(value: string): value is Category {
  return CATEGORIES.includes(value as Category);
}

export function getCategoriesForFormat(format: FileFormat): Category[] {
  return CATEGORIES.filter((cat) => CATEGORY_CONFIG[cat].allowedFormats.includes(format));
}

export function getSingular(category: Category): string {
  return CATEGORY_CONFIG[category].singular;
}

export function getDefaultPath(category: Category): string {
  return CATEGORY_CONFIG[category].defaultPath;
}

/**
 * Create an object with all categories as keys, initialized with a default value.
 * Useful for creating category-indexed records with proper TypeScript typing.
 * The cast is safe because CATEGORIES is the source of truth.
 */
export function createCategoryRecord<T>(defaultValue: () => T): Record<Category, T> {
  return Object.fromEntries(
    CATEGORIES.map((cat) => [cat, defaultValue()])
  ) as Record<Category, T>;
}
