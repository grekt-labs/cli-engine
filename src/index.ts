/**
 * @grekt/cli-engine
 *
 * Deterministic core logic for grekt CLI.
 * Portable, testable, dependency-injected.
 */

// Core interfaces
export * from '#/core';

// Categories (central definition of artifact component types)
export * from '#/categories';

// Schemas (Zod validation)
export * from '#/schemas';

// Formatters (pure utilities)
export * from '#/formatters';

// Artifact (parsing, naming)
export * from '#/artifact';

// Registry (resolution, download, clients)
export * from '#/registry';

// Sync (types and constants, implementation in CLI)
export * from '#/sync';

// Artifact Index (lazy loading index generation)
export * from '#/artifactIndex';

// Version utilities (semver validation, comparison)
export * from '#/version';

// OCI Distribution Spec (GHCR support)
export * from '#/oci';

// Workspace (monorepo support)
export * from '#/workspace';

// TODO: Export modules as they are migrated
// export * from '#/operations';
