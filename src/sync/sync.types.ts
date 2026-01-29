/**
 * Sync module types
 *
 * Types for the sync system that copies artifacts to tool-specific targets.
 */

import type { Lockfile, ProjectConfig } from "#/schemas";

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
}

/** Configuration for folder-based plugins */
export interface FolderPluginConfig {
  id: string;
  name: string;
  targetDir: string;
  contextEntryPoint?: string;
  paths?: {
    agent?: string;
    skill?: string;
    command?: string;
    mcp?: string;
    rule?: string;
  };
  generateRulesContent?: (lockfile: Lockfile) => string;
}

/** Configuration for rules-only plugins */
export interface RulesOnlyPluginConfig {
  id: string;
  name: string;
  contextEntryPoint: string;
  generateRulesContent: (lockfile: Lockfile) => string;
}

