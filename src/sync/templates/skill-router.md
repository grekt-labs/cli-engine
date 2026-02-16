# Grekt Skill Loader

**READ THIS CAREFULLY.** Do not improvise or skip steps.

Skill router for `.grekt/artifacts/`.

## Direct mode: `/grekt skill <name>`

1. Exact lookup (standard): `find .grekt/artifacts -path "*/skills/<name>/SKILL.md"`
2. Found → read and execute it
3. Exact lookup (flat file): `find .grekt/artifacts -path "*/skills/<name>.md"`
4. Found → read and execute it
5. Partial lookup: `find .grekt/artifacts -name "*.md" -path "*/skills/*" | grep -i "<name>"` and also `find .grekt/artifacts -name "SKILL.md" -path "*/skills/*" | grep -i "<name>"`
6. One match → read and execute it
7. Multiple matches → AskUserQuestion to pick one
8. No match → remote fallback

## Search mode: `/grekt <question>`

1. Collect all skill names from both conventions:
   - Standard (folder): `find .grekt/artifacts -name "SKILL.md" -path "*/skills/*" | sed 's|/SKILL.md||' | xargs -I{} basename "{}"`
   - Flat file: `find .grekt/artifacts -name "*.md" -path "*/skills/*" ! -name "SKILL.md" | xargs -I{} basename "{}" .md`
2. Deduplicate and match intent against skill names
3. One match → load it. Multiple → AskUserQuestion. None → remote fallback.

## Remote fallback

Triggered when no local skill matches.

1. Read `grekt.yaml`. If `remoteSearch: false` → list local skills only, stop.
2. AskUserQuestion: "No local match. Search the public registry?"
3. On accept: `curl -s "https://registry.grekt.com/search-artifacts?q=<query>&category=skills&limit=5"`
4. Show results (id, description, version). Ask which to install.
5. Install: `grekt add <id>@<version> && grekt sync`

## Rules

- One skill file per invocation. Never read multiple.
- Work from folder names only. Never read files to explore.
- Direct mode: exact first, then partial. No full listing unless needed.
- Execute loaded skills as your own. Do not summarize them.
- Never bypass `remoteSearch: false`.
