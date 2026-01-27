import { describe, test, expect } from "bun:test";
import {
  getLockfile,
  saveLockfile,
  createEmptyLockfile,
  lockfileExists,
} from "./lockfile";
import { createMockFileSystem } from "#/test-utils/mocks";
import { stringify, parse } from "yaml";
import type { Lockfile } from "#/schemas";

describe("lockfile", () => {
  describe("createEmptyLockfile", () => {
    test("returns valid lockfile structure", () => {
      const result = createEmptyLockfile();

      expect(result.version).toBe(1);
      expect(result.artifacts).toEqual({});
    });

    test("returns new object each call", () => {
      const result1 = createEmptyLockfile();
      const result2 = createEmptyLockfile();

      expect(result1).not.toBe(result2);
      result1.artifacts["test"] = {
        version: "1.0.0",
        integrity: "sha256:abc",
        files: {},
        skills: [],
        commands: [],
      };
      expect(result2.artifacts["test"]).toBeUndefined();
    });
  });

  describe("lockfileExists", () => {
    test("returns false when file does not exist", () => {
      const fs = createMockFileSystem();

      const result = lockfileExists(fs, "/project/grekt.lock");

      expect(result).toBe(false);
    });

    test("returns true when file exists", () => {
      const fs = createMockFileSystem({
        "/project/grekt.lock": stringify({ version: 1, artifacts: {} }),
      });

      const result = lockfileExists(fs, "/project/grekt.lock");

      expect(result).toBe(true);
    });
  });

  describe("getLockfile", () => {
    test("returns empty lockfile when file does not exist", () => {
      const fs = createMockFileSystem();

      const result = getLockfile(fs, "/project/grekt.lock");

      expect(result.version).toBe(1);
      expect(result.artifacts).toEqual({});
    });

    test("parses existing lockfile", () => {
      const lockfileData: Lockfile = {
        version: 1,
        artifacts: {
          "@scope/artifact": {
            version: "1.0.0",
            integrity: "sha256:abc123def456",
            resolved: "https://registry.grekt.com/@scope/artifact/1.0.0.tar.gz",
            files: {
              "agent.md": "sha256:file1hash",
              "skills/skill.md": "sha256:file2hash",
            },
            agent: "agent.md",
            skills: ["skills/skill.md"],
            commands: [],
          },
        },
      };
      const fs = createMockFileSystem({
        "/project/grekt.lock": stringify(lockfileData),
      });

      const result = getLockfile(fs, "/project/grekt.lock");

      expect(result.version).toBe(1);
      expect(result.artifacts["@scope/artifact"]).toBeDefined();
      expect(result.artifacts["@scope/artifact"].version).toBe("1.0.0");
      expect(result.artifacts["@scope/artifact"].integrity).toBe("sha256:abc123def456");
      expect(result.artifacts["@scope/artifact"].agent).toBe("agent.md");
      expect(result.artifacts["@scope/artifact"].skills).toContain("skills/skill.md");
    });

    test("parses lockfile with multiple artifacts", () => {
      const lockfileData: Lockfile = {
        version: 1,
        artifacts: {
          "@org/artifact1": {
            version: "1.0.0",
            integrity: "sha256:hash1",
            files: {},
            skills: [],
            commands: [],
          },
          "@org/artifact2": {
            version: "2.0.0",
            integrity: "sha256:hash2",
            files: {},
            skills: [],
            commands: [],
          },
        },
      };
      const fs = createMockFileSystem({
        "/project/grekt.lock": stringify(lockfileData),
      });

      const result = getLockfile(fs, "/project/grekt.lock");

      expect(Object.keys(result.artifacts)).toHaveLength(2);
      expect(result.artifacts["@org/artifact1"].version).toBe("1.0.0");
      expect(result.artifacts["@org/artifact2"].version).toBe("2.0.0");
    });

    test("applies default values for optional fields", () => {
      // Minimal lockfile with only required fields
      const minimalLockfile = {
        version: 1,
        artifacts: {
          "@scope/minimal": {
            version: "1.0.0",
            integrity: "sha256:abc",
          },
        },
      };
      const fs = createMockFileSystem({
        "/project/grekt.lock": stringify(minimalLockfile),
      });

      const result = getLockfile(fs, "/project/grekt.lock");

      expect(result.artifacts["@scope/minimal"].files).toEqual({});
      expect(result.artifacts["@scope/minimal"].skills).toEqual([]);
      expect(result.artifacts["@scope/minimal"].commands).toEqual([]);
    });
  });

  describe("saveLockfile", () => {
    test("writes lockfile to disk as YAML", () => {
      const fs = createMockFileSystem();
      const lockfile: Lockfile = {
        version: 1,
        artifacts: {
          "@scope/test": {
            version: "1.0.0",
            integrity: "sha256:abc",
            files: {},
            skills: [],
            commands: [],
          },
        },
      };

      saveLockfile(fs, "/project/grekt.lock", lockfile);

      expect(fs.exists("/project/grekt.lock")).toBe(true);
      const content = fs.readFile("/project/grekt.lock");
      const parsed = parse(content);
      expect(parsed.version).toBe(1);
      expect(parsed.artifacts["@scope/test"].version).toBe("1.0.0");
    });

    test("overwrites existing lockfile", () => {
      const initialLockfile: Lockfile = {
        version: 1,
        artifacts: {
          "@scope/old": {
            version: "0.1.0",
            integrity: "sha256:old",
            files: {},
            skills: [],
            commands: [],
          },
        },
      };
      const fs = createMockFileSystem({
        "/project/grekt.lock": stringify(initialLockfile),
      });
      const newLockfile: Lockfile = {
        version: 1,
        artifacts: {
          "@scope/new": {
            version: "2.0.0",
            integrity: "sha256:new",
            files: {},
            skills: [],
            commands: [],
          },
        },
      };

      saveLockfile(fs, "/project/grekt.lock", newLockfile);

      const content = fs.readFile("/project/grekt.lock");
      const parsed = parse(content);
      expect(parsed.artifacts["@scope/old"]).toBeUndefined();
      expect(parsed.artifacts["@scope/new"]).toBeDefined();
      expect(parsed.artifacts["@scope/new"].version).toBe("2.0.0");
    });

    test("preserves all artifact data", () => {
      const fs = createMockFileSystem();
      const lockfile: Lockfile = {
        version: 1,
        artifacts: {
          "@scope/complete": {
            version: "3.0.0",
            integrity: "sha256:complete",
            source: "github:owner/repo",
            resolved: "https://api.github.com/repos/owner/repo/tarball/v3.0.0",
            files: {
              "agent.md": "sha256:agentfile",
              "skills/s1.md": "sha256:skill1",
              "commands/c1.md": "sha256:cmd1",
            },
            agent: "agent.md",
            skills: ["skills/s1.md"],
            commands: ["commands/c1.md"],
          },
        },
      };

      saveLockfile(fs, "/project/grekt.lock", lockfile);

      const result = getLockfile(fs, "/project/grekt.lock");
      const artifact = result.artifacts["@scope/complete"];
      expect(artifact.version).toBe("3.0.0");
      expect(artifact.integrity).toBe("sha256:complete");
      expect(artifact.source).toBe("github:owner/repo");
      expect(artifact.resolved).toBe("https://api.github.com/repos/owner/repo/tarball/v3.0.0");
      expect(artifact.files["agent.md"]).toBe("sha256:agentfile");
      expect(artifact.agent).toBe("agent.md");
      expect(artifact.skills).toContain("skills/s1.md");
      expect(artifact.commands).toContain("commands/c1.md");
    });
  });
});
