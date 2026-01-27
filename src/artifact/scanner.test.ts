import { describe, test, expect } from "bun:test";
import { scanArtifact } from "./scanner";
import { createMockFileSystem } from "#/test-utils/mocks";
import { stringify } from "yaml";

describe("scanner", () => {
  describe("scanArtifact", () => {
    test("returns null when no grekt.yaml exists", () => {
      const fs = createMockFileSystem({
        "/artifact/README.md": "# Hello",
      });

      const result = scanArtifact(fs, "/artifact");

      expect(result).toBeNull();
    });

    test("returns null when grekt.yaml is invalid", () => {
      const fs = createMockFileSystem({
        "/artifact/grekt.yaml": "invalid: [yaml: content",
      });

      const result = scanArtifact(fs, "/artifact");

      expect(result).toBeNull();
    });

    test("returns null when grekt.yaml has invalid schema", () => {
      const fs = createMockFileSystem({
        "/artifact/grekt.yaml": stringify({
          name: "test",
          // Missing required fields: author, version, description
        }),
      });

      const result = scanArtifact(fs, "/artifact");

      expect(result).toBeNull();
    });

    test("parses valid manifest correctly", () => {
      const manifest = {
        name: "test-artifact",
        author: "test-author",
        version: "1.0.0",
        description: "Test description",
      };
      const fs = createMockFileSystem({
        "/artifact/grekt.yaml": stringify(manifest),
      });

      const result = scanArtifact(fs, "/artifact");

      expect(result).not.toBeNull();
      expect(result!.manifest.name).toBe("test-artifact");
      expect(result!.manifest.author).toBe("test-author");
      expect(result!.manifest.version).toBe("1.0.0");
      expect(result!.manifest.description).toBe("Test description");
    });

    test("finds agent file", () => {
      const manifest = {
        name: "test",
        author: "author",
        version: "1.0.0",
        description: "desc",
      };
      const agentContent = `---
type: agent
name: My Agent
description: An agent
---
# Agent content`;

      const fs = createMockFileSystem({
        "/artifact/grekt.yaml": stringify(manifest),
        "/artifact/agent.md": agentContent,
      });

      const result = scanArtifact(fs, "/artifact");

      expect(result).not.toBeNull();
      expect(result!.agent).toBeDefined();
      expect(result!.agent!.path).toBe("agent.md");
      expect(result!.agent!.parsed.frontmatter.type).toBe("agent");
      expect(result!.agent!.parsed.frontmatter.name).toBe("My Agent");
    });

    test("finds skills in nested directories", () => {
      const manifest = {
        name: "test",
        author: "author",
        version: "1.0.0",
        description: "desc",
      };
      const skill1 = `---
type: skill
name: Skill 1
description: First skill
---
# Skill 1`;
      const skill2 = `---
type: skill
name: Skill 2
description: Second skill
---
# Skill 2`;

      const fs = createMockFileSystem({
        "/artifact/grekt.yaml": stringify(manifest),
        "/artifact/skills/skill1.md": skill1,
        "/artifact/skills/advanced/skill2.md": skill2,
      });

      const result = scanArtifact(fs, "/artifact");

      expect(result).not.toBeNull();
      expect(result!.skills).toHaveLength(2);
      expect(result!.skills.some((s) => s.path === "skills/skill1.md")).toBe(true);
      expect(result!.skills.some((s) => s.path === "skills/advanced/skill2.md")).toBe(true);
    });

    test("finds commands", () => {
      const manifest = {
        name: "test",
        author: "author",
        version: "1.0.0",
        description: "desc",
      };
      const command = `---
type: command
name: My Command
description: A command
---
# Command content`;

      const fs = createMockFileSystem({
        "/artifact/grekt.yaml": stringify(manifest),
        "/artifact/commands/cmd.md": command,
      });

      const result = scanArtifact(fs, "/artifact");

      expect(result).not.toBeNull();
      expect(result!.commands).toHaveLength(1);
      expect(result!.commands[0].path).toBe("commands/cmd.md");
      expect(result!.commands[0].parsed.frontmatter.type).toBe("command");
    });

    test("handles invalid frontmatter gracefully", () => {
      const manifest = {
        name: "test",
        author: "author",
        version: "1.0.0",
        description: "desc",
      };
      const validSkill = `---
type: skill
name: Valid Skill
description: A valid skill
---
# Valid`;
      const invalidMd = `---
invalid: yaml
but: no type
---
# Invalid frontmatter`;
      const noFrontmatter = `# Just markdown
No frontmatter here`;

      const fs = createMockFileSystem({
        "/artifact/grekt.yaml": stringify(manifest),
        "/artifact/valid.md": validSkill,
        "/artifact/invalid.md": invalidMd,
        "/artifact/plain.md": noFrontmatter,
      });

      const result = scanArtifact(fs, "/artifact");

      expect(result).not.toBeNull();
      // Should only find the valid skill
      expect(result!.skills).toHaveLength(1);
      expect(result!.skills[0].path).toBe("valid.md");
    });

    test("returns empty arrays when no components found", () => {
      const manifest = {
        name: "test",
        author: "author",
        version: "1.0.0",
        description: "desc",
      };

      const fs = createMockFileSystem({
        "/artifact/grekt.yaml": stringify(manifest),
        "/artifact/README.md": "# Just a readme",
      });

      const result = scanArtifact(fs, "/artifact");

      expect(result).not.toBeNull();
      expect(result!.agent).toBeUndefined();
      expect(result!.skills).toHaveLength(0);
      expect(result!.commands).toHaveLength(0);
    });

    test("handles complete artifact structure", () => {
      const manifest = {
        name: "complete-artifact",
        author: "grekt",
        version: "2.0.0",
        description: "A complete artifact",
      };
      const agent = `---
type: agent
name: Main Agent
description: The main agent
---
# Main Agent`;
      const skill1 = `---
type: skill
name: Skill A
description: First skill
agent: Main Agent
---
# Skill A`;
      const skill2 = `---
type: skill
name: Skill B
description: Second skill
agent: Main Agent
---
# Skill B`;
      const command = `---
type: command
name: My Command
description: A command
---
# Command`;

      const fs = createMockFileSystem({
        "/artifact/grekt.yaml": stringify(manifest),
        "/artifact/agent.md": agent,
        "/artifact/skills/skill-a.md": skill1,
        "/artifact/skills/skill-b.md": skill2,
        "/artifact/commands/cmd.md": command,
      });

      const result = scanArtifact(fs, "/artifact");

      expect(result).not.toBeNull();
      expect(result!.manifest.name).toBe("complete-artifact");
      expect(result!.agent).toBeDefined();
      expect(result!.agent!.parsed.frontmatter.name).toBe("Main Agent");
      expect(result!.skills).toHaveLength(2);
      expect(result!.commands).toHaveLength(1);
    });
  });
});
