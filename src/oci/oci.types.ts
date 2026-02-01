/**
 * OCI Distribution Spec types
 *
 * Types for interacting with OCI-compliant registries (GHCR, Docker Hub, etc.)
 * Only what we need for pull operations - minimal surface area.
 *
 * @see https://github.com/opencontainers/distribution-spec/blob/main/spec.md
 * @see https://github.com/opencontainers/image-spec/blob/main/manifest.md
 */

/**
 * OCI content descriptor
 * References a blob (layer or config) by digest
 */
export interface OciDescriptor {
  /** Media type of the referenced content */
  mediaType: string;
  /** Digest of the content (e.g., sha256:abc123...) */
  digest: string;
  /** Size in bytes */
  size: number;
  /** Optional annotations */
  annotations?: Record<string, string>;
}

/**
 * OCI image manifest (v2)
 * Describes an artifact: config + layers
 */
export interface OciManifest {
  /** Schema version, always 2 for OCI */
  schemaVersion: 2;
  /** Media type of the manifest itself */
  mediaType: string;
  /** Config descriptor (artifact metadata) */
  config: OciDescriptor;
  /** Layer descriptors (actual content) */
  layers: OciDescriptor[];
  /** Optional annotations */
  annotations?: Record<string, string>;
}

/**
 * OCI tags list response
 * From GET /v2/<name>/tags/list
 */
export interface OciTagsList {
  /** Repository name */
  name: string;
  /** Available tags */
  tags: string[];
}

/**
 * grekt-specific media types for OCI artifacts
 */
export const GREKT_MEDIA_TYPES = {
  /** Manifest media type */
  manifest: "application/vnd.oci.image.manifest.v1+json",
  /** Config blob media type */
  config: "application/vnd.grekt.artifact.config.v1+json",
  /** Layer (tarball) media type */
  layer: "application/vnd.grekt.artifact.layer.v1.tar+gzip",
} as const;

/**
 * OCI registry connection info
 */
export interface OciRegistryConfig {
  /** Registry host (e.g., ghcr.io) */
  host: string;
  /** Bearer token for authentication */
  token?: string;
}

/**
 * Result from pulling a manifest
 */
export interface PullManifestResult {
  success: boolean;
  manifest?: OciManifest;
  error?: string;
}

/**
 * Result from pulling a blob
 */
export interface PullBlobResult {
  success: boolean;
  data?: Buffer;
  error?: string;
}

/**
 * Result from listing tags
 */
export interface ListTagsResult {
  success: boolean;
  tags?: string[];
  error?: string;
}
