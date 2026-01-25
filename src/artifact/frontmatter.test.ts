import { describe, test, expect } from "bun:test";
import { parseFrontmatter } from "./frontmatter";

describe("frontmatter", () => {
  test("parseFrontmatter extracts YAML from markdown", () => {
    const content = `---
type: agent
name: Test Agent
description: A test agent
---

# Agent content here`;

    const result = parseFrontmatter(content);

    expect(result).not.toBeNull();
    expect(result?.frontmatter.type).toBe("agent");
    expect(result?.frontmatter.name).toBe("Test Agent");
    expect(result?.content).toContain("# Agent content here");
  });

  test("parseFrontmatter validates against schema", () => {
    const content = `---
type: skill
name: Test Skill
description: A test skill
agent: my-agent
---

Skill content`;

    const result = parseFrontmatter(content);

    expect(result).not.toBeNull();
    expect(result?.frontmatter.type).toBe("skill");
    expect(result?.frontmatter.agent).toBe("my-agent");
  });

  test("parseFrontmatter returns null for invalid frontmatter", () => {
    const content = `---
type: invalid-type
name: Test
---

Content`;

    const result = parseFrontmatter(content);

    expect(result).toBeNull();
  });

  test("parseFrontmatter returns null for missing required fields", () => {
    const content = `---
type: agent
---

Content`;

    const result = parseFrontmatter(content);

    expect(result).toBeNull();
  });
});
