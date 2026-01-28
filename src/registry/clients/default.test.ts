import { describe, test, expect } from "bun:test";
import { DefaultRegistryClient } from "./default";
import {
  createMockHttpClient,
  createMockFileSystem,
  createMockShellExecutor,
  jsonResponse,
  binaryResponse,
  errorResponse,
} from "#/test-utils/mocks";
import type { ResolvedRegistry } from "../registry.types";
import type { ArtifactMetadata } from "#/schemas";
import { REGISTRY_HOST } from "#/constants";

describe("DefaultRegistryClient", () => {
  const createClient = (
    host = REGISTRY_HOST,
    httpResponses = new Map<string, Response>()
  ) => {
    const registry: ResolvedRegistry = {
      type: "default",
      host,
    };
    const http = createMockHttpClient(httpResponses);
    const fs = createMockFileSystem();
    const shell = createMockShellExecutor({ "tar -xzf": "" });

    return { client: new DefaultRegistryClient(registry, http, fs, shell), http, fs, shell };
  };

  describe("download", () => {
    test("downloads and extracts artifact successfully", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "1.0.0",
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const tarballData = Buffer.from("fake-tarball");

      const { client, fs, shell } = createClient(
        REGISTRY_HOST,
        new Map([
          [`https://${REGISTRY_HOST}/@scope/artifact/metadata.json`, jsonResponse(metadata)],
          [`https://${REGISTRY_HOST}/@scope/artifact/1.0.0.tar.gz`, binaryResponse(tarballData)],
        ])
      );

      const result = await client.download("@scope/artifact", "1.0.0", "/target");

      expect(result.success).toBe(true);
      expect(result.version).toBe("1.0.0");
      expect(result.resolved).toBe(`https://${REGISTRY_HOST}/@scope/artifact/1.0.0.tar.gz`);
      expect(shell.commands.length).toBeGreaterThan(0);
    });

    test("resolves latest version when not specified", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "2.0.0",
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const tarballData = Buffer.from("fake-tarball");

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
          ["https://registry.grekt.com/@scope/artifact/2.0.0.tar.gz", binaryResponse(tarballData)],
        ])
      );

      const result = await client.download("@scope/artifact", undefined, "/target");

      expect(result.success).toBe(true);
      expect(result.version).toBe("2.0.0");
    });

    test("returns deprecation message when version is deprecated", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "2.0.0",
        deprecated: {
          "1.0.0": "This version has security issues, please upgrade",
        },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const tarballData = Buffer.from("fake-tarball");

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
          ["https://registry.grekt.com/@scope/artifact/1.0.0.tar.gz", binaryResponse(tarballData)],
        ])
      );

      const result = await client.download("@scope/artifact", "1.0.0", "/target");

      expect(result.success).toBe(true);
      expect(result.deprecationMessage).toBe("This version has security issues, please upgrade");
    });

    test("returns error when artifact not found", async () => {
      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/missing/metadata.json", errorResponse(404, "Not Found")],
        ])
      );

      const result = await client.download("@scope/missing", "1.0.0", "/target");

      expect(result.success).toBe(false);
      expect(result.error).toContain("404");
    });

    test("returns error when tarball download fails", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "1.0.0",
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
          ["https://registry.grekt.com/@scope/artifact/1.0.0.tar.gz", errorResponse(500, "Server Error")],
        ])
      );

      const result = await client.download("@scope/artifact", "1.0.0", "/target");

      expect(result.success).toBe(false);
      expect(result.error).toContain("500");
    });

    test("calculates integrity after extraction", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "1.0.0",
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const tarballData = Buffer.from("fake-tarball");

      const { client, fs } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
          ["https://registry.grekt.com/@scope/artifact/1.0.0.tar.gz", binaryResponse(tarballData)],
        ])
      );

      // Simulate extracted files
      fs.files.set("/target/agent.md", { content: "# Agent", isDirectory: false });

      const result = await client.download("@scope/artifact", "1.0.0", "/target");

      expect(result.success).toBe(true);
      expect(result.integrity).toMatch(/^sha256:/);
      expect(result.fileHashes).toBeDefined();
    });
  });

  describe("publish", () => {
    test("returns error indicating authentication required", async () => {
      const { client } = createClient();

      const result = await client.publish("@scope/artifact", "1.0.0", "/path/to/tarball.tar.gz");

      expect(result.success).toBe(false);
      expect(result.error).toContain("login");
    });
  });

  describe("getLatestVersion", () => {
    test("returns latest version from metadata", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "3.0.0",
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
        ])
      );

      const result = await client.getLatestVersion("@scope/artifact");

      expect(result).toBe("3.0.0");
    });

    test("returns null when artifact not found", async () => {
      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/missing/metadata.json", errorResponse(404, "Not Found")],
        ])
      );

      const result = await client.getLatestVersion("@scope/missing");

      expect(result).toBeNull();
    });
  });

  describe("versionExists", () => {
    test("returns true when version exists", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "1.0.0",
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
          ["https://registry.grekt.com/@scope/artifact/1.0.0.tar.gz", new Response(null, { status: 200 })],
        ])
      );

      const result = await client.versionExists("@scope/artifact", "1.0.0");

      expect(result).toBe(true);
    });

    test("returns false when version does not exist", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "1.0.0",
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
          ["https://registry.grekt.com/@scope/artifact/2.0.0.tar.gz", errorResponse(404, "Not Found")],
        ])
      );

      const result = await client.versionExists("@scope/artifact", "2.0.0");

      expect(result).toBe(false);
    });

    test("returns false when artifact not found", async () => {
      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/missing/metadata.json", errorResponse(404, "Not Found")],
        ])
      );

      const result = await client.versionExists("@scope/missing", "1.0.0");

      expect(result).toBe(false);
    });
  });

  describe("listVersions", () => {
    test("returns empty array when no versions in metadata", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "1.0.0",
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
        ])
      );

      const result = await client.listVersions("@scope/artifact");

      expect(result).toEqual([]);
    });

    test("returns versions sorted by semver descending", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "10.0.0",
        versions: ["1.0.0", "2.0.0", "10.0.0", "1.5.0"],
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
        ])
      );

      const result = await client.listVersions("@scope/artifact");

      expect(result).toEqual(["10.0.0", "2.0.0", "1.5.0", "1.0.0"]);
    });

    test("filters out invalid semver versions", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "2.0.0",
        versions: ["1.0.0", "banana", "2.0.0", "v3.0.0"],
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
        ])
      );

      const result = await client.listVersions("@scope/artifact");

      expect(result).toEqual(["2.0.0", "1.0.0"]);
    });
  });

  describe("getArtifactInfo", () => {
    test("returns null when artifact not found", async () => {
      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/missing/metadata.json", errorResponse(404, "Not Found")],
        ])
      );

      const result = await client.getArtifactInfo("@scope/missing");

      expect(result).toBeNull();
    });

    test("returns artifact info with versions sorted by semver", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "1.0.0",
        versions: ["1.0.0", "2.0.0", "10.0.0"],
        deprecated: { "1.0.0": "Use 2.0.0 instead" },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
      };

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
        ])
      );

      const result = await client.getArtifactInfo("@scope/artifact");

      expect(result).not.toBeNull();
      expect(result!.artifactId).toBe("@scope/artifact");
      expect(result!.latestVersion).toBe("10.0.0");
      expect(result!.versions).toHaveLength(3);
      expect(result!.versions[0].version).toBe("10.0.0");
      expect(result!.versions[2].version).toBe("1.0.0");
      expect(result!.versions[2].deprecated).toBe("Use 2.0.0 instead");
      expect(result!.createdAt).toBe("2024-01-01T00:00:00Z");
      expect(result!.updatedAt).toBe("2024-06-01T00:00:00Z");
    });

    test("uses highest semver as latest even if metadata.latest differs", async () => {
      const metadata: ArtifactMetadata = {
        name: "@scope/artifact",
        latest: "1.0.0",
        versions: ["1.0.0", "5.0.0", "2.0.0"],
        deprecated: {},
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const { client } = createClient(
        "registry.grekt.com",
        new Map([
          ["https://registry.grekt.com/@scope/artifact/metadata.json", jsonResponse(metadata)],
        ])
      );

      const result = await client.getArtifactInfo("@scope/artifact");

      expect(result!.latestVersion).toBe("5.0.0");
    });
  });
});
