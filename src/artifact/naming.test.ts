import { describe, test, expect } from "bun:test";
import { getSafeFilename, toSafeName, getArtifactId } from "./naming";

describe("naming", () => {
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

  describe("getArtifactId", () => {
    test("builds artifact ID from author and name", () => {
      expect(getArtifactId("grekt", "analyzer")).toBe("@grekt/analyzer");
    });
  });
});
