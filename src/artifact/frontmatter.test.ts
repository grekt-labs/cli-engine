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

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.frontmatter["grk-type"]).toBe("agent");
      expect(result.parsed.frontmatter["grk-name"]).toBe("Test Agent");
      expect(result.parsed.content).toContain("# Agent content here");
    }
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

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.frontmatter["grk-type"]).toBe("skill");
      expect(result.parsed.frontmatter["grk-agent"]).toBe("my-agent");
    }
  });

  test("parseFrontmatter returns error for invalid type", () => {
    const content = `---
grk-type: invalid-type
grk-name: Test
grk-description: A test
---

Content`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("invalid-frontmatter");
    }
  });

  test("parseFrontmatter returns error for missing required fields", () => {
    const content = `---
grk-type: agent
---

Content`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("missing-name");
      expect(result.missingFields).toContain("grk-name");
      expect(result.missingFields).toContain("grk-description");
    }
  });

  test("parseFrontmatter returns error for empty frontmatter", () => {
    const content = `---
---

Content`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("no-frontmatter");
    }
  });

  test("parseFrontmatter returns error for no frontmatter", () => {
    const content = `Just some content without frontmatter`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("no-frontmatter");
    }
  });
});
