/**
 * @grekt/cli-engine
 *
 * Deterministic core logic for grekt CLI.
 * Portable, testable, dependency-injected.
 */

// Core interfaces
export * from '#/core';

// Schemas (Zod validation)
export * from '#/schemas';

// Formatters (pure utilities)
export * from '#/formatters';

// Artifact (parsing, naming)
export * from '#/artifact';

// Registry (resolution, download, clients)
export * from '#/registry';

// TODO: Export modules as they are migrated
// export * from '#/sync';
// export * from '#/operations';
