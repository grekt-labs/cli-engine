/**
 * GitHub Container Registry (GHCR) client
 *
 * Implementation for self-hosted artifact registries using GitHub's
 * Container Registry (GHCR) with OCI Distribution Spec.
 *
 * Download (pull): Native TypeScript via OCI client
 * Publish (push): Shells out to `oras` CLI
 *
 * @see https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
 */

import { validateTarballContents, type FileSystem, type HttpClient, type ShellExecutor } from "#/core";
import type {
  RegistryClient,
  ResolvedRegistry,
  DownloadResult,
  PublishResult,
  RegistryArtifactInfo,
  VersionInfo,
} from "../registry.types";
import { hashDirectory, calculateIntegrity } from "#/artifact";
import { sortVersionsDesc, getHighestVersion, isValidSemver } from "#/version";
import { OciClient, GREKT_MEDIA_TYPES } from "#/oci";

const DEFAULT_GHCR_HOST = "ghcr.io";

export class GitHubRegistryClient implements RegistryClient {
  private host: string;
  private namespace: string;
  private token?: string;
  private prefix?: string;
  private http: HttpClient;
  private fs: FileSystem;
  private shell: ShellExecutor;
  private ociClient: OciClient;

  constructor(
    registry: ResolvedRegistry,
    http: HttpClient,
    fs: FileSystem,
    shell: ShellExecutor
  ) {
    if (!registry.project) {
      throw new Error(
        "GitHub registry requires 'project' field in config (your GHCR namespace, e.g., 'myorg' for ghcr.io/myorg/*)"
      );
    }

    this.host = registry.host || DEFAULT_GHCR_HOST;
    this.token = registry.token;
    this.prefix = registry.prefix;
    this.http = http;
    this.fs = fs;
    this.shell = shell;
    this.namespace = registry.project;

    // Initialize OCI client for pull operations
    this.ociClient = new OciClient(
      { host: this.host, token: this.token },
      http
    );
  }

  /**
   * Get OCI repository name for an artifact
   */
  private getRepositoryName(artifactId: string): string {
    const match = artifactId.match(/^@[^/]+\/(.+)$/);
    const name = match ? match[1]! : artifactId;

    if (this.prefix) {
      return `${this.namespace}/${this.prefix}-${name}`;
    }

    return `${this.namespace}/${name}`;
  }

  /**
   * Get artifact name without scope
   */
  private getArtifactName(artifactId: string): string {
    const match = artifactId.match(/^@[^/]+\/(.+)$/);
    return match ? match[1]! : artifactId;
  }

  async download(
    artifactId: string,
    version: string | undefined,
    targetDir: string
  ): Promise<DownloadResult> {
    if (!this.namespace) {
      return {
        success: false,
        error: "GitHub registry requires namespace. Set 'project' in config or use a scoped artifact ID.",
      };
    }

    try {
      const repoName = this.getRepositoryName(artifactId);

      // If no version specified, get the latest
      let resolvedVersion = version;
      if (!resolvedVersion) {
        const latest = await this.getLatestVersion(artifactId);
        if (!latest) {
          return {
            success: false,
            error: `No versions found for artifact: ${artifactId}`,
          };
        }
        resolvedVersion = latest;
      }

      // Pull the artifact layer using OCI client
      const pullResult = await this.ociClient.pullArtifactLayer(repoName, resolvedVersion);

      if (!pullResult.success || !pullResult.data) {
        return {
          success: false,
          error: pullResult.error ?? "Failed to pull artifact",
        };
      }

      // Write to temp file
      const tempTarball = generateSecureTempPath();
      this.fs.writeFileBinary(tempTarball, pullResult.data);

      // Validate tarball contents BEFORE extraction (prevents path traversal)
      const validation = validateTarballContents(this.shell, tempTarball, targetDir, 1);
      if (!validation.safe) {
        this.fs.unlink(tempTarball);
        return {
          success: false,
          error: `Unsafe tarball: ${validation.violations.join(", ")}`,
        };
      }

      this.fs.mkdir(targetDir, { recursive: true });

      // Extract tarball
      const tarArgs = ["-xzf", tempTarball, "-C", targetDir, "--strip-components=1"];
      this.shell.execFile("tar", tarArgs);

      // Clean up temp file
      if (this.fs.exists(tempTarball)) {
        this.fs.unlink(tempTarball);
      }

      // Calculate integrity after extraction
      const fileHashes = hashDirectory(this.fs, targetDir);
      const integrity = calculateIntegrity(fileHashes);

      // Build resolved URL (immutable reference)
      const resolved = `oci://${this.host}/${repoName}:${resolvedVersion}`;

      return {
        success: true,
        version: resolvedVersion,
        resolved,
        integrity,
        fileHashes,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: `Download failed: ${message}` };
    }
  }

  async publish(
    artifactId: string,
    version: string,
    tarballPath: string
  ): Promise<PublishResult> {
    if (!this.token) {
      return {
        success: false,
        error: "GitHub registry requires authentication. Set token in .grekt/config.yaml or GITHUB_TOKEN env var.",
      };
    }

    if (!this.namespace) {
      return {
        success: false,
        error: "GitHub registry requires namespace. Set 'project' in config.",
      };
    }

    // Check if oras is installed
    if (!this.isOrasInstalled()) {
      return {
        success: false,
        error: "Publishing to GitHub registry requires 'oras' CLI. Install from https://oras.land/",
      };
    }

    // Prevent overwriting existing versions
    const alreadyExists = await this.versionExists(artifactId, version);
    if (alreadyExists) {
      return {
        success: false,
        error: `Version ${version} already exists for ${artifactId}. Cannot overwrite published versions.`,
      };
    }

    try {
      const repoName = this.getRepositoryName(artifactId);
      const fullRef = `${this.host}/${repoName}:${version}`;

      // Use oras push with grekt media type and inline auth
      // oras push --username USERNAME --password TOKEN ghcr.io/namespace/name:version artifact.tar.gz:mediatype
      const orasArgs = [
        "push",
        "--username", "USERNAME",
        "--password", this.token,
        fullRef,
        `${tarballPath}:${GREKT_MEDIA_TYPES.layer}`,
      ];

      this.shell.execFile("oras", orasArgs);

      return {
        success: true,
        url: `oci://${fullRef}`,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  async getLatestVersion(artifactId: string): Promise<string | null> {
    const versions = await this.listVersions(artifactId);
    return getHighestVersion(versions);
  }

  async versionExists(artifactId: string, version: string): Promise<boolean> {
    if (!this.namespace) return false;

    const repoName = this.getRepositoryName(artifactId);
    return this.ociClient.tagExists(repoName, version);
  }

  async listVersions(artifactId: string): Promise<string[]> {
    if (!this.namespace) return [];

    const repoName = this.getRepositoryName(artifactId);
    const result = await this.ociClient.listTags(repoName);

    if (!result.success || !result.tags) {
      return [];
    }

    // Filter to only semver tags and sort descending
    const semverTags = result.tags.filter(isValidSemver);
    return sortVersionsDesc(semverTags);
  }

  async getArtifactInfo(artifactId: string): Promise<RegistryArtifactInfo | null> {
    const versions = await this.listVersions(artifactId);

    if (versions.length === 0) {
      return null;
    }

    const versionInfos: VersionInfo[] = versions.map((version) => ({
      version,
    }));

    return {
      artifactId,
      latestVersion: versions[0] ?? "",
      versions: versionInfos,
    };
  }

  /**
   * Check if oras CLI is installed
   */
  private isOrasInstalled(): boolean {
    try {
      this.shell.execFile("oras", ["version"]);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Generate a secure temporary file path using crypto.randomUUID.
 */
function generateSecureTempPath(): string {
  const crypto = require("crypto");
  const uuid = crypto.randomUUID();
  return `/tmp/grekt-github-${uuid}.tar.gz`;
}
