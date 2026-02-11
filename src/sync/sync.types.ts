/**
 * Sync module types
 *
 * Types for the sync system that copies artifacts to tool-specific targets.
 */

import type { Lockfile, ProjectConfig, ComponentPaths } from "#/schemas";
import type { Category } from "#/categories";

export interface SyncResult {
  created: string[];
  updated: string[];
  skipped: string[];
}

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  createTarget?: boolean;
  projectConfig?: ProjectConfig; // For mode filtering (core/lazy)
}

export interface SyncPreview {
  willCreate: string[];
  willUpdate: string[];
  willSkip: string[];
}

export interface SyncPlugin {
  /** Plugin identifier (e.g., "claude", "cursor") */
  id: string;

  /** Display name (e.g., "Claude", "Cursor") */
  name: string;

  /** Target file or directory (e.g., ".claude", ".cursorrules") */
  targetFile: string;

  /** Check if the target exists */
  targetExists(projectRoot: string): boolean;

  /** Sync artifacts to the target */
  sync(lockfile: Lockfile, projectRoot: string, options: SyncOptions): Promise<SyncResult>;

  /** Preview what would be synced (dry run) */
  preview(lockfile: Lockfile, projectRoot: string, options?: SyncOptions): SyncPreview;

  /** Get sync paths for each category (where files are copied to). Null for rules-only plugins. */
  getSyncPaths(): Record<Category, string> | null;

  /** Get target paths for cleanup. Null if not applicable. */
  getTargetPaths(): TargetPaths | null;

  /** Resolve the target path for a synced file within a category.
   * Accounts for plugin-specific path overrides (e.g., Claude skills use folders). */
  resolveTargetPath?(artifactId: string, category: Category, filePath: string): string;

  /** Optional one-time setup when target is first configured (e.g., create skill router) */
  setup?(projectRoot: string): void;
}

/** Paths associated with a target for cleanup */
export interface TargetPaths {
  targetDir: string;
  entryPoints: string[];
}

/** Configuration for folder-based plugins */
export interface FolderPluginConfig {
  id: string;
  name: string;
  targetDir: string;
  entryPoints?: string[];
  paths?: Partial<ComponentPaths>;
  generateRulesContent?: (lockfile: Lockfile) => string;
  getTargetPath?: (artifactId: string, category: string, filePath: string) => string | null;
  /** Optional setup function called when target is first configured */
  setup?: (projectRoot: string) => void;
}

/** Configuration for rules-only plugins */
export interface RulesOnlyPluginConfig {
  id: string;
  name: string;
  entryPoints: string[];
  generateRulesContent: (lockfile: Lockfile) => string;
}

