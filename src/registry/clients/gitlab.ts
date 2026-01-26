/**
 * GitLab Generic Package Registry client
 *
 * Implementation for self-hosted artifact registries using GitLab's
 * Generic Package Registry feature.
 *
 * All GitLab-specific logic is isolated here - the core never knows
 * what GitLab is.
 *
 * @see https://docs.gitlab.com/ee/user/packages/generic_packages/
 */

import type { FileSystem, HttpClient, ShellExecutor } from "#/core";
import type {
  RegistryClient,
  ResolvedRegistry,
  DownloadResult,
  PublishResult,
} from "../registry.types";
import { hashDirectory, calculateIntegrity } from "#/artifact";

interface GitLabPackage {
  id: number;
  name: string;
  version: string;
  package_type: string;
  created_at: string;
}

export class GitLabRegistryClient implements RegistryClient {
  private host: string;
  private project: string;
  private token?: string;
  private projectId?: string; // cached
  private http: HttpClient;
  private fs: FileSystem;
  private shell: ShellExecutor;

  constructor(
    registry: ResolvedRegistry,
    http: HttpClient,
    fs: FileSystem,
    shell: ShellExecutor
  ) {
    if (!registry.project) {
      throw new Error("GitLab registry requires 'project' field in config");
    }

    this.host = registry.host;
    this.project = registry.project;
    this.token = registry.token;
    this.http = http;
    this.fs = fs;
    this.shell = shell;
  }

  /**
   * Get request headers for GitLab API
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "grekt-cli",
    };
    if (this.token) {
      headers["PRIVATE-TOKEN"] = this.token;
    }
    return headers;
  }

  /**
   * Get the numeric project ID from GitLab API
   * Required because some endpoints need numeric ID, not path
   */
  private async getProjectId(): Promise<string> {
    if (this.projectId) return this.projectId;

    const encodedPath = encodeURIComponent(this.project);
    const url = `https://${this.host}/api/v4/projects/${encodedPath}`;

    const response = await this.http.fetch(url, { headers: this.getHeaders() });

    if (!response.ok) {
      throw new Error(`Failed to get project info: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.projectId = String(data.id);
    return this.projectId;
  }

  /**
   * Encode artifact name for GitLab API
   * @scope/name → %40scope%2Fname
   */
  private encodePackageName(artifactId: string): string {
    return encodeURIComponent(artifactId);
  }

  /**
   * List all packages matching the artifact name
   */
  private async listPackages(artifactId: string): Promise<{ data: GitLabPackage[]; error?: string }> {
    try {
      const projectId = await this.getProjectId();
      const encodedName = this.encodePackageName(artifactId);

      // GitLab API: GET /projects/:id/packages?package_type=generic&package_name=:name
      const url = `https://${this.host}/api/v4/projects/${projectId}/packages?package_type=generic&package_name=${encodedName}`;

      const response = await this.http.fetch(url, { headers: this.getHeaders() });

      if (!response.ok) {
        if (response.status === 404) return { data: [] };
        return {
          data: [],
          error: `Failed to list packages: ${response.status} ${response.statusText}`
        };
      }

      return { data: await response.json() };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { data: [], error: `Failed to list packages: ${message}` };
    }
  }

  async download(
    artifactId: string,
    version: string | undefined,
    targetDir: string
  ): Promise<DownloadResult> {
    try {
      const projectId = await this.getProjectId();
      const encodedName = this.encodePackageName(artifactId);

      // If no version specified, get the latest
      let resolvedVersion = version;
      if (!resolvedVersion) {
        const latest = await this.getLatestVersion(artifactId);
        if (!latest) {
          return {
            success: false,
            error: `No versions found for artifact: ${artifactId}`
          };
        }
        resolvedVersion = latest;
      }

      // Download URL for generic package file
      // GET /projects/:id/packages/generic/:package_name/:package_version/:file_name
      const fileName = "artifact.tar.gz";
      const url = `https://${this.host}/api/v4/projects/${projectId}/packages/generic/${encodedName}/${resolvedVersion}/${fileName}`;

      const response = await this.http.fetch(url, {
        headers: this.getHeaders(),
        redirect: "follow",
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download tarball: ${response.status} ${response.statusText}`
        };
      }

      const buffer = await response.arrayBuffer();
      const tempTarball = `/tmp/grekt-gitlab-${Date.now()}.tar.gz`;
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
        resolved: url,
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
        error: "GitLab registry requires authentication. Set token in .grekt/config.yaml or GITLAB_TOKEN env var.",
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
      const projectId = await this.getProjectId();
      const encodedName = this.encodePackageName(artifactId);
      const fileName = "artifact.tar.gz";

      // Upload URL for generic package file
      // PUT /projects/:id/packages/generic/:package_name/:package_version/:file_name
      const url = `https://${this.host}/api/v4/projects/${projectId}/packages/generic/${encodedName}/${version}/${fileName}`;

      const body = this.fs.readFileBinary(tarballPath);

      const response = await this.http.fetch(url, {
        method: "PUT",
        headers: {
          ...this.getHeaders(),
          "Content-Type": "application/gzip",
        },
        body: new Uint8Array(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Upload failed: ${response.status} ${response.statusText} - ${errorText}`,
        };
      }

      return {
        success: true,
        url,
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
    return versions.length > 0 ? versions[0]! : null;
  }

  async versionExists(artifactId: string, version: string): Promise<boolean> {
    const versions = await this.listVersions(artifactId);
    return versions.includes(version);
  }

  async listVersions(artifactId: string): Promise<string[]> {
    const { data: packages } = await this.listPackages(artifactId);

    // Sort by created_at descending (newest first)
    packages.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return packages.map(p => p.version);
  }
}
