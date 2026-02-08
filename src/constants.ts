/**
 * Global constants for the Grekt CLI Engine
 */

export const REGISTRY_HOST = "registry.grekt.com";
export const REGISTRY_URL = `https://${REGISTRY_HOST}`;

// Base path for the registry REST API.
// Empty because registry.grekt.com is a Worker that already proxies to the edge functions.
export const DEFAULT_REGISTRY_API_PATH = "";

// Regex to parse artifact ID: @scope/name or scope/name
// Scope and name: lowercase alphanumeric with hyphens (not at start/end)
// Optionally followed by @version
export const ARTIFACT_ID_REGEX = /^@?([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:@(.+))?$/;
