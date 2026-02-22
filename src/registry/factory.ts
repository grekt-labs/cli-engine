/**
 * Registry client factory
 *
 * Single decision point for creating registry clients.
 * The factory is the ONLY place that knows about specific client implementations.
 */

import type { FileSystem, HttpClient, ShellExecutor, TarOperations } from "#/core";
import type { ResolvedRegistry, RegistryClient } from "./registry.types";
import { DefaultRegistryClient } from "./clients/default";
import { GitLabRegistryClient } from "./clients/gitlab";
import { GitHubRegistryClient } from "./clients/github";

/**
 * Create a registry client for the resolved registry
 */
export function createRegistryClient(
  registry: ResolvedRegistry,
  http: HttpClient,
  fs: FileSystem,
  shell: ShellExecutor,
  tar: TarOperations
): RegistryClient {
  switch (registry.type) {
    case "gitlab":
      return new GitLabRegistryClient(registry, http, fs, tar);
    case "github":
      return new GitHubRegistryClient(registry, http, fs, shell, tar);
    case "default":
    default:
      return new DefaultRegistryClient(registry, http, fs, tar);
  }
}
