# Public source snapshot

The `shop` branch of https://github.com/comwit/template contains the maintained
shop source. The same repository's `main` branch owns the shared base template.
`PUBLIC_SOURCE.json` records SHA-256 hashes for maintained public files; update
these deliberately with source changes. Real environment files, credentials,
local databases/uploads, caches and build output must remain untracked.

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm build
```

Run `pnpm test` for the isolated commerce tests. Real database, storage, payment
and notification services require your own environment values; `.env.example`
contains names and safe defaults only. Use the one-time `shop-setup` skill for a new storefront. Maintained development
skills remain after setup; the source repository keeps its distributable skill.

The app runs independently; it is not a package in the parent pnpm workspace.
The parent checks out this repository’s `shop` branch as a submodule and runs commands with
`pnpm --dir templates/shop ...`.
Do not run deployment or connect real services as part of validation.

Create change branches from `shop` and open their PRs against `shop`; common base
changes go through `main` first. Update the parent gitlink after the source PR merges.
The main project is https://github.com/comwit/comwit.
