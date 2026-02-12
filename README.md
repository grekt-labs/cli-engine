# @grekt-labs/cli-engine

Deterministic core logic for grekt CLI. Portable, testable, dependency-injected.

> **Free to use.** cli-engine is free for personal and commercial use. If you're building something with it, we'd love to hear about it. The source is available under [BSL 1.1](./LICENSE), which just means you can't use this code to build something that competes with grekt. Each version converts to [MIT](./LICENSING.md) after two years.

## Installation

```bash
bun add @grekt-labs/cli-engine
```

## Overview

This package provides the core logic for grekt, separated from I/O concerns through dependency injection. This makes the code:

- **Portable** — runs on any runtime (Node, Bun, Deno, edge)
- **Testable** — mock interfaces instead of filesystem/network
- **Deterministic** — pure functions with explicit dependencies

### What's inside

- **Core interfaces** — dependency injection contracts (`FileSystem`, `HttpClient`, `EngineContext`, etc.)
- **Schemas** — Zod schemas and TypeScript types for all grekt data structures
- **Artifact operations** — integrity, scanning, frontmatter parsing, lockfile management
- **Registry operations** — resolve, download, publish, OCI support
- **Sync operations** — plugin system, content generation, target templates
- **Version utilities** — semver parsing, comparison, bumping
- **Formatters** — bytes, tokens, numbers

For API details and usage examples, visit the [documentation](https://docs.grekt.com).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Feature requests and bug reports are welcome.

## License

[BSL 1.1](./LICENSE) — [What does this mean?](./LICENSING.md)
