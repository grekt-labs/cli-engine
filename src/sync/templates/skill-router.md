# Grekt Skill Loader

Skill router for `.grekt/artifacts/`.

## Direct mode: `/grekt skill <name>`

1. `find .grekt/artifacts -path "*/skills/<name>/SKILL.md"`
2. Found → read and execute it
3. Not found → suggest closest from search mode listing
4. No match → remote fallback

## Search mode: `/grekt <question>`

1. `find .grekt/artifacts -name "SKILL.md" -path "*/skills/*" | sed 's|/SKILL.md||' | xargs -n1 basename`
2. Match intent against folder names
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
- Direct mode: one find, no listing.
- Execute loaded skills as your own. Do not summarize them.
- Never bypass `remoteSearch: false`.
