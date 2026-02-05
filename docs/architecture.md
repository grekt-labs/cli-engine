# cli-engine Architecture

Deterministic core logic for grekt. Portable, testable, dependency-injected.

## Purpose

cli-engine contains the pure logic extracted from the CLI:

- No I/O operations (no `fs`, no `fetch`, no `process.env`)
- All external operations via injected interfaces
- Same inputs → same outputs (deterministic)
- Runs anywhere: CLI, tests, browser, other contexts

## Modules

```
cli-engine/src/
├── core/            # DI interfaces (FileSystem, HttpClient, etc.)
├── categories/      # Component type definitions (agents, skills, etc.)
├── schemas/         # Zod validation schemas
├── formatters/      # Pure utility functions
├── friendly-errors/ # Human-readable error utilities
├── artifact/        # Parsing, scanning, naming, integrity
├── registry/        # Resolution, download, clients
├── sync/            # Types and constants (impl in CLI)
├── artifactIndex/   # Index generation for lazy loading
├── version/         # Semver utilities
├── oci/             # OCI Distribution Spec (GHCR support)
└── test-utils/      # Mocks for testing
```

## Core Interfaces (`core/`)

Interfaces that abstract I/O operations:

```typescript
interface FileSystem {
  readFile(path: string): string;
  writeFile(path: string, content: string): void;
  exists(path: string): boolean;
  mkdir(path: string, options?: { recursive?: boolean }): void;
  // ...
}

interface HttpClient {
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

interface ShellExecutor {
  execFile(command: string, args: string[]): string;
}

interface TokenProvider {
  getRegistryToken(scope: string): string | undefined;
  getGitToken(type: 'github' | 'gitlab', host?: string): string | undefined;
}
```

The CLI implements these with real Node.js operations. Tests implement with mocks.

## Categories (`categories/`)

Central definition of artifact component types:

```typescript
const CATEGORIES = ["agents", "skills", "commands", "mcps", "rules"] as const;

const CATEGORY_CONFIG = {
  agents: { singular: "agent", defaultPath: "agents", allowedFormats: ["md"] },
  skills: { singular: "skill", defaultPath: "skills", allowedFormats: ["md"] },
  // ...
};
```

Add a new category here → it propagates everywhere.

## Schemas (`schemas/`)

Zod schemas for validation:

- `ArtifactManifestSchema` - grekt.yaml in artifacts
- `ArtifactFrontmatterSchema` - YAML frontmatter in .md files
- `ProjectConfigSchema` - grekt.yaml in projects
- `LockfileSchema` - grekt.lock
- And more...

All types are inferred from schemas:

```typescript
export type ArtifactManifest = z.infer<typeof ArtifactManifestSchema>;
```

## Artifact (`artifact/`)

Artifact operations:

- **scanner.ts** - Scan directory, categorize files by frontmatter
- **frontmatter.ts** - Parse YAML frontmatter from .md files
- **naming.ts** - Safe filename generation, artifact ID utilities
- **integrity.ts** - Hash calculation, verification
- **lockfile.ts** - Read/write lockfile

All functions receive `FileSystem` interface:

```typescript
function scanArtifact(fs: FileSystem, dir: string): ArtifactInfo | null
function hashDirectory(fs: FileSystem, dir: string): Record<string, string>
```

## Registry (`registry/`)

Registry operations:

- **sources.ts** - Parse source strings (pure)
- **resolver.ts** - Resolve scope to registry config
- **factory.ts** - Create appropriate client
- **download.ts** - Download and extract tarballs
- **clients/** - Client implementations

```typescript
function parseSource(source: string): ParsedSource  // Pure
function resolveRegistry(scope, config, tokens): ResolvedRegistry
function createRegistryClient(registry, http, fs, shell): RegistryClient
```

## Sync (`sync/`)

Only types and constants. Implementation in CLI.

```typescript
// Types
interface SyncPlugin { ... }
interface SyncResult { ... }

// Constants
const GREKT_UNTRUSTED_TAG = "grekt-untrusted-context";
const GREKT_SECTION_HEADER = "**MANDATORY:**";
```

## ArtifactIndex (`artifactIndex/`)

Generates `.grekt/index` for AI discoverability:

```typescript
function generateIndex(inputs: IndexGeneratorInput[]): ArtifactIndex
function serializeIndex(index: ArtifactIndex, options): string
```

## Version (`version/`)

Semver utilities:

```typescript
function isValidSemver(version: string): boolean
function compareSemver(a: string, b: string): -1 | 0 | 1
```

## Formatters (`formatters/`)

Pure utility functions:

```typescript
function formatBytes(bytes: number): string  // "1.5 KB"
function estimateTokens(text: string): number
function formatNumber(n: number): string  // "1,234"
```

## Friendly Errors (`friendly-errors/`)

Standard utility for parsing user-facing config files with human-readable errors.

**Always use this when parsing config files** (grekt.yaml, grekt-workspace.yaml, lockfiles).

```typescript
import { safeParseYaml } from "@grekt-labs/cli-engine";

const result = safeParseYaml(content, MySchema, "grekt.yaml");
if (!result.success) {
  // result.error.message: "Invalid YAML syntax in grekt.yaml"
  // result.error.details: ["Nested mappings are not allowed..."]
}
```

Returns `ParseResult<T>` instead of throwing raw errors:

```typescript
type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: FriendlyError };

interface FriendlyError {
  type: "yaml" | "validation";
  message: string;
  details?: string[];
}
```

## OCI (`oci/`)

OCI Distribution Spec support for GitHub Container Registry:

```typescript
class OciClient {
  constructor(host: string, http: HttpClient)
  async getManifest(name: string, reference: string): Promise<OciManifest>
  async pullLayer(name: string, digest: string): Promise<ArrayBuffer>
}
```

## How CLI Uses Engine

```typescript
// CLI imports
import { scanArtifact, hashDirectory, parseSource } from "@grekt-labs/cli-engine";
import { fs, http, shell } from "#/context";  // Real implementations

// CLI calls engine functions, passing implementations
const artifact = scanArtifact(fs, artifactDir);
const hashes = hashDirectory(fs, dir);
const source = parseSource(sourceString);  // Pure, no injection needed
```

## Testing

Use mocks from `test-utils/`:

```typescript
import { createMockFileSystem } from "@grekt-labs/cli-engine/test-utils";

const mockFs = createMockFileSystem({
  "grekt.yaml": "name: \"@scope/test\"\nversion: 1.0.0\ndescription: Test",
  "agent.md": "---\ngrk-type: agents\n...",
});

const result = scanArtifact(mockFs, "/artifact");
```

## Adding New Functionality

1. **Pure logic (no I/O)**: Add directly, export from module index
2. **Needs I/O**: Add interface method to `core/interfaces.ts`, function receives interface
3. **New module**: Create directory, add `index.ts`, export from `src/index.ts`

Rules:
- Never import `fs`, `fetch`, `process` directly
- All I/O via injected interfaces
- Functions should be testable with mocks
