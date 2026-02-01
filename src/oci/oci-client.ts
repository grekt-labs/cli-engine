/**
 * OCI Distribution Spec client (pull operations only)
 *
 * Native TypeScript implementation for downloading artifacts from
 * OCI-compliant registries like GHCR.
 *
 * Push operations require the `oras` CLI tool.
 *
 * @see https://github.com/opencontainers/distribution-spec/blob/main/spec.md
 */

import type { HttpClient } from "#/core";
import type {
  OciRegistryConfig,
  OciManifest,
  PullManifestResult,
  PullBlobResult,
  ListTagsResult,
} from "./oci.types";
import { GREKT_MEDIA_TYPES } from "./oci.types";

export class OciClient {
  private host: string;
  private token?: string;
  private http: HttpClient;

  constructor(config: OciRegistryConfig, http: HttpClient) {
    this.host = config.host;
    this.token = config.token;
    this.http = http;
  }

  /**
   * Get request headers for OCI registry API
   */
  private getHeaders(accept?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "grekt-cli",
    };

    if (accept) {
      headers["Accept"] = accept;
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Build OCI registry URL
   * @param name - Repository name (e.g., "myorg/my-artifact")
   * @param path - API path after the name
   */
  private buildUrl(name: string, path: string): string {
    return `https://${this.host}/v2/${name}${path}`;
  }

  /**
   * Check if registry is accessible (ping /v2/)
   */
  async ping(): Promise<boolean> {
    try {
      const url = `https://${this.host}/v2/`;
      const response = await this.http.fetch(url, {
        headers: this.getHeaders(),
      });
      return response.ok || response.status === 401; // 401 means registry exists but needs auth
    } catch {
      return false;
    }
  }

  /**
   * Pull manifest for a specific tag/digest
   *
   * GET /v2/<name>/manifests/<reference>
   */
  async pullManifest(name: string, reference: string): Promise<PullManifestResult> {
    try {
      const url = this.buildUrl(name, `/manifests/${reference}`);

      // Accept both OCI manifest and Docker manifest for compatibility
      const acceptTypes = [
        GREKT_MEDIA_TYPES.manifest,
        "application/vnd.docker.distribution.manifest.v2+json",
      ].join(", ");

      const response = await this.http.fetch(url, {
        headers: this.getHeaders(acceptTypes),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: `Manifest not found: ${name}:${reference}`,
          };
        }
        return {
          success: false,
          error: `Failed to pull manifest: ${response.status} ${response.statusText}`,
        };
      }

      const manifest: OciManifest = await response.json();

      return {
        success: true,
        manifest,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to pull manifest: ${message}`,
      };
    }
  }

  /**
   * Pull a blob by digest
   *
   * GET /v2/<name>/blobs/<digest>
   */
  async pullBlob(name: string, digest: string): Promise<PullBlobResult> {
    try {
      const url = this.buildUrl(name, `/blobs/${digest}`);

      const response = await this.http.fetch(url, {
        headers: this.getHeaders(),
        redirect: "follow",
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: `Blob not found: ${digest}`,
          };
        }
        return {
          success: false,
          error: `Failed to pull blob: ${response.status} ${response.statusText}`,
        };
      }

      const buffer = await response.arrayBuffer();

      return {
        success: true,
        data: Buffer.from(buffer),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to pull blob: ${message}`,
      };
    }
  }

  /**
   * List all tags for a repository
   *
   * GET /v2/<name>/tags/list
   */
  async listTags(name: string): Promise<ListTagsResult> {
    try {
      const url = this.buildUrl(name, "/tags/list");

      const response = await this.http.fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Repository doesn't exist or has no tags
          return {
            success: true,
            tags: [],
          };
        }
        return {
          success: false,
          error: `Failed to list tags: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        tags: data.tags ?? [],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to list tags: ${message}`,
      };
    }
  }

  /**
   * Check if a specific tag exists
   */
  async tagExists(name: string, tag: string): Promise<boolean> {
    const result = await this.pullManifest(name, tag);
    return result.success;
  }

  /**
   * Pull the artifact layer (tarball) for a given tag
   *
   * Convenience method that:
   * 1. Pulls the manifest
   * 2. Finds the first layer with grekt media type
   * 3. Pulls that blob
   */
  async pullArtifactLayer(name: string, tag: string): Promise<PullBlobResult> {
    // Get manifest
    const manifestResult = await this.pullManifest(name, tag);
    if (!manifestResult.success || !manifestResult.manifest) {
      return {
        success: false,
        error: manifestResult.error ?? "Failed to pull manifest",
      };
    }

    const manifest = manifestResult.manifest;

    // Find the artifact layer
    // Accept both grekt-specific and generic tar+gzip media types
    const layer = manifest.layers.find(
      (l) =>
        l.mediaType === GREKT_MEDIA_TYPES.layer ||
        l.mediaType === "application/vnd.oci.image.layer.v1.tar+gzip"
    );

    if (!layer) {
      return {
        success: false,
        error: "No artifact layer found in manifest",
      };
    }

    // Pull the blob
    return this.pullBlob(name, layer.digest);
  }
}
