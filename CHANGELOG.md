## [5.3.4](https://github.com/grekt-labs/cli-engine/compare/v5.3.3...v5.3.4) (2026-02-05)


### Bug Fixes

* **gitlab:** use URL-encoded project path directly ([#47](https://github.com/grekt-labs/cli-engine/issues/47)) ([eb8a87b](https://github.com/grekt-labs/cli-engine/commit/eb8a87b584b7c3e7848f676ac0683992cf51c64e))

## [5.3.3](https://github.com/grekt-labs/cli-engine/compare/v5.3.2...v5.3.3) (2026-02-05)


### Bug Fixes

* **gitlab:** support Deploy Tokens for authentication ([#46](https://github.com/grekt-labs/cli-engine/issues/46)) ([97e399e](https://github.com/grekt-labs/cli-engine/commit/97e399e027b37686d36fcf3305d2ce3bbbeb62c3))

## [5.3.2](https://github.com/grekt-labs/cli-engine/compare/v5.3.1...v5.3.2) (2026-02-05)


### Bug Fixes

* safeParseYaml returns output type instead of input type ([#45](https://github.com/grekt-labs/cli-engine/issues/45)) ([db45017](https://github.com/grekt-labs/cli-engine/commit/db45017742010d725a22d70625eabf1d1d57e9b0))

## [5.3.1](https://github.com/grekt-labs/cli-engine/compare/v5.3.0...v5.3.1) (2026-02-05)


### Bug Fixes

* **gitlab:** normalize host and project config values ([#44](https://github.com/grekt-labs/cli-engine/issues/44)) ([58e3a47](https://github.com/grekt-labs/cli-engine/commit/58e3a475a915f17a779a062b93cae407b6a9e2f6))

# [5.3.0](https://github.com/grekt-labs/cli-engine/compare/v5.2.1...v5.3.0) (2026-02-05)


### Features

* add friendly-errors utility for human-readable parsing errors ([#43](https://github.com/grekt-labs/cli-engine/issues/43)) ([f670387](https://github.com/grekt-labs/cli-engine/commit/f67038731b67a77fddeb8bc36068c747d1773a85))

## [5.2.1](https://github.com/grekt-labs/cli-engine/compare/v5.2.0...v5.2.1) (2026-02-04)


### Bug Fixes

* change rules format from json to md ([688fa27](https://github.com/grekt-labs/cli-engine/commit/688fa27694079319da2328da8ef5bfe4736ee030))

# [5.2.0](https://github.com/grekt-labs/cli-engine/compare/v5.1.0...v5.2.0) (2026-02-04)


### Features

* **workspace:** add monorepo workspace support ([#41](https://github.com/grekt-labs/cli-engine/issues/41)) ([8199b01](https://github.com/grekt-labs/cli-engine/commit/8199b01e2d42ab32a57d85db9c58654f8c7d6543))

# [5.1.0](https://github.com/grekt-labs/cli-engine/compare/v5.0.0...v5.1.0) (2026-02-04)


### Features

* **version:** add bumpPrerelease function for beta versioning ([#39](https://github.com/grekt-labs/cli-engine/issues/39)) ([4baf214](https://github.com/grekt-labs/cli-engine/commit/4baf21454be947527f19854b1e7b8d9d1b567e38))

# [5.0.0](https://github.com/grekt-labs/cli-engine/compare/v4.8.2...v5.0.0) (2026-02-03)


### Features

* support scoped names in artifact manifest ([#38](https://github.com/grekt-labs/cli-engine/issues/38)) ([cb4b1a4](https://github.com/grekt-labs/cli-engine/commit/cb4b1a46932188579a991fd52234c6ed036efff4))
* trigger release ([9d2b7df](https://github.com/grekt-labs/cli-engine/commit/9d2b7dfe4da97a664a27cfe1f93759dd788dfeb9))


### BREAKING CHANGES

* Artifacts using author field for scope must migrate
to scoped name format (e.g., name: "@scope/artifact-name")

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

* docs: update architecture example for scoped name format

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

## [4.8.2](https://github.com/grekt-labs/cli-engine/compare/v4.8.1...v4.8.2) (2026-02-01)


### Bug Fixes

* require explicit project for GitHub registry ([#37](https://github.com/grekt-labs/cli-engine/issues/37)) ([dafc967](https://github.com/grekt-labs/cli-engine/commit/dafc967350be79ecdbcc39ee21fb81303107b4cd))

## [4.8.1](https://github.com/grekt-labs/cli-engine/compare/v4.8.0...v4.8.1) (2026-02-01)


### Bug Fixes

* derive GitHub registry namespace from scope automatically ([#36](https://github.com/grekt-labs/cli-engine/issues/36)) ([ead69fc](https://github.com/grekt-labs/cli-engine/commit/ead69fcc0c79c50e375d3a7cb4f7c5f4fe26c879))

# [4.8.0](https://github.com/grekt-labs/cli-engine/compare/v4.7.0...v4.8.0) (2026-02-01)


### Features

* add GitHub Container Registry (GHCR) support via OCI ([#35](https://github.com/grekt-labs/cli-engine/issues/35)) ([5560ef5](https://github.com/grekt-labs/cli-engine/commit/5560ef54249e1728b334627678800e6835d0ca7b))

# [4.7.0](https://github.com/grekt-labs/cli-engine/compare/v4.6.0...v4.7.0) (2026-02-01)


### Features

* optimize index terminology for efficient file loading ([#34](https://github.com/grekt-labs/cli-engine/issues/34)) ([6934e31](https://github.com/grekt-labs/cli-engine/commit/6934e3192651ce41383a3d2d64b1a737195c7a0e))

# [4.6.0](https://github.com/grekt-labs/cli-engine/compare/v4.5.1...v4.6.0) (2026-02-01)


### Features

* add auto-generated components schema and generator ([bdbef16](https://github.com/grekt-labs/cli-engine/commit/bdbef16d5d9c10d2abf8caad1a4cf15a5b698142))

## [4.5.1](https://github.com/grekt-labs/cli-engine/compare/v4.5.0...v4.5.1) (2026-02-01)


### Bug Fixes

* index only contains LAZY artifacts, add grk-types explanation ([#31](https://github.com/grekt-labs/cli-engine/issues/31)) ([ee7625c](https://github.com/grekt-labs/cli-engine/commit/ee7625cae7587fcff51f9d7879b8ab983bd4943e))
* remove autoSync from ProjectConfig schema ([#30](https://github.com/grekt-labs/cli-engine/issues/30)) ([fb61519](https://github.com/grekt-labs/cli-engine/commit/fb615197c82910bc96d762b4d062b522599ca82d))

# [4.5.0](https://github.com/grekt-labs/cli-engine/compare/v4.4.0...v4.5.0) (2026-02-01)


### Bug Fixes

* trigger failing release ([d32dca1](https://github.com/grekt-labs/cli-engine/commit/d32dca12dda8f3cf5f9242526019cac8d1eab3bc))


### Features

* **sync:** minify grekt blocks output ([#29](https://github.com/grekt-labs/cli-engine/issues/29)) ([382febe](https://github.com/grekt-labs/cli-engine/commit/382febe74e610fde21e7040b9f932f284746c2f8))

# [4.4.0](https://github.com/grekt-labs/cli-engine/compare/v4.3.1...v4.4.0) (2026-02-01)


### Features

* **sync:** minify grekt blocks output ([#29](https://github.com/grekt-labs/cli-engine/issues/29)) ([382febe](https://github.com/grekt-labs/cli-engine/commit/382febe74e610fde21e7040b9f932f284746c2f8))
* **sync:** wrap index in grekt-untrusted-context and add MANDATORY section ([0593241](https://github.com/grekt-labs/cli-engine/commit/0593241716d3bc19c4321fcc835cd4f54163ca26))

# [4.4.0](https://github.com/grekt-labs/cli-engine/compare/v4.3.1...v4.4.0) (2026-01-31)


### Features

* **sync:** wrap index in grekt-untrusted-context and add MANDATORY section ([0593241](https://github.com/grekt-labs/cli-engine/commit/0593241716d3bc19c4321fcc835cd4f54163ca26))

## [4.3.1](https://github.com/grekt-labs/cli-engine/compare/v4.3.0...v4.3.1) (2026-01-31)


### Bug Fixes

* trigger release ([3fd95e0](https://github.com/grekt-labs/cli-engine/commit/3fd95e00c394c7667ace44738ee7d179b88b46b5))

# [4.3.0](https://github.com/grekt-labs/cli-engine/compare/v4.2.0...v4.3.0) (2026-01-31)


### Features

* **index:** flatten artifact index format ([#28](https://github.com/grekt-labs/cli-engine/issues/28)) ([16b7a38](https://github.com/grekt-labs/cli-engine/commit/16b7a38e1100db022da2c1e61a906a7b9779b7d0))

# [4.2.0](https://github.com/grekt-labs/cli-engine/compare/v4.1.0...v4.2.0) (2026-01-31)


### Features

* **sync:** add getTargetPath hook to FolderPluginConfig ([#27](https://github.com/grekt-labs/cli-engine/issues/27)) ([64342b1](https://github.com/grekt-labs/cli-engine/commit/64342b12d2f315810066d08508edf736d6f65fda))

# [4.1.0](https://github.com/grekt-labs/cli-engine/compare/v4.0.0...v4.1.0) (2026-01-31)


### Features

* add detailed error messages for frontmatter validation ([8881015](https://github.com/grekt-labs/cli-engine/commit/88810153855aaf509e86b620ce4a32db8da32007))

# [4.0.0](https://github.com/grekt-labs/cli-engine/compare/v3.8.1...v4.0.0) (2026-01-31)


* fix(security)!: prevent shell injection and tar path traversal ([546ef36](https://github.com/grekt-labs/cli-engine/commit/546ef3630c6e7990e96606bae91c3e0413c2d05d))


### BREAKING CHANGES

* ShellExecutor interface changed from exec(command) to
execFile(command, args[]) to prevent shell injection attacks.

Security fixes:
- Shell injection: Use execFile with array args instead of exec with string
- Path traversal: PRE-extract validation with tar -tf/-tvf before extraction
- Symlink attacks: Detect and reject symlinks pointing outside target dir
- Temp files: Use crypto.randomUUID() instead of Date.now()
- BSD/GNU compat: Parse tar output compatible with both formats
- strip-components: Apply same strip to validation as extraction

Files changed:
- interfaces.ts: ShellExecutor.exec -> execFile (breaking)
- tar-utils.ts: New PRE-extract validation with symlink detection
- download.ts, default.ts, gitlab.ts: Use new validation
- mocks.ts: Update mock for new interface
- registry.types.ts: Add tempTarballPath option

## [3.8.1](https://github.com/grekt-labs/cli-engine/compare/v3.8.0...v3.8.1) (2026-01-31)


### Bug Fixes

* centralize keyword schemas with validation ([66e3a0c](https://github.com/grekt-labs/cli-engine/commit/66e3a0c5c5ec25a66b0bb05991ceef3f74d68ee2))
* increase hash length from 16 to 32 chars ([3ce6bfd](https://github.com/grekt-labs/cli-engine/commit/3ce6bfd8c581c4e4d9c0fb93bd3be3fc26106314))
* strict artifact ID regex (lowercase, numbers, hyphens) ([c9293bc](https://github.com/grekt-labs/cli-engine/commit/c9293bc5bc540c5da3e63093c94ca40e2e56989b))
* use type guard instead of unsafe casts ([ba08b83](https://github.com/grekt-labs/cli-engine/commit/ba08b83a13aa6b7dd30fa4b50b34285bde27e6db))
* validate S3 endpoint and publicUrl as URLs ([b2e827b](https://github.com/grekt-labs/cli-engine/commit/b2e827beb721f73ec4c2f39ffc25bdfe5112eb71))

# [3.8.0](https://github.com/grekt-labs/cli-engine/compare/v3.7.1...v3.8.0) (2026-01-30)


### Features

* trigger release ([a38186d](https://github.com/grekt-labs/cli-engine/commit/a38186df51e0200f05dfde7edb20fbfd2bfb492c))

## [3.7.1](https://github.com/grekt-labs/cli-engine/compare/v3.7.0...v3.7.1) (2026-01-29)


### Bug Fixes

* trigger release ([#17](https://github.com/grekt-labs/cli-engine/issues/17)) ([9221d83](https://github.com/grekt-labs/cli-engine/commit/9221d8314f6c0c4a60c478bef58cae0bb28cb441))

# [3.7.0](https://github.com/grekt-labs/cli-engine/compare/v3.6.0...v3.7.0) (2026-01-29)


### Features

* **schema:** rename rulesFile to contextEntryPoint and add component paths ([#15](https://github.com/grekt-labs/cli-engine/issues/15)) ([79c8356](https://github.com/grekt-labs/cli-engine/commit/79c83565f2abaaf081c184b14420185be4a4a273))

# [3.6.0](https://github.com/grekt-labs/cli-engine/compare/v3.5.0...v3.6.0) (2026-01-29)


### Features

* **scanner:** track invalid files with detailed error reasons ([#14](https://github.com/grekt-labs/cli-engine/issues/14)) ([9b12efd](https://github.com/grekt-labs/cli-engine/commit/9b12efd21badfd362193c31c6be31a0396a11567))

# [3.5.0](https://github.com/grekt-labs/cli-engine/compare/v3.4.0...v3.5.0) (2026-01-29)


### Features

* **schema:** unify project and artifact config schema ([422a896](https://github.com/grekt-labs/cli-engine/commit/422a8968120ad5577af7188257a15b03aab022b5))

# [3.4.0](https://github.com/grekt-labs/cli-engine/compare/v3.3.0...v3.4.0) (2026-01-29)


### Features

* sync strategies updated ([#13](https://github.com/grekt-labs/cli-engine/issues/13)) ([a97c632](https://github.com/grekt-labs/cli-engine/commit/a97c6327a24502fb6392b8190c505ab816cef70b))

# [3.3.0](https://github.com/grekt-labs/cli-engine/compare/v3.2.0...v3.3.0) (2026-01-28)


### Features

* **versioning:** add bumpVersion function for manual version bumping ([#11](https://github.com/grekt-labs/cli-engine/issues/11)) ([15a3f0f](https://github.com/grekt-labs/cli-engine/commit/15a3f0ffd9ada459adcd7f9aad25c3a0b3679d30))

# [3.2.0](https://github.com/grekt-labs/cli-engine/compare/v3.1.0...v3.2.0) (2026-01-28)


### Features

* **versioning:** add bumpVersion function for manual version bumping ([#10](https://github.com/grekt-labs/cli-engine/issues/10)) ([2d51581](https://github.com/grekt-labs/cli-engine/commit/2d5158186f6caad668647e2be62192290decb340))

# [3.1.0](https://github.com/grekt-labs/cli-engine/compare/v3.0.0...v3.1.0) (2026-01-28)


### Features

* **versioning:** add semantic versioning utilities ([#9](https://github.com/grekt-labs/cli-engine/issues/9)) ([ecda09f](https://github.com/grekt-labs/cli-engine/commit/ecda09fa02edcaa3e256a7aa0c71b5aca309d992))

# [3.0.0](https://github.com/grekt-labs/cli-engine/compare/v2.0.1...v3.0.0) (2026-01-28)


### Features

* update schema to avoid frontmatter conflicts ([#8](https://github.com/grekt-labs/cli-engine/issues/8)) ([02f42ca](https://github.com/grekt-labs/cli-engine/commit/02f42ca2c9aa08bb98ea794acdac6b4d040415b3))


### BREAKING CHANGES

* Versions must now be valid semver (no v prefix)

## [2.0.1](https://github.com/grekt-labs/cli-engine/compare/v2.0.0...v2.0.1) (2026-01-28)


### Bug Fixes

* upload full file due to mistake ([#7](https://github.com/grekt-labs/cli-engine/issues/7)) ([bca23f3](https://github.com/grekt-labs/cli-engine/commit/bca23f3bbe9c9334b1044b7ac673b5527e7977fc))

# [2.0.0](https://github.com/grekt-labs/cli-engine/compare/v1.9.0...v2.0.0) (2026-01-28)


* feat!: lazy loading system ([dc7839c](https://github.com/grekt-labs/cli-engine/commit/dc7839c54465705542ce29e922e9e7d85ec641b3))


### BREAKING CHANGES

* ArtifactEntrySchema now includes mode field (lazy default), new component types (mcp, rule), keywords required for publish

# [1.9.0](https://github.com/grekt-labs/cli-engine/compare/v1.8.0...v1.9.0) (2026-01-28)


### Features

* add lazy and core modes for artifacts ([#6](https://github.com/grekt-labs/cli-engine/issues/6)) ([bb4de4d](https://github.com/grekt-labs/cli-engine/commit/bb4de4d53f9af63e39714fe90db935049f7565b6))

# [1.8.0](https://github.com/grekt-labs/cli-engine/compare/v1.7.0...v1.8.0) (2026-01-26)


### Features

* **resolver:** make @ symbol optional in artifact IDs ([#4](https://github.com/grekt-labs/cli-engine/issues/4)) ([3fddca8](https://github.com/grekt-labs/cli-engine/commit/3fddca8a93a92f7c5633a706ddfe3ac1d474a195))

# [1.7.0](https://github.com/grekt-labs/cli-engine/compare/v1.6.0...v1.7.0) (2026-01-26)


### Features

* **gitlab:** use simple name without scope for self-hosted registries ([1311fce](https://github.com/grekt-labs/cli-engine/commit/1311fcecffc7de7f878dec8d24148bdca1193e97))

# [1.6.0](https://github.com/grekt-labs/cli-engine/compare/v1.5.0...v1.6.0) (2026-01-26)


### Features

* **gitlab:** prevent overwriting existing versions ([95130c5](https://github.com/grekt-labs/cli-engine/commit/95130c55493ce6df17653c1b5c56edb752352756))

# [1.5.0](https://github.com/grekt-labs/cli-engine/compare/v1.4.0...v1.5.0) (2026-01-26)


### Features

* **registry:** add error handling and integrity calculation ([702b51d](https://github.com/grekt-labs/cli-engine/commit/702b51d4a01264b1e34d4c5309dbc28520c1366a))

# [1.4.0](https://github.com/grekt-labs/cli-engine/compare/v1.3.0...v1.4.0) (2026-01-25)


### Features

* **sync:** add sync types and constants ([da2e7c3](https://github.com/grekt-labs/cli-engine/commit/da2e7c3734d2a9bbee2be3d07b4b7ed4b8ffbc98))

# [1.3.0](https://github.com/grekt-labs/cli-engine/compare/v1.2.0...v1.3.0) (2026-01-25)


### Features

* **registry:** add registry module with DI support ([21b3a81](https://github.com/grekt-labs/cli-engine/commit/21b3a81d2e37a42b23b4199c380b6ca33bdf9773))

# [1.2.0](https://github.com/grekt-labs/cli-engine/compare/v1.1.0...v1.2.0) (2026-01-25)


### Features

* add integrity, scanner, lockfile modules with FileSystem injection ([57303a1](https://github.com/grekt-labs/cli-engine/commit/57303a16246e3c021c2691e44746924960ba67af))

# [1.1.0](https://github.com/grekt-labs/cli-engine/compare/v1.0.2...v1.1.0) (2026-01-25)


### Features

* add artifact module (frontmatter, naming) ([803a66d](https://github.com/grekt-labs/cli-engine/commit/803a66d92428f49c2498e9c311e81265ebec89c5))

## [1.0.2](https://github.com/grekt-labs/cli-engine/compare/v1.0.1...v1.0.2) (2026-01-25)


### Bug Fixes

* resolve path aliases in .d.ts files using tsc-alias ([66c3e8b](https://github.com/grekt-labs/cli-engine/commit/66c3e8b8948fedc492c1d0608228cb3ef06ad8d3))

## [1.0.1](https://github.com/grekt-labs/cli-engine/compare/v1.0.0...v1.0.1) (2026-01-25)


### Bug Fixes

* change package scope to [@grekt-labs](https://github.com/grekt-labs) to match GitHub org ([75a51a4](https://github.com/grekt-labs/cli-engine/commit/75a51a48c10d3167502250b0ff0ad8d6443ac0c8))

# 1.0.0 (2026-01-25)


### Features

* move engine logic from cli to this separate package ([88d2cdd](https://github.com/grekt-labs/cli-engine/commit/88d2cddff1c1a8c9dc9ab04473b0308dd6de4631))
