import { describe, test, expect } from "bun:test";
import { GitHubRegistryClient } from "./github";
import {
  createMockHttpClient,
  createMockFileSystem,
  createMockShellExecutor,
  jsonResponse,
} from "#/test-utils/mocks";
import type { ResolvedRegistry } from "../registry.types";

describe("GitHubRegistryClient", () => {
  const createClient = (registry: Partial<ResolvedRegistry> = {}) => {
    const fullRegistry: ResolvedRegistry = {
      type: "github",
      host: "ghcr.io",
      project: "myorg",
      ...registry,
    };
    const http = createMockHttpClient();
    const fs = createMockFileSystem();
    const shell = createMockShellExecutor({ oras: "" });

    return {
      client: new GitHubRegistryClient(fullRegistry, http, fs, shell),
      http,
      fs,
      shell,
    };
  };

  describe("constructor", () => {
    test("throws when project field is missing", () => {
      const registry: ResolvedRegistry = {
        type: "github",
        host: "ghcr.io",
        // project is missing
      };
      const http = createMockHttpClient();
      const fs = createMockFileSystem();
      const shell = createMockShellExecutor();

      expect(
        () => new GitHubRegistryClient(registry, http, fs, shell)
      ).toThrow("GitHub registry requires 'project' field in config");
    });

    test("accepts registry with project field", () => {
      const registry: ResolvedRegistry = {
        type: "github",
        host: "ghcr.io",
        project: "myorg",
      };
      const http = createMockHttpClient();
      const fs = createMockFileSystem();
      const shell = createMockShellExecutor();

      expect(
        () => new GitHubRegistryClient(registry, http, fs, shell)
      ).not.toThrow();
    });
  });

  describe("folder configuration", () => {
    test("prepends folder to repository name when configured", async () => {
      let requestedRepo = "";

      const http = createMockHttpClient();
      // Mock OCI listTags endpoint
      http.fetch = async (url: string) => {
        // Extract repo name from URL: /v2/{repo}/tags/list
        const match = url.match(/\/v2\/(.+)\/tags\/list/);
        if (match) {
          requestedRepo = match[1]!;
        }
        return jsonResponse({ tags: [] });
      };

      const registry: ResolvedRegistry = {
        type: "github",
        host: "ghcr.io",
        project: "myorg",
        folder: "frontend",
      };

      const client = new GitHubRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      await client.listVersions("@scope/utils");

      // Repository name should be "myorg/frontend/utils"
      expect(requestedRepo).toBe("myorg/frontend/utils");
    });

    test("supports nested folder paths", async () => {
      let requestedRepo = "";

      const http = createMockHttpClient();
      http.fetch = async (url: string) => {
        const match = url.match(/\/v2\/(.+)\/tags\/list/);
        if (match) {
          requestedRepo = match[1]!;
        }
        return jsonResponse({ tags: [] });
      };

      const registry: ResolvedRegistry = {
        type: "github",
        host: "ghcr.io",
        project: "myorg",
        folder: "packages/frontend",
      };

      const client = new GitHubRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      await client.listVersions("@scope/utils");

      // Repository name should be "myorg/packages/frontend/utils"
      expect(requestedRepo).toBe("myorg/packages/frontend/utils");
    });

    test("works without folder (backwards compatible)", async () => {
      let requestedRepo = "";

      const http = createMockHttpClient();
      http.fetch = async (url: string) => {
        const match = url.match(/\/v2\/(.+)\/tags\/list/);
        if (match) {
          requestedRepo = match[1]!;
        }
        return jsonResponse({ tags: [] });
      };

      const registry: ResolvedRegistry = {
        type: "github",
        host: "ghcr.io",
        project: "myorg",
        // no folder
      };

      const client = new GitHubRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      await client.listVersions("@scope/utils");

      // Repository name should just be "myorg/utils" (no folder)
      expect(requestedRepo).toBe("myorg/utils");
    });

    test("folder appears in resolved OCI URL after download", async () => {
      const http = createMockHttpClient();
      // Mock OCI endpoints
      http.fetch = async (url: string) => {
        if (url.includes("/tags/list")) {
          return jsonResponse({ tags: ["1.0.0"] });
        }
        if (url.includes("/manifests/")) {
          return jsonResponse({
            schemaVersion: 2,
            mediaType: "application/vnd.oci.image.manifest.v1+json",
            layers: [{
              mediaType: "application/vnd.grekt.artifact.layer.v1.tar+gzip",
              digest: "sha256:abc123",
              size: 100,
            }],
          });
        }
        if (url.includes("/blobs/")) {
          return new Response(Buffer.from("fake-tarball"), {
            status: 200,
            headers: { "Content-Type": "application/octet-stream" },
          });
        }
        return jsonResponse({});
      };

      const fs = createMockFileSystem();
      const shell = createMockShellExecutor({ tar: "" });
      fs.files.set("/target/file.md", { content: "content", isDirectory: false });

      const registry: ResolvedRegistry = {
        type: "github",
        host: "ghcr.io",
        project: "myorg",
        folder: "frontend",
      };

      const client = new GitHubRegistryClient(registry, http, fs, shell);
      const result = await client.download("@scope/utils", "1.0.0", "/target");

      expect(result.success).toBe(true);
      // Resolved URL should include folder in the path
      expect(result.resolved).toBe("oci://ghcr.io/myorg/frontend/utils:1.0.0");
    });
  });

  describe("listVersions", () => {
    test("returns versions sorted by semver descending", async () => {
      const http = createMockHttpClient();
      http.fetch = async (url: string) => {
        if (url.includes("/tags/list")) {
          return jsonResponse({ tags: ["1.0.0", "2.0.0", "10.0.0"] });
        }
        return jsonResponse({});
      };

      const registry: ResolvedRegistry = {
        type: "github",
        host: "ghcr.io",
        project: "myorg",
      };
      const client = new GitHubRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      const result = await client.listVersions("@scope/artifact");

      expect(result).toEqual(["10.0.0", "2.0.0", "1.0.0"]);
    });

    test("filters out non-semver tags", async () => {
      const http = createMockHttpClient();
      http.fetch = async (url: string) => {
        if (url.includes("/tags/list")) {
          return jsonResponse({ tags: ["1.0.0", "latest", "main", "2.0.0"] });
        }
        return jsonResponse({});
      };

      const registry: ResolvedRegistry = {
        type: "github",
        host: "ghcr.io",
        project: "myorg",
      };
      const client = new GitHubRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      const result = await client.listVersions("@scope/artifact");

      expect(result).toEqual(["2.0.0", "1.0.0"]);
    });
  });

  describe("publish", () => {
    test("returns error when no token provided", async () => {
      const { client } = createClient({ token: undefined });

      const result = await client.publish("@scope/artifact", "1.0.0", "/path/to/tarball.tar.gz");

      expect(result.success).toBe(false);
      expect(result.error).toContain("authentication");
    });

    test("returns error when oras is not installed", async () => {
      const registry: ResolvedRegistry = {
        type: "github",
        host: "ghcr.io",
        project: "myorg",
        token: "ghp_xxxx",
      };

      const http = createMockHttpClient();
      // versionExists checks if tag exists via OCI manifest endpoint
      http.fetch = async (url: string) => {
        if (url.includes("/manifests/")) {
          // Return 404 so versionExists returns false
          return new Response("Not Found", { status: 404 });
        }
        return jsonResponse({ tags: [] });
      };

      const fs = createMockFileSystem();
      // oras command throws = not installed
      const shell = createMockShellExecutor({
        oras: new Error("command not found: oras"),
      });

      const client = new GitHubRegistryClient(registry, http, fs, shell);
      const result = await client.publish("@scope/artifact", "1.0.0", "/path/to/tarball.tar.gz");

      expect(result.success).toBe(false);
      expect(result.error).toContain("oras");
    });
  });
});
