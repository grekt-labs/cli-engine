import { describe, test, expect } from "bun:test";
import {
  isValidSemver,
  compareSemver,
  sortVersionsDesc,
  getHighestVersion,
  isGreaterThan,
  isLessThan,
} from "./version";

describe("version", () => {
  describe("isValidSemver", () => {
    test("accepts valid semver versions", () => {
      expect(isValidSemver("1.0.0")).toBe(true);
      expect(isValidSemver("0.0.1")).toBe(true);
      expect(isValidSemver("10.20.30")).toBe(true);
    });

    test("accepts prerelease versions", () => {
      expect(isValidSemver("1.0.0-alpha")).toBe(true);
      expect(isValidSemver("1.0.0-beta.1")).toBe(true);
      expect(isValidSemver("1.0.0-rc.1")).toBe(true);
      expect(isValidSemver("2.0.0-alpha.1.beta.2")).toBe(true);
    });

    test("accepts build metadata", () => {
      expect(isValidSemver("1.0.0+build")).toBe(true);
      expect(isValidSemver("1.0.0+build.123")).toBe(true);
      expect(isValidSemver("1.0.0-beta+build")).toBe(true);
    });

    test("rejects v prefix", () => {
      expect(isValidSemver("v1.0.0")).toBe(false);
      expect(isValidSemver("V1.0.0")).toBe(false);
    });

    test("rejects incomplete versions", () => {
      expect(isValidSemver("1.0")).toBe(false);
      expect(isValidSemver("1")).toBe(false);
    });

    test("rejects invalid strings", () => {
      expect(isValidSemver("banana")).toBe(false);
      expect(isValidSemver("")).toBe(false);
      expect(isValidSemver("latest")).toBe(false);
      expect(isValidSemver("1.0.0.0")).toBe(false);
    });
  });

  describe("compareSemver", () => {
    test("returns -1 when a < b", () => {
      expect(compareSemver("1.0.0", "2.0.0")).toBe(-1);
      expect(compareSemver("1.0.0", "1.1.0")).toBe(-1);
      expect(compareSemver("1.0.0", "1.0.1")).toBe(-1);
    });

    test("returns 0 when a === b", () => {
      expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
      expect(compareSemver("2.5.3", "2.5.3")).toBe(0);
    });

    test("returns 1 when a > b", () => {
      expect(compareSemver("2.0.0", "1.0.0")).toBe(1);
      expect(compareSemver("1.1.0", "1.0.0")).toBe(1);
      expect(compareSemver("1.0.1", "1.0.0")).toBe(1);
    });

    test("prerelease is less than release", () => {
      expect(compareSemver("1.0.0-alpha", "1.0.0")).toBe(-1);
      expect(compareSemver("1.0.0-beta.1", "1.0.0")).toBe(-1);
    });

    test("compares prerelease versions correctly", () => {
      expect(compareSemver("1.0.0-alpha", "1.0.0-beta")).toBe(-1);
      expect(compareSemver("1.0.0-alpha.1", "1.0.0-alpha.2")).toBe(-1);
    });
  });

  describe("sortVersionsDesc", () => {
    test("sorts versions in descending order", () => {
      const versions = ["1.0.0", "2.0.0", "1.5.0"];
      expect(sortVersionsDesc(versions)).toEqual(["2.0.0", "1.5.0", "1.0.0"]);
    });

    test("handles double-digit versions correctly", () => {
      const versions = ["2.0.0", "1.0.0", "10.0.0"];
      expect(sortVersionsDesc(versions)).toEqual(["10.0.0", "2.0.0", "1.0.0"]);
    });

    test("filters out invalid versions", () => {
      const versions = ["1.0.0", "banana", "2.0.0", "v3.0.0"];
      expect(sortVersionsDesc(versions)).toEqual(["2.0.0", "1.0.0"]);
    });

    test("handles prerelease versions", () => {
      const versions = ["1.0.0", "1.0.0-alpha", "1.0.0-beta"];
      expect(sortVersionsDesc(versions)).toEqual(["1.0.0", "1.0.0-beta", "1.0.0-alpha"]);
    });

    test("returns empty array for empty input", () => {
      expect(sortVersionsDesc([])).toEqual([]);
    });

    test("returns empty array when all invalid", () => {
      expect(sortVersionsDesc(["banana", "invalid"])).toEqual([]);
    });
  });

  describe("getHighestVersion", () => {
    test("returns highest version", () => {
      expect(getHighestVersion(["1.0.0", "2.0.0", "1.5.0"])).toBe("2.0.0");
    });

    test("handles double-digit versions", () => {
      expect(getHighestVersion(["2.0.0", "1.0.0", "10.0.0"])).toBe("10.0.0");
    });

    test("returns null for empty array", () => {
      expect(getHighestVersion([])).toBeNull();
    });

    test("returns null when all invalid", () => {
      expect(getHighestVersion(["banana", "invalid"])).toBeNull();
    });

    test("ignores invalid versions", () => {
      expect(getHighestVersion(["1.0.0", "banana", "2.0.0"])).toBe("2.0.0");
    });
  });

  describe("isGreaterThan", () => {
    test("returns true when a > b", () => {
      expect(isGreaterThan("2.0.0", "1.0.0")).toBe(true);
    });

    test("returns false when a <= b", () => {
      expect(isGreaterThan("1.0.0", "2.0.0")).toBe(false);
      expect(isGreaterThan("1.0.0", "1.0.0")).toBe(false);
    });
  });

  describe("isLessThan", () => {
    test("returns true when a < b", () => {
      expect(isLessThan("1.0.0", "2.0.0")).toBe(true);
    });

    test("returns false when a >= b", () => {
      expect(isLessThan("2.0.0", "1.0.0")).toBe(false);
      expect(isLessThan("1.0.0", "1.0.0")).toBe(false);
    });
  });
});
