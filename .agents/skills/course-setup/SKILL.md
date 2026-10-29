---
name: course-setup
description: Shape the first learner-facing screens of a new project from the template course branch using the project's own design references, the existing course/enrollment/payment implementation and Storybook; guide MCP database/storage setup and remove this one-time skill only after successful validation. Use for the initial branding and setup of a course platform, not routine edits or maintenance of the template source.
---

# Course platform setup

Build the user's first course platform on the existing implementation. Keep the
course catalog, curriculum, enrollments and progress, orders/payments/refunds,
coupons, reviews/Q&A, notices/banners, learner accounts and the separate admin
service intact. Never run completion cleanup in the maintained template repository.

## Choose a direction from the project's references

Derived projects collect their own design references (screenshots of real course
sites the owner likes) in a `references/` folder next to the project or in the
brief. Read them with the user and settle brand name, tone and the first pages to
build. Record the chosen references, brand name, intended tone and required first
pages in `.agents/state/course-setup.json`. Keep progress here so a failed or
interrupted setup can resume. Do not store credentials or learner data. Use the
references to guide composition, typography and spacing; never copy their logos,
photos or course content.

## Implement the first pages and stories

Read `AGENTS.md`, `src/app/.ai.md`, `src/services/{page,state,api}.ai.md`,
`src/server/repository/.ai.md`, `src/services/design.md` and
`src/services/admin/.ai.md`. Keep routing in `src/app/` and screen implementations
in `src/services/app/page/`. The learner routes are working skeletons: home,
`/courses`, `/courses/[id]`, `/checkout/[courseId]`, `/checkout/result`,
`/learn/[courseId]/[lessonId]` (player), `/account`, `/account/courses`,
`/account/orders`, `/account/orders/[id]`, `/account/certificates/[id]`,
`/notices`, `/notices/[id]`, `/login`, `/signup`. Extend them before adding routes.
Reuse the real state/API contracts (`useCatalog`, `useCheckout`, `useEnrollments`,
`useOrders`, `useCommunity`, `useContent`, `useUser`), not a parallel static site.
The lesson player (`src/services/app/page/learn/lesson-player.tsx`) already saves
progress and supports playback speed; restyle it, do not replace its wiring.

Follow the existing `src/stories/` CSF stories, `.storybook/main.ts` public API
mock aliases and `src/stories/mocks/` fixtures. Add or update stories for the
changed real pages, including empty/loading/error states where relevant. Never
connect Storybook to a real database, storage, payment gateway or learner data.
Keep the administrator screens and their public path mapping. Initialize the
public admin path with `pnpm admin:path` after project environment setup,
preserving any existing `NEXT_PUBLIC_ADMIN_BASE_PATH`. For a user-chosen path,
use the admin guide's `--path` option and tell the user the resulting URL; a
hidden URL does not replace authorization.

## Connect resources when needed

Read [MCP resource setup](references/mcp.md) before resource work. Inspect the
connected project's available Comwit MCP tools and existing binding first. Guide
DB and storage connection through those tools; don't invent IDs, directly use a
Cloud CLI to create them, re-register MCP or replace this project's course schema
with a generic scaffold. A request for visuals alone does not authorize resource
creation, schema migration or production deployment. Videos are not uploaded to
project storage: lessons embed YouTube (unlisted) or a direct video URL.

If the user wants a mock-only preview, record `deferred-by-user` for each resource
and explain that it is not a connected production platform. Otherwise keep setup
incomplete until required resources are connected. Never treat unavailable tools,
failed auth or a pending resource as success. The persistent integration guide
remains at `docs/course-resources.md` after this skill is removed.

## Verify and complete once

Review the actual pages and Storybook at desktop and mobile sizes. Resolve errors
and confirm the requested scope is implemented. Record the implemented page and
story file paths and visual verification in `.agents/state/course-setup.json`:

```json
{
  "status": "ready",
  "brand": "chosen brand or supplied reference",
  "pages": ["src/services/app/page/home/index.tsx"],
  "stories": ["src/stories/course/home.stories.tsx"],
  "resources": { "database": "connected", "storage": "connected" },
  "visualReview": true
}
```

The paths are examples: list the actual nonempty files you implemented. During
work use `status: "in-progress"`; `deferred-by-user` is allowed only after the
user chooses a mock-only scope. An error or unfinished scope keeps this skill.

Run `node .agents/scripts/cleanup-skill.mjs course-setup`. It refuses the
maintained source remote (`comwit/template`, including maintenance branches),
verifies artifact paths and resource decisions, runs `validate`, `agents:test`
and `storybook:build`, and checks runtime files for remaining references into
this skill before removing anything. A failing check leaves the skill installed.
Re-run after fixing the issue.

The helper removes only this skill directory and its Claude stub; it never deletes
pages, stories, public assets, other skills or service configuration. Completion
progress remains in the ignored state file. Do not run this procedure as part of
template maintenance, CI or creation of the distributable skill itself.
