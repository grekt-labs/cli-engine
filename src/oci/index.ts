/**
 * OCI Distribution Spec module
 *
 * Native client for pulling artifacts from OCI-compliant registries.
 * Used by GitHubRegistryClient for GHCR support.
 */

export { OciClient } from "./oci-client";
export type {
  OciDescriptor,
  OciManifest,
  OciTagsList,
  OciRegistryConfig,
  PullManifestResult,
  PullBlobResult,
  ListTagsResult,
} from "./oci.types";
export { GREKT_MEDIA_TYPES } from "./oci.types";
