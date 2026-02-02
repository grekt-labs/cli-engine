import { describe, test, expect } from "bun:test";
import {
  getSafeFilename,
  toSafeName,
  buildArtifactId,
  isScoped,
  parseName,
  getArtifactIdFromManifest,
} from "./naming";
import type { ArtifactManifest } from "#/schemas";

describe("naming", () => {
  describe("isScoped", () => {
    test("returns true for scoped names", () => {
      expect(isScoped("@scope/name")).toBe(true);
      expect(isScoped("@my-org/my-artifact")).toBe(true);
    });

    test("returns false for unscoped names", () => {
      expect(isScoped("my-tool")).toBe(false);
      expect(isScoped("simple")).toBe(false);
    });
  });

  describe("parseName", () => {
    test("parses scoped names", () => {
      const result = parseName("@grekt/analyzer");
      expect(result.scope).toBe("@grekt");
      expect(result.baseName).toBe("analyzer");
      expect(result.artifactId).toBe("@grekt/analyzer");
    });

    test("parses unscoped names", () => {
      const result = parseName("my-tool");
      expect(result.scope).toBeNull();
      expect(result.baseName).toBe("my-tool");
      expect(result.artifactId).toBe("my-tool");
    });

    test("handles complex scope names", () => {
      const result = parseName("@my-org/my-artifact-name");
      expect(result.scope).toBe("@my-org");
      expect(result.baseName).toBe("my-artifact-name");
    });
  });

  describe("getSafeFilename", () => {
    test("removes @ and replaces / with -", () => {
      const result = getSafeFilename("@grekt/analyzer", "agent.md");
      expect(result).toBe("grekt-analyzer_agent.md");
    });

    test("extracts basename from filepath", () => {
      const result = getSafeFilename("@grekt/analyzer", "skills/analyze.md");
      expect(result).toBe("grekt-analyzer_analyze.md");
    });

    test("handles nested paths", () => {
      const result = getSafeFilename("@scope/name", "deep/nested/file.md");
      expect(result).toBe("scope-name_file.md");
    });

    test("handles unscoped names", () => {
      const result = getSafeFilename("my-artifact", "agent.md");
      expect(result).toBe("my-artifact_agent.md");
    });
  });

  describe("toSafeName", () => {
    test("converts @scope/name to scope-name", () => {
      expect(toSafeName("@grekt/analyzer")).toBe("grekt-analyzer");
    });

    test("handles unscoped names", () => {
      expect(toSafeName("my-artifact")).toBe("my-artifact");
    });
  });

  describe("buildArtifactId", () => {
    test("builds artifact ID from scope and name", () => {
      expect(buildArtifactId("grekt", "analyzer")).toBe("@grekt/analyzer");
    });

    test("handles scope with @ prefix", () => {
      expect(buildArtifactId("@grekt", "analyzer")).toBe("@grekt/analyzer");
    });
  });

  describe("getArtifactIdFromManifest", () => {
    test("extracts scoped name directly", () => {
      const manifest = {
        name: "@grekt/analyzer",
        version: "1.0.0",
        description: "Test",
      } as ArtifactManifest;
      expect(getArtifactIdFromManifest(manifest)).toBe("@grekt/analyzer");
    });

    test("extracts unscoped name directly", () => {
      const manifest = {
        name: "my-tool",
        version: "1.0.0",
        description: "Test",
      } as ArtifactManifest;
      expect(getArtifactIdFromManifest(manifest)).toBe("my-tool");
    });
  });
});
