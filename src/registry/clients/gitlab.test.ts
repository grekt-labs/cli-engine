import { describe, test, expect } from "bun:test";
import { GitLabRegistryClient } from "./gitlab";
import {
  createMockHttpClient,
  createMockFileSystem,
  createMockShellExecutor,
  jsonResponse,
  binaryResponse,
  errorResponse,
} from "#/test-utils/mocks";
import type { ResolvedRegistry } from "../registry.types";

describe("GitLabRegistryClient", () => {
  const createClient = (
    registry: Partial<ResolvedRegistry> = {},
    httpResponses = new Map<string, Response | (() => Response)>()
  ) => {
    const fullRegistry: ResolvedRegistry = {
      type: "gitlab",
      host: "gitlab.com",
      project: "group/project",
      ...registry,
    };
    const http = createMockHttpClient(httpResponses);
    const fs = createMockFileSystem();
    const shell = createMockShellExecutor({ "tar": "" });

    return {
      client: new GitLabRegistryClient(fullRegistry, http, fs, shell),
      http,
      fs,
      shell,
    };
  };

  describe("constructor", () => {
    test("throws when project field is missing", () => {
      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "gitlab.com",
        // project is missing
      };
      const http = createMockHttpClient();
      const fs = createMockFileSystem();
      const shell = createMockShellExecutor();

      expect(
        () => new GitLabRegistryClient(registry, http, fs, shell)
      ).toThrow("GitLab registry requires 'project' field in config");
    });

    test("accepts registry with project field", () => {
      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "gitlab.com",
        project: "group/project",
      };
      const http = createMockHttpClient();
      const fs = createMockFileSystem();
      const shell = createMockShellExecutor();

      expect(
        () => new GitLabRegistryClient(registry, http, fs, shell)
      ).not.toThrow();
    });

    test("normalizes host by stripping https:// prefix", async () => {
      const projectInfo = { id: 12345 };
      let requestedUrl = "";

      const http = createMockHttpClient();
      http.fetch = async (url: string) => {
        requestedUrl = url;
        if (url.includes("/packages?")) return jsonResponse([]);
        return jsonResponse(projectInfo);
      };

      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "https://gitlab.example.com",
        project: "group/project",
      };

      const client = new GitLabRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      await client.listVersions("@scope/artifact");

      expect(requestedUrl).toContain("https://gitlab.example.com/api/v4");
      expect(requestedUrl).not.toContain("https://https://");
    });

    test("normalizes host by stripping http:// prefix", async () => {
      const projectInfo = { id: 12345 };
      let requestedUrl = "";

      const http = createMockHttpClient();
      http.fetch = async (url: string) => {
        requestedUrl = url;
        if (url.includes("/packages?")) return jsonResponse([]);
        return jsonResponse(projectInfo);
      };

      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "http://gitlab.internal",
        project: "group/project",
      };

      const client = new GitLabRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      await client.listVersions("@scope/artifact");

      expect(requestedUrl).toContain("https://gitlab.internal/api/v4");
      expect(requestedUrl).not.toContain("http://");
    });

    test("normalizes project by stripping leading slash", async () => {
      const projectInfo = { id: 12345 };
      let projectUrl = "";

      const http = createMockHttpClient();
      http.fetch = async (url: string) => {
        if (url.includes("/projects/") && !url.includes("/packages")) {
          projectUrl = url;
        }
        if (url.includes("/packages?")) return jsonResponse([]);
        return jsonResponse(projectInfo);
      };

      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "gitlab.com",
        project: "/group/subgroup/project",
      };

      const client = new GitLabRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      await client.listVersions("@scope/artifact");

      expect(projectUrl).toContain("group%2Fsubgroup%2Fproject");
      expect(projectUrl).not.toContain("%2Fgroup");
    });
  });

  describe("error handling", () => {
    test("returns clear error when connection fails", async () => {
      const http = createMockHttpClient();
      http.fetch = async () => {
        throw new Error("fetch failed");
      };

      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "gitlab.unreachable.com",
        project: "group/project",
      };

      const client = new GitLabRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      const result = await client.download("@scope/artifact", "1.0.0", "/target");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot connect to GitLab");
      expect(result.error).toContain("gitlab.unreachable.com");
    });

    test("returns clear error on 401 authentication failure", async () => {
      const http = createMockHttpClient();
      http.fetch = async () => errorResponse(401, "Unauthorized");

      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "gitlab.com",
        project: "group/project",
        token: "bad-token",
      };

      const client = new GitLabRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      const result = await client.download("@scope/artifact", "1.0.0", "/target");

      expect(result.success).toBe(false);
      expect(result.error).toContain("authentication failed");
    });

    test("returns clear error on 404 project not found", async () => {
      const http = createMockHttpClient();
      http.fetch = async () => errorResponse(404, "Not Found");

      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "gitlab.com",
        project: "nonexistent/project",
      };

      const client = new GitLabRegistryClient(registry, http, createMockFileSystem(), createMockShellExecutor());
      const result = await client.download("@scope/artifact", "1.0.0", "/target");

      expect(result.success).toBe(false);
      expect(result.error).toContain("project not found");
      expect(result.error).toContain("nonexistent/project");
    });
  });

  describe("download", () => {
    test("downloads artifact successfully", async () => {
      const projectInfo = { id: 12345 };
      const packages = [
        { id: 1, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-01" },
      ];
      const tarballData = Buffer.from("fake-tarball");

      const { client, fs } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
          ["https://gitlab.com/api/v4/projects/12345/packages/generic/artifact/1.0.0/artifact.tar.gz", binaryResponse(tarballData)],
        ])
      );

      // Simulate extracted file
      fs.files.set("/target/agent.md", { content: "# Agent", isDirectory: false });

      const result = await client.download("@scope/artifact", "1.0.0", "/target");

      expect(result.success).toBe(true);
      expect(result.version).toBe("1.0.0");
    });

    test("resolves latest version when not specified", async () => {
      const projectInfo = { id: 12345 };
      const packages = [
        { id: 2, name: "artifact", version: "2.0.0", package_type: "generic", created_at: "2024-02-01" },
        { id: 1, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-01" },
      ];
      const tarballData = Buffer.from("fake-tarball");

      const { client, fs } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
          ["https://gitlab.com/api/v4/projects/12345/packages/generic/artifact/2.0.0/artifact.tar.gz", binaryResponse(tarballData)],
        ])
      );

      fs.files.set("/target/agent.md", { content: "# Agent", isDirectory: false });

      const result = await client.download("@scope/artifact", undefined, "/target");

      expect(result.success).toBe(true);
      expect(result.version).toBe("2.0.0");
    });

    test("returns error when no versions found", async () => {
      const projectInfo = { id: 12345 };

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=missing", jsonResponse([])],
        ])
      );

      const result = await client.download("@scope/missing", undefined, "/target");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No versions found");
    });

    test("uses correct API URL format", async () => {
      const projectInfo = { id: 99999 };
      const packages = [
        { id: 1, name: "my-artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-01" },
      ];
      const tarballData = Buffer.from("fake-tarball");
      let downloadUrl = "";

      const http = createMockHttpClient();
      http.fetch = async (url: string) => {
        if (url.includes("/packages/generic/")) {
          downloadUrl = url;
          return binaryResponse(tarballData);
        }
        if (url.includes("/packages?")) {
          return jsonResponse(packages);
        }
        if (url.includes("/projects/")) {
          return jsonResponse(projectInfo);
        }
        return errorResponse(404, "Not Found");
      };

      const fs = createMockFileSystem();
      const shell = createMockShellExecutor({ "tar": "" });

      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "gitlab.mycompany.com",
        project: "team/artifacts",
      };

      const client = new GitLabRegistryClient(registry, http, fs, shell);
      fs.files.set("/target/file.md", { content: "content", isDirectory: false });

      await client.download("@scope/my-artifact", "1.0.0", "/target");

      expect(downloadUrl).toContain("gitlab.mycompany.com");
      expect(downloadUrl).toContain("/packages/generic/my-artifact/1.0.0/artifact.tar.gz");
    });

    test("calculates integrity after extraction", async () => {
      const projectInfo = { id: 12345 };
      const packages = [
        { id: 1, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-01" },
      ];
      const tarballData = Buffer.from("fake-tarball");

      const { client, fs } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
          ["https://gitlab.com/api/v4/projects/12345/packages/generic/artifact/1.0.0/artifact.tar.gz", binaryResponse(tarballData)],
        ])
      );

      fs.files.set("/target/agent.md", { content: "# Agent content", isDirectory: false });

      const result = await client.download("@scope/artifact", "1.0.0", "/target");

      expect(result.success).toBe(true);
      expect(result.integrity).toMatch(/^sha256:/);
      expect(result.fileHashes).toBeDefined();
    });
  });

  describe("publish", () => {
    test("returns error when no token provided", async () => {
      const { client } = createClient({ token: undefined });

      const result = await client.publish("@scope/artifact", "1.0.0", "/path/to/tarball.tar.gz");

      expect(result.success).toBe(false);
      expect(result.error).toContain("authentication");
    });

    test("prevents overwriting existing versions", async () => {
      const projectInfo = { id: 12345 };
      const packages = [
        { id: 1, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-01" },
      ];

      const { client } = createClient(
        { token: "my-token" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
        ])
      );

      const result = await client.publish("@scope/artifact", "1.0.0", "/path/to/tarball.tar.gz");

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });

    test("uploads tarball when version does not exist", async () => {
      const projectInfo = { id: 12345 };
      const packages: unknown[] = [];
      let uploadedUrl = "";

      const http = createMockHttpClient();
      http.fetch = async (url: string, options?: RequestInit) => {
        if (url.includes("/packages/generic/") && options?.method === "PUT") {
          uploadedUrl = url;
          return jsonResponse({ message: "created" }, 201);
        }
        if (url.includes("/packages?")) {
          return jsonResponse(packages);
        }
        if (url.includes("/projects/")) {
          return jsonResponse(projectInfo);
        }
        return errorResponse(404, "Not Found");
      };

      const fs = createMockFileSystem({
        "/path/to/tarball.tar.gz": Buffer.from("tarball content"),
      });
      const shell = createMockShellExecutor();

      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "gitlab.com",
        project: "group/project",
        token: "my-token",
      };

      const client = new GitLabRegistryClient(registry, http, fs, shell);

      const result = await client.publish("@scope/artifact", "1.0.0", "/path/to/tarball.tar.gz");

      expect(result.success).toBe(true);
      expect(uploadedUrl).toContain("/packages/generic/artifact/1.0.0/artifact.tar.gz");
    });
  });

  describe("listVersions", () => {
    test("returns versions sorted by semver (not by created_at)", async () => {
      const projectInfo = { id: 12345 };
      // created_at order: 1.0.0, 10.0.0, 2.0.0
      // semver order: 10.0.0, 2.0.0, 1.0.0
      const packages = [
        { id: 1, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-01T00:00:00Z" },
        { id: 2, name: "artifact", version: "10.0.0", package_type: "generic", created_at: "2024-02-01T00:00:00Z" },
        { id: 3, name: "artifact", version: "2.0.0", package_type: "generic", created_at: "2024-03-01T00:00:00Z" },
      ];

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
        ])
      );

      const result = await client.listVersions("@scope/artifact");

      // Should be sorted by semver, not created_at
      expect(result).toEqual(["10.0.0", "2.0.0", "1.0.0"]);
    });

    test("filters out invalid semver versions", async () => {
      const projectInfo = { id: 12345 };
      const packages = [
        { id: 1, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-01T00:00:00Z" },
        { id: 2, name: "artifact", version: "banana", package_type: "generic", created_at: "2024-02-01T00:00:00Z" },
        { id: 3, name: "artifact", version: "v2.0.0", package_type: "generic", created_at: "2024-03-01T00:00:00Z" },
      ];

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
        ])
      );

      const result = await client.listVersions("@scope/artifact");

      expect(result).toEqual(["1.0.0"]);
    });

    test("returns empty array when no packages found", async () => {
      const projectInfo = { id: 12345 };

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=missing", jsonResponse([])],
        ])
      );

      const result = await client.listVersions("@scope/missing");

      expect(result).toEqual([]);
    });
  });

  describe("getLatestVersion", () => {
    test("returns highest semver version (not most recently published)", async () => {
      const projectInfo = { id: 12345 };
      // 10.0.0 was published first, 2.0.0 was published last
      // Latest should be 10.0.0 (highest semver), not 2.0.0 (most recent)
      const packages = [
        { id: 1, name: "artifact", version: "10.0.0", package_type: "generic", created_at: "2024-01-01T00:00:00Z" },
        { id: 2, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-02-01T00:00:00Z" },
        { id: 3, name: "artifact", version: "2.0.0", package_type: "generic", created_at: "2024-03-01T00:00:00Z" },
      ];

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
        ])
      );

      const result = await client.getLatestVersion("@scope/artifact");

      expect(result).toBe("10.0.0");
    });

    test("returns null when no versions exist", async () => {
      const projectInfo = { id: 12345 };

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=missing", jsonResponse([])],
        ])
      );

      const result = await client.getLatestVersion("@scope/missing");

      expect(result).toBeNull();
    });
  });

  describe("versionExists", () => {
    test("returns true when version exists", async () => {
      const projectInfo = { id: 12345 };
      const packages = [
        { id: 1, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-01" },
        { id: 2, name: "artifact", version: "2.0.0", package_type: "generic", created_at: "2024-02-01" },
      ];

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
        ])
      );

      const result = await client.versionExists("@scope/artifact", "1.0.0");

      expect(result).toBe(true);
    });

    test("returns false when version does not exist", async () => {
      const projectInfo = { id: 12345 };
      const packages = [
        { id: 1, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-01" },
      ];

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
        ])
      );

      const result = await client.versionExists("@scope/artifact", "3.0.0");

      expect(result).toBe(false);
    });
  });

  describe("getArtifactInfo", () => {
    test("returns null when no packages found", async () => {
      const projectInfo = { id: 12345 };

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=missing", jsonResponse([])],
        ])
      );

      const result = await client.getArtifactInfo("@scope/missing");

      expect(result).toBeNull();
    });

    test("returns artifact info with versions sorted by semver", async () => {
      const projectInfo = { id: 12345 };
      const packages = [
        { id: 1, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-01T00:00:00Z" },
        { id: 2, name: "artifact", version: "10.0.0", package_type: "generic", created_at: "2024-02-01T00:00:00Z" },
        { id: 3, name: "artifact", version: "2.0.0", package_type: "generic", created_at: "2024-03-01T00:00:00Z" },
      ];

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
        ])
      );

      const result = await client.getArtifactInfo("@scope/artifact");

      expect(result).not.toBeNull();
      expect(result!.artifactId).toBe("@scope/artifact");
      expect(result!.latestVersion).toBe("10.0.0");
      expect(result!.versions).toHaveLength(3);
      expect(result!.versions[0].version).toBe("10.0.0");
      expect(result!.versions[1].version).toBe("2.0.0");
      expect(result!.versions[2].version).toBe("1.0.0");
    });

    test("includes publishedAt from created_at", async () => {
      const projectInfo = { id: 12345 };
      const packages = [
        { id: 1, name: "artifact", version: "1.0.0", package_type: "generic", created_at: "2024-01-15T10:30:00Z" },
      ];

      const { client } = createClient(
        { host: "gitlab.com", project: "group/project" },
        new Map([
          ["https://gitlab.com/api/v4/projects/group%2Fproject", jsonResponse(projectInfo)],
          ["https://gitlab.com/api/v4/projects/12345/packages?package_type=generic&package_name=artifact", jsonResponse(packages)],
        ])
      );

      const result = await client.getArtifactInfo("@scope/artifact");

      expect(result!.versions[0].publishedAt).toBe("2024-01-15T10:30:00Z");
    });
  });

  describe("getProjectId caching", () => {
    test("caches project ID after first request", async () => {
      const projectInfo = { id: 12345 };
      let projectApiCalls = 0;

      const http = createMockHttpClient();
      http.fetch = async (url: string) => {
        if (url.includes("/projects/group%2Fproject") && !url.includes("/packages")) {
          projectApiCalls++;
          return jsonResponse(projectInfo);
        }
        if (url.includes("/packages?")) {
          return jsonResponse([]);
        }
        return errorResponse(404, "Not Found");
      };

      const fs = createMockFileSystem();
      const shell = createMockShellExecutor();

      const registry: ResolvedRegistry = {
        type: "gitlab",
        host: "gitlab.com",
        project: "group/project",
      };

      const client = new GitLabRegistryClient(registry, http, fs, shell);

      // Make multiple calls
      await client.listVersions("@scope/artifact");
      await client.listVersions("@scope/artifact");
      await client.getLatestVersion("@scope/artifact");

      // Project info should only be fetched once
      expect(projectApiCalls).toBe(1);
    });
  });
});
