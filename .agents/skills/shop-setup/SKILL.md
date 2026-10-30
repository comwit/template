---
name: shop-setup
description: Shape the first storefront request in a new project from the template shop branch using real brand reference screenshots, existing commerce pages and Storybook; guide MCP database/storage setup and remove this one-time skill only after successful validation. Use for initial shop branding and setup, not routine edits or maintenance of the template source.
---

# Shop setup

Build the user's first shop on the existing commerce implementation. Keep the
cart, inventory reservations, orders, payment/notification boundaries, customer
accounts and separate admin service intact. This is a storefront setup, not a
mobile app shell. Never run completion cleanup in the maintained template repository.

## Choose a direction from actual examples

Read `assets/catalog.json` and [reference provenance](references/sources.md).
Open the home/detail images for examples relevant to the user's products. Show a
small set of actual reference images and source links; choose a direction with the
user when the brief leaves the brand identity open. A supplied brief or reference
can already settle that choice. The six browsing groups are fashion, food/drink,
pets, jewelry/accessories, living/craft and beauty/fragrance; they are starting
points, not a fixed list of products the shop can sell.

Record the chosen example IDs, brand name, intended tone and required first pages
in `.agents/state/shop-setup.json`. Keep progress here so a failed or interrupted
setup can resume. Do not store credentials or customer data. Use the screenshots
to guide composition, typography and spacing; don't copy their logos/product
photos into the storefront without separately established rights. User references
and branding take precedence over the catalog.

## Implement the first pages and stories

Read `AGENTS.md`, `src/app/.ai.md`, `src/services/{page,state,api}.ai.md`,
`src/server/repository/.ai.md` and `src/services/admin/.ai.md`.
`docs/shop-reference.json` lists the actual routes and DB definitions.
Keep routing in `src/app/` and screen implementations in `src/services/*/page/`.
Extend the existing home, product list and product detail before adding routes.
Reuse the real state/API contracts, not a parallel static storefront.

Follow the existing `src/stories/` CSF stories, `.storybook/main.ts` public API
mock aliases and `src/stories/mocks/` fixtures. Add or update stories for the
changed real pages, including empty/loading/error states where relevant. Never
connect Storybook to a real database, storage, payment gateway or customer data.
Keep the administrator screens and their public path mapping. Initialize the public admin path with `pnpm admin:path` after project environment
setup, preserving any existing `NEXT_PUBLIC_ADMIN_BASE_PATH`. For a user-chosen
path, use the admin guide’s `--path` option and tell the user the resulting URL; a hidden URL does not replace authorization.

## Connect resources when needed

Read [MCP resource setup](references/mcp.md) before resource work. Inspect the
connected project's available Comwit MCP tools and existing binding first. Guide
DB and storage connection through those tools; don't invent IDs, directly use a
Cloud CLI to create them, re-register MCP or replace this project's commerce
schema with a generic scaffold. A request for visuals alone does not authorize
resource creation, schema migration or production deployment.

If the user wants a mock-only preview, record `deferred-by-user` for each resource
and explain that it is not a connected production shop. Otherwise keep setup
incomplete until required resources are connected. Never treat unavailable tools,
failed auth or a pending resource as success. The persistent integration guide
remains at `docs/shop-resources.md` after this skill is removed.

## Verify and complete once

Review the actual pages and Storybook at desktop and mobile sizes. Resolve errors
and confirm the requested scope is implemented. Record the implemented page and
story file paths and visual verification in `.agents/state/shop-setup.json`:

```json
{
  "status": "ready",
  "brand": "chosen brand or supplied reference",
  "pages": ["src/services/app/page/home/index.tsx"],
  "stories": ["src/stories/shop/home.stories.tsx"],
  "resources": { "database": "connected", "storage": "connected" },
  "visualReview": true
}
```

The paths are examples: list the actual nonempty files you implemented. During
work use `status: "in-progress"`; `deferred-by-user` is allowed only after the
user chooses a mock-only scope. An error or unfinished scope keeps this skill.

Run `node .agents/scripts/cleanup-skill.mjs shop-setup`. It refuses the maintained
source remote (`comwit/template`, including maintenance branches, or the legacy
`comwit/template-shop`), verifies artifact paths and resource decisions, runs `validate`,
`test`, `agents:test` and `storybook:build`, and checks runtime files for remaining
references into this skill before removing anything. A failing check leaves the
skill and its assets installed. Re-run after fixing the issue.

Before cleanup, move any genuinely used asset to a persistent project path and
update its imports. The helper removes only this skill directory and its Claude
stub; it never deletes pages, stories, public assets, other skills or service
configuration. Unused screenshots inside this skill disappear with it. Completion
progress remains in the ignored state file. Do not run this procedure as part of
template maintenance or creation of the distributable skill itself.
