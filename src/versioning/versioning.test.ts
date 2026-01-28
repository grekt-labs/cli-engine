import { describe, test, expect } from "bun:test";
import {
  manifestToPackageJson,
  updateManifestVersion,
  parseMultireleaseResult,
  formatVersionResults,
  getArtifactIdFromManifest,
} from "./versioning";
import type { ArtifactManifest } from "#/schemas";
import type { MultireleaseResult, VersionResult } from "./versioning.types";

describe("versioning", () => {
  const sampleManifest: ArtifactManifest = {
    name: "code-reviewer",
    author: "grekt",
    version: "1.0.0",
    description: "A code review agent",
  };

  describe("manifestToPackageJson", () => {
    test("converts manifest to package.json format", () => {
      const result = manifestToPackageJson(sampleManifest);

      expect(result.name).toBe("@grekt/code-reviewer");
      expect(result.version).toBe("1.0.0");
      expect(result.private).toBe(true);
    });

    test("handles different authors", () => {
      const manifest: ArtifactManifest = {
        ...sampleManifest,
        author: "myteam",
        name: "helper",
      };

      const result = manifestToPackageJson(manifest);

      expect(result.name).toBe("@myteam/helper");
    });
  });

  describe("updateManifestVersion", () => {
    test("returns new manifest with updated version", () => {
      const result = updateManifestVersion(sampleManifest, "2.0.0");

      expect(result.version).toBe("2.0.0");
      expect(result.name).toBe("code-reviewer");
      expect(result.author).toBe("grekt");
      expect(result.description).toBe("A code review agent");
    });

    test("does not mutate original manifest", () => {
      const original = { ...sampleManifest };
      updateManifestVersion(sampleManifest, "2.0.0");

      expect(sampleManifest.version).toBe(original.version);
    });
  });

  describe("parseMultireleaseResult", () => {
    test("parses successful release result", () => {
      const multireleaseResult: MultireleaseResult = {
        name: "@grekt/code-reviewer",
        result: {
          lastRelease: { version: "1.0.0" },
          nextRelease: { version: "1.1.0", type: "minor" },
          commits: [{ message: "feat: add feature" }, { message: "feat: another" }],
        },
      };

      const result = parseMultireleaseResult("/path/to/artifact", multireleaseResult);

      expect(result.artifactPath).toBe("/path/to/artifact");
      expect(result.artifactId).toBe("@grekt/code-reviewer");
      expect(result.previousVersion).toBe("1.0.0");
      expect(result.newVersion).toBe("1.1.0");
      expect(result.releaseType).toBe("minor");
      expect(result.commits).toBe(2);
    });

    test("parses no-release result", () => {
      const multireleaseResult: MultireleaseResult = {
        name: "@grekt/code-reviewer",
        result: false,
      };

      const result = parseMultireleaseResult("/path/to/artifact", multireleaseResult);

      expect(result.newVersion).toBeNull();
      expect(result.releaseType).toBeNull();
      expect(result.commits).toBe(0);
    });
  });

  describe("formatVersionResults", () => {
    test("formats results with changes", () => {
      const results: VersionResult[] = [
        {
          artifactPath: "/path/a",
          artifactId: "@grekt/agent-a",
          previousVersion: "1.0.0",
          newVersion: "1.1.0",
          releaseType: "minor",
          commits: 2,
        },
        {
          artifactPath: "/path/b",
          artifactId: "@grekt/agent-b",
          previousVersion: "2.0.0",
          newVersion: "3.0.0",
          releaseType: "major",
          commits: 1,
        },
      ];

      const lines = formatVersionResults(results);

      expect(lines[0]).toBe("@grekt/agent-a: 1.0.0 → 1.1.0 (2 minor commits)");
      expect(lines[1]).toBe("@grekt/agent-b: 2.0.0 → 3.0.0 (1 major commits)");
    });

    test("formats results without changes", () => {
      const results: VersionResult[] = [
        {
          artifactPath: "/path/a",
          artifactId: "@grekt/agent-a",
          previousVersion: "1.0.0",
          newVersion: null,
          releaseType: null,
          commits: 0,
        },
      ];

      const lines = formatVersionResults(results);

      expect(lines[0]).toBe("@grekt/agent-a: 1.0.0 (no changes)");
    });
  });

  describe("getArtifactIdFromManifest", () => {
    test("returns formatted artifact ID", () => {
      const result = getArtifactIdFromManifest(sampleManifest);

      expect(result).toBe("@grekt/code-reviewer");
    });
  });
});
