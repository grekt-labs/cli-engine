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
  RegistryArtifactInfo,
  VersionInfo,
} from "../registry.types";
import { hashDirectory, calculateIntegrity } from "#/artifact";
import { sortVersionsDesc, getHighestVersion } from "#/version";

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
  private async fetchMetadata(artifactId: string): Promise<{ data: ArtifactMetadata | null; error?: string }> {
    const metadataUrl = `${this.getBaseUrl()}/${artifactId}/metadata.json`;

    try {
      const response = await this.http.fetch(metadataUrl);
      if (!response.ok) {
        return {
          data: null,
          error: `Failed to fetch metadata: ${response.status} ${response.statusText}`
        };
      }
      return { data: await response.json() };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { data: null, error: `Failed to fetch metadata: ${message}` };
    }
  }

  async download(
    artifactId: string,
    version: string | undefined,
    targetDir: string
  ): Promise<DownloadResult> {
    const { data: metadata, error: metadataError } = await this.fetchMetadata(artifactId);
    if (!metadata) {
      return { success: false, error: metadataError || `Artifact not found: ${artifactId}` };
    }

    const resolvedVersion = version || metadata.latest;
    const tarballUrl = `${this.getBaseUrl()}/${artifactId}/${resolvedVersion}.tar.gz`;
    const deprecationMessage = metadata.deprecated[resolvedVersion];

    try {
      const response = await this.http.fetch(tarballUrl);
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download tarball: ${response.status} ${response.statusText}`
        };
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

      // Calculate integrity after extraction
      const fileHashes = hashDirectory(this.fs, targetDir);
      const integrity = calculateIntegrity(fileHashes);

      return {
        success: true,
        version: resolvedVersion,
        resolved: tarballUrl,
        deprecationMessage,
        integrity,
        fileHashes,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: `Download failed: ${message}` };
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
    const { data: metadata } = await this.fetchMetadata(artifactId);
    return metadata?.latest ?? null;
  }

  async versionExists(artifactId: string, version: string): Promise<boolean> {
    const { data: metadata } = await this.fetchMetadata(artifactId);
    if (!metadata) return false;

    // Check if version exists by trying to fetch it
    const tarballUrl = `${this.getBaseUrl()}/${artifactId}/${version}.tar.gz`;
    try {
      const response = await this.http.fetch(tarballUrl, { method: "HEAD" });
      return response.ok;
    } catch (err) {
      // HEAD request failed - version doesn't exist or network error
      return false;
    }
  }

  async listVersions(artifactId: string): Promise<string[]> {
    const { data: metadata } = await this.fetchMetadata(artifactId);
    if (!metadata?.versions) {
      return [];
    }

    // Sort by semver descending (highest version first)
    return sortVersionsDesc(metadata.versions);
  }

  async getArtifactInfo(artifactId: string): Promise<RegistryArtifactInfo | null> {
    const { data: metadata } = await this.fetchMetadata(artifactId);
    if (!metadata) {
      return null;
    }

    const sortedVersions = metadata.versions
      ? sortVersionsDesc(metadata.versions)
      : [];

    const versions: VersionInfo[] = sortedVersions.map(version => ({
      version,
      deprecated: metadata.deprecated[version],
    }));

    return {
      artifactId: metadata.name,
      latestVersion: getHighestVersion(sortedVersions) ?? metadata.latest,
      versions,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
    };
  }
}

