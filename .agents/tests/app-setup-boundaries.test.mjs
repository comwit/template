import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// app-setup installs tests/app-boundaries.test.mjs into the project. Run it against a minimal
// project made from the skill's own group layouts, so the scaffold and the check cannot drift.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const assets = path.join(root, ".agents/skills/app-setup/assets");

const UI = {
  "src/lib/components/ui/app-screen.tsx": `'use client'
import { SsgoiPageBoundary } from '@ssgoi/react'
function AppScreen({ children }: { bar?: 'tab' | 'back' | 'sheet'; children: React.ReactNode }) {
  return <SsgoiPageBoundary>{children}</SsgoiPageBoundary>
}
function DetailScreen({ children }: { children: React.ReactNode; fallback: string }) {
  return <AppScreen bar="back">{children}</AppScreen>
}
export { AppScreen, DetailScreen }
`,
  "src/lib/components/ui/app-group-layout.tsx": `'use client'
import { SsgoiPageBoundary } from '@ssgoi/react'
function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <SsgoiPageBoundary>{children}</SsgoiPageBoundary>
}
export { AppGroupLayout }
`,
  "src/lib/components/ui/app-shell.tsx": `'use client'
import { Ssgoi } from '@ssgoi/react'
import { AppGroupLayout } from './app-group-layout'
function AppShell({ children }: { children: React.ReactNode }) {
  return <Ssgoi config={{}}><main>{children}</main></Ssgoi>
}
function TabShell({ children }: { children: React.ReactNode }) {
  return <AppGroupLayout>{children}<nav /></AppGroupLayout>
}
export { AppShell, TabShell }
`,
  "src/services/app/page/layout/index.tsx": `import { AppShell } from '@/lib/components/ui/app-shell'
export async function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
`,
  "src/app/(app)/layout.tsx": `import { Suspense } from 'react'
import { AppLayout } from '@/services/app/page/layout'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}><AppLayout>{children}</AppLayout></Suspense>
}
`,
  "src/app/(app)/(top-level)/page.tsx": `import Home from '@/services/app/page/home'
export default function Page() {
  return <Home />
}
`,
  "src/services/app/page/home/index.tsx": `import { AppScreen } from '@/lib/components/ui/app-screen'
export default function Home() {
  return <AppScreen bar="tab">home</AppScreen>
}
`,
  "src/app/(app)/(detail)/posts/[id]/page.tsx": `import { Suspense } from 'react'
import { DetailScreen } from '@/lib/components/ui/app-screen'
export default function Page() {
  return <DetailScreen fallback="/"><Suspense fallback={<p />}>post</Suspense></DetailScreen>
}
`,
  "src/app/(app)/(entry)/login/page.tsx": `import { AppScreen } from '@/lib/components/ui/app-screen'
export default async function Page() {
  return <AppScreen>login</AppScreen>
}
`,
};

function project(extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "app-boundaries-"));
  fs.cpSync(path.join(assets, "tests"), path.join(dir, "tests"), { recursive: true });
  fs.cpSync(path.join(assets, "src/app"), path.join(dir, "src/app"), { recursive: true });
  fs.symlinkSync(path.join(root, "node_modules"), path.join(dir, "node_modules"), "dir");
  for (const [file, content] of Object.entries({ ...UI, ...extra })) {
    const target = path.join(dir, file);
    if (content === null) { fs.rmSync(target); continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return dir;
}

function run(extra) {
  const dir = project(extra);
  try {
    // Drop the parent runner's context so the child reports its own exit status.
    const { NODE_TEST_CONTEXT: _context, ...env } = process.env;
    const result = spawnSync(process.execPath, ["--test", "tests/app-boundaries.test.mjs"], { cwd: dir, env, encoding: "utf8" });
    return { ok: result.status === 0, output: result.stdout + result.stderr };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("the scaffold group layouts pass the installed boundary check", () => {
  const { ok, output } = run();
  assert.ok(ok, output);
});

test("a page without AppScreen fails", () => {
  const { ok, output } = run({ "src/app/(app)/(detail)/about/page.tsx": "export default function Page() { return <div>about</div> }\n" });
  assert.equal(ok, false);
  assert.match(output, /\(detail\)\/about\/page\.tsx/);
});

test("a page wrapped only by a layout-level fallback still needs its own screen", () => {
  const { ok } = run({
    "src/app/(app)/(detail)/posts/[id]/page.tsx": "import { Suspense } from 'react'\nexport default function Page() { return <Suspense fallback={<p />}>post</Suspense> }\n",
  });
  assert.equal(ok, false);
});

test("a group layout without AppGroupLayout fails", () => {
  const { ok, output } = run({
    "src/app/(app)/(detail)/layout.tsx": "export default function Layout({ children }: { children: React.ReactNode }) { return children }\n",
  });
  assert.equal(ok, false);
  assert.match(output, /\(detail\)\/layout\.tsx/);
});

test("a boundary at the (app) layout fails", () => {
  const { ok } = run({
    "src/app/(app)/layout.tsx": "import { AppGroupLayout } from '@/lib/components/ui/app-group-layout'\nexport default function Layout({ children }: { children: React.ReactNode }) { return <AppGroupLayout>{children}</AppGroupLayout> }\n",
  });
  assert.equal(ok, false);
});

test("SSGOI outside the app service or a keyed boundary fails", () => {
  assert.equal(run({ "src/services/site/hero.tsx": "import { SsgoiPageBoundary } from '@ssgoi/react'\nexport const X = SsgoiPageBoundary\n" }).ok, false);
  assert.equal(run({ "src/services/app/page/home/boundary.tsx": "import { SsgoiPageBoundary } from '@ssgoi/react'\nexport const X = SsgoiPageBoundary\n" }).ok, false);
  assert.equal(run({ "src/lib/components/ui/route-boundary.tsx": "import { SsgoiRouteBoundary } from '@ssgoi/react/nextjs'\nexport const X = SsgoiRouteBoundary\n" }).ok, false);
});
