/**
 * Default registry client
 *
 * Implementation for the public registry.grekt.com.
 * Uses simple HTTP fetches to download artifacts and metadata.
 */

import type { FileSystem, HttpClient, ShellExecutor } from "#/core";
import type { ArtifactMetadata } from "#/schemas";
import type {
  RegistryClient,
  ResolvedRegistry,
  DownloadResult,
  PublishResult,
} from "../registry.types";

export class DefaultRegistryClient implements RegistryClient {
  private host: string;
  private http: HttpClient;
  private fs: FileSystem;
  private shell: ShellExecutor;

  constructor(
    registry: ResolvedRegistry,
    http: HttpClient,
    fs: FileSystem,
    shell: ShellExecutor
  ) {
    this.host = registry.host;
    this.http = http;
    this.fs = fs;
    this.shell = shell;
  }

  private getBaseUrl(): string {
    return `https://${this.host}`;
  }

  /**
   * Fetch artifact metadata from registry
   */
  private async fetchMetadata(artifactId: string): Promise<ArtifactMetadata | null> {
    const metadataUrl = `${this.getBaseUrl()}/${artifactId}/metadata.json`;

    try {
      const response = await this.http.fetch(metadataUrl);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async download(
    artifactId: string,
    version: string | undefined,
    targetDir: string
  ): Promise<DownloadResult> {
    const metadata = await this.fetchMetadata(artifactId);
    if (!metadata) {
      return { success: false };
    }

    const resolvedVersion = version || metadata.latest;
    const tarballUrl = `${this.getBaseUrl()}/${artifactId}/${resolvedVersion}.tar.gz`;
    const deprecationMessage = metadata.deprecated[resolvedVersion];

    try {
      const response = await this.http.fetch(tarballUrl);
      if (!response.ok) {
        return { success: false };
      }

      const buffer = await response.arrayBuffer();
      const tempTarball = `/tmp/grekt-${Date.now()}.tar.gz`;
      this.fs.writeFileBinary(tempTarball, Buffer.from(buffer));

      this.fs.mkdir(targetDir, { recursive: true });
      this.shell.exec(`tar -xzf ${tempTarball} -C ${targetDir} --strip-components=1`);

      // Clean up temp file
      if (this.fs.exists(tempTarball)) {
        this.fs.unlink(tempTarball);
      }

      return {
        success: true,
        version: resolvedVersion,
        resolved: tarballUrl,
        deprecationMessage,
      };
    } catch {
      return { success: false };
    }
  }

  async publish(
    _artifactId: string,
    _version: string,
    _tarballPath: string
  ): Promise<PublishResult> {
    // Default registry publishing requires API authentication
    // This is handled separately via the auth layer in CLI
    return {
      success: false,
      error: "Publishing to default registry requires 'grekt login'. Use --s3 or configure a GitLab registry.",
    };
  }

  async getLatestVersion(artifactId: string): Promise<string | null> {
    const metadata = await this.fetchMetadata(artifactId);
    return metadata?.latest ?? null;
  }

  async versionExists(artifactId: string, version: string): Promise<boolean> {
    const metadata = await this.fetchMetadata(artifactId);
    if (!metadata) return false;

    // Check if version exists by trying to fetch it
    const tarballUrl = `${this.getBaseUrl()}/${artifactId}/${version}.tar.gz`;
    try {
      const response = await this.http.fetch(tarballUrl, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listVersions(_artifactId: string): Promise<string[]> {
    // Default registry doesn't expose version list via metadata
    // Return empty array - caller should use getLatestVersion
    return [];
  }
}
