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
  private tokenCache: Map<string, string> = new Map();

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
   * Parse WWW-Authenticate header from a 401 response
   *
   * Expected format: Bearer realm="<url>",service="<service>",scope="<scope>"
   */
  private parseWwwAuthenticate(
    header: string
  ): { realm: string; service: string; scope: string } | undefined {
    if (!header.startsWith("Bearer ")) {
      return undefined;
    }

    const params = header.slice("Bearer ".length);
    const realm = params.match(/realm="([^"]+)"/)?.[1];
    const service = params.match(/service="([^"]+)"/)?.[1];
    const scope = params.match(/scope="([^"]+)"/)?.[1];

    if (!realm || !service || !scope) {
      return undefined;
    }

    return { realm, service, scope };
  }

  /**
   * Exchange the PAT for a temporary registry Bearer token
   *
   * GHCR (and other OCI registries) require an OAuth2-like token exchange:
   * 1. Initial request returns 401 with WWW-Authenticate header
   * 2. Call the token endpoint with Basic auth (username:PAT)
   * 3. Use the returned token for subsequent requests
   */
  private async exchangeToken(
    wwwAuthenticate: string
  ): Promise<string | undefined> {
    const params = this.parseWwwAuthenticate(wwwAuthenticate);
    if (!params) {
      return undefined;
    }

    const cacheKey = `${params.service}:${params.scope}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const tokenUrl = new URL(params.realm);
    tokenUrl.searchParams.set("service", params.service);
    tokenUrl.searchParams.set("scope", params.scope);

    const basicAuth = Buffer.from(`USERNAME:${this.token}`).toString("base64");

    const response = await this.http.fetch(tokenUrl.toString(), {
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();
    const exchangedToken = data.token as string | undefined;

    if (exchangedToken) {
      this.tokenCache.set(cacheKey, exchangedToken);
    }

    return exchangedToken;
  }

  /**
   * Fetch with automatic token exchange on 401 responses
   *
   * OCI registries like GHCR don't accept PATs directly as Bearer tokens.
   * This method handles the challenge-response flow transparently:
   * 1. Make the request with current credentials
   * 2. If 401 with WWW-Authenticate, exchange PAT for a registry token
   * 3. Retry the request with the exchanged token
   */
  private async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const response = await this.http.fetch(url, options);

    if (response.status !== 401 || !this.token) {
      return response;
    }

    const wwwAuthenticate = response.headers.get("www-authenticate");
    if (!wwwAuthenticate) {
      return response;
    }

    const exchangedToken = await this.exchangeToken(wwwAuthenticate);
    if (!exchangedToken) {
      return response;
    }

    const retryHeaders = {
      ...options.headers,
      Authorization: `Bearer ${exchangedToken}`,
    } as Record<string, string>;

    return this.http.fetch(url, { ...options, headers: retryHeaders });
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

      const response = await this.authenticatedFetch(url, {
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

      const response = await this.authenticatedFetch(url, {
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

      const response = await this.authenticatedFetch(url, {
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
