import { describe, test, expect } from "bun:test";
import { parseFrontmatter } from "./frontmatter";

describe("frontmatter", () => {
  test("parseFrontmatter extracts YAML from markdown", () => {
    const content = `---
grk-type: agent
grk-name: Test Agent
grk-description: A test agent
---

# Agent content here`;

    const result = parseFrontmatter(content);

    expect(result).not.toBeNull();
    expect(result?.frontmatter["grk-type"]).toBe("agent");
    expect(result?.frontmatter["grk-name"]).toBe("Test Agent");
    expect(result?.content).toContain("# Agent content here");
  });

  test("parseFrontmatter validates against schema", () => {
    const content = `---
grk-type: skill
grk-name: Test Skill
grk-description: A test skill
grk-agent: my-agent
---

Skill content`;

    const result = parseFrontmatter(content);

    expect(result).not.toBeNull();
    expect(result?.frontmatter["grk-type"]).toBe("skill");
    expect(result?.frontmatter["grk-agent"]).toBe("my-agent");
  });

  test("parseFrontmatter returns null for invalid frontmatter", () => {
    const content = `---
grk-type: invalid-type
grk-name: Test
---

Content`;

    const result = parseFrontmatter(content);

    expect(result).toBeNull();
  });

  test("parseFrontmatter returns null for missing required fields", () => {
    const content = `---
grk-type: agent
---

Content`;

    const result = parseFrontmatter(content);

    expect(result).toBeNull();
  });
});
