# @grekt-labs/cli-engine

Deterministic core logic for grekt CLI. Portable, testable, dependency-injected.

## Installation

```bash
bun add @grekt-labs/cli-engine
```

## Overview

This package provides the core logic for grekt, separated from I/O concerns through dependency injection. This makes the code:

- **Portable** — runs on any runtime (Node, Bun, Deno, edge)
- **Testable** — mock interfaces instead of filesystem/network
- **Deterministic** — pure functions with explicit dependencies

## Exports

### Core Interfaces

Dependency injection interfaces for I/O operations:

```ts
import type {
  FileSystem,
  HttpClient,
  TokenProvider,
  PathConfig,
  EngineContext,
} from '@grekt-labs/cli-engine';
```

### Schemas

Zod schemas and TypeScript types for validation:

```ts
import {
  ProjectConfigSchema,
  LockfileSchema,
  ArtifactManifestSchema,
  // ... and more
} from '@grekt-labs/cli-engine';
```

### Formatters

Pure utility functions:

```ts
import {
  formatBytes,
  estimateTokens,
  formatNumber,
  formatTokenEstimate,
} from '@grekt-labs/cli-engine';
```

## License

[BSL 1.1](./LICENSE)
