/**
 * Global constants for the Grekt CLI Engine
 */

export const REGISTRY_HOST = "registry.grekt.com";
export const REGISTRY_URL = `https://${REGISTRY_HOST}`;

// Regex to parse artifact ID: @scope/name or scope/name
// Scope and name: lowercase alphanumeric with hyphens (not at start/end)
// Optionally followed by @version
export const ARTIFACT_ID_REGEX = /^@?([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:@(.+))?$/;
