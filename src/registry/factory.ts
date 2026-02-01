/**
 * Registry client factory
 *
 * Single decision point for creating registry clients.
 * The factory is the ONLY place that knows about specific client implementations.
 */

import type { FileSystem, HttpClient, ShellExecutor } from "#/core";
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
  shell: ShellExecutor
): RegistryClient {
  switch (registry.type) {
    case "gitlab":
      return new GitLabRegistryClient(registry, http, fs, shell);
    case "github":
      return new GitHubRegistryClient(registry, http, fs, shell);
    case "default":
    default:
      return new DefaultRegistryClient(registry, http, fs, shell);
  }
}
