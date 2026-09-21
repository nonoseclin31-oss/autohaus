# Project skills

Skills vendored from **ECC** by Affaan Mustafa — https://github.com/affaan-m/ECC (MIT,
v2.2.2). Copied on 2026-09-21.

## Why they are copied rather than installed as a plugin

ECC's normal install (`/plugin install ecc@ecc`, or `npx ecc-universal setup`) needs the
standalone `claude` CLI, which is not on this machine — the Claude Code desktop app does
not put it on `PATH`. The full plugin also registers **24 hook matchers** on
`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `Stop`, `SessionStart`, `SessionEnd`
and `PreCompact`, which run its Node scripts automatically around every tool call in
every project.

Copying only the skills gives the guidance with none of that: no automatic execution, no
global config changes, and removing the folder undoes it completely.

## What is here — 27 skills, 324 KB

| Area | Skills |
| --- | --- |
| React / Next.js | `react-patterns`, `react-performance`, `react-testing`, `nextjs-turbopack` |
| Frontend & design | `frontend-patterns`, `frontend-a11y`, `accessibility`, `design-system`, `motion-foundations`, `make-interfaces-feel-better`, `seo` |
| Data | `prisma-patterns`, `postgres-patterns`, `database-migrations` |
| Backend | `api-design`, `error-handling` |
| Quality | `tdd-workflow`, `e2e-testing`, `browser-qa`, `verification-loop`, `coding-standards` |
| Security | `security-review`, `security-scan` |
| Ops & navigation | `deployment-patterns`, `git-workflow`, `code-tour`, `codebase-onboarding` |

Every one was checked to be self-contained: no references to `CLAUDE_PLUGIN_ROOT`, ECC
hook paths or `ecc-universal`, so none of them break without the plugin. `ecc-guide` was
deliberately **not** copied — it documents the full plugin install and assumes
infrastructure that is not here.

## Adding more

ECC ships 292 skills in total; these 27 are the ones relevant to this stack. To add
others, clone the repo and copy the folder:

```bash
git clone --depth 1 https://github.com/affaan-m/ECC.git /tmp/ECC
cp -R /tmp/ECC/skills/<skill-name> .claude/skills/
```

## Removing

```bash
rm -rf .claude/skills
```

## Note

These are third-party instructions that Claude follows once loaded. They are guidance
documents, not executable code, but they do shape how Claude approaches work in this
repo. Skim any skill before relying on it for something important.
