/**
 * Global constants for the Grekt CLI Engine
 */

export const REGISTRY_HOST = "registry.grekt.com";
export const REGISTRY_URL = `https://${REGISTRY_HOST}`;

// Regex to parse artifact ID: @scope/name (standard) or scope/name (@ optional)
// Optionally followed by @version
export const ARTIFACT_ID_REGEX = /^@?([^@/]+)\/([^@]+)(?:@(.+))?$/;
