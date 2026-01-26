/**
 * Registry types and interfaces
 *
 * Core abstraction layer for registry operations.
 * The core NEVER knows what GitLab/GitHub is - only that there's
 * "a registry client" with download/publish methods.
 */

// Re-export types from schemas to avoid duplication
export type { LocalConfig, RegistryEntry } from "#/schemas";

export type RegistryType = "gitlab" | "github" | "default";

/**
 * Normalized registry configuration.
 * Created by resolver from raw config, used by factory to create clients.
 */
export interface ResolvedRegistry {
  type: RegistryType;
  host: string;
  project?: string;
  token?: string;
}

/**
 * Result from download operation
 */
export interface DownloadResult {
  success: boolean;
  version?: string;
  resolved?: string;
  deprecationMessage?: string;
  /** Integrity hash of the extracted artifact (sha256:...) */
  integrity?: string;
  /** Per-file hashes for lockfile storage */
  fileHashes?: Record<string, string>;
  /** Error message if success is false */
  error?: string;
}

/**
 * Result from publish operation
 */
export interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Registry client interface.
 * All registry implementations must implement this interface.
 */
export interface RegistryClient {
  /**
   * Download an artifact to the target directory
   */
  download(
    artifactId: string,
    version: string | undefined,
    targetDir: string
  ): Promise<DownloadResult>;

  /**
   * Publish an artifact tarball
   */
  publish(
    artifactId: string,
    version: string,
    tarballPath: string
  ): Promise<PublishResult>;

  /**
   * Get the latest version of an artifact
   */
  getLatestVersion(artifactId: string): Promise<string | null>;

  /**
   * Check if a specific version exists
   */
  versionExists(artifactId: string, version: string): Promise<boolean>;

  /**
   * List all versions of an artifact (sorted desc by default)
   */
  listVersions(artifactId: string): Promise<string[]>;
}

/**
 * Source types for artifact origins
 */
export type SourceType = "registry" | "github" | "gitlab";

/**
 * Parsed source information
 */
export interface ParsedSource {
  /** Source type */
  type: SourceType;
  /** For registry: artifact ID. For git: owner/repo */
  identifier: string;
  /** Git ref (tag, branch, commit). Defaults to HEAD/main */
  ref?: string;
  /** For self-hosted GitLab: the host */
  host?: string;
  /** Original source string */
  raw: string;
}

/**
 * Publisher result
 */
export interface PublisherResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Publisher context with all necessary information
 */
export interface PublishContext {
  artifactId: string;
  version: string;
  tarballPath: string;
  scope: string;
  projectRoot: string;
}

/**
 * Publisher interface - Strategy pattern for different registry types
 */
export interface Publisher {
  readonly type: string;
  versionExists(ctx: PublishContext): Promise<boolean>;
  publish(ctx: PublishContext): Promise<PublisherResult>;
}

/**
 * Options for tarball download and extraction
 */
export interface DownloadOptions {
  headers?: Record<string, string>;
  stripComponents?: number;
}

/**
 * Result from tarball download operation
 */
export interface TarballDownloadResult {
  success: boolean;
  error?: string;
}
