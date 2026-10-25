# Public source snapshot

This repository starts new Git history from the maintainer's current working tree,
including uncommitted public source. `PUBLIC_SOURCE.json` records SHA-256 hashes
for the original 322 files. No original Git history, real environment
files, credentials, local database/uploads, caches or build output is copied.
Existing code, configuration, skills and rules are unchanged.

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm build
```

Run `pnpm agents:test` and `pnpm build-storybook` for agent and page-preview checks.

The app runs independently; it is not a package in the parent pnpm workspace.
The parent checks out this repository as a submodule and runs commands with
`pnpm --dir templates/base ...`.
Do not run deployment or connect real services as part of validation.

Use branches and PRs here first; update the parent submodule pointer afterward.
The main project is https://github.com/comwit/comwit.
