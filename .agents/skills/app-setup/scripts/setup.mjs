#!/usr/bin/env node
// Cross-platform mechanical setup. Product routes/data remain the AI's job.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { planPwa } from './pwa.mjs'

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const projectRoot = process.cwd()
const usage = 'node <skill>/scripts/setup.mjs --tabs <tabs.json> [--pwa <pwa.json>] [--dry-run] (from project root)'
// Installed with the project's comwit-ui CLI for the detected router. app-shell brings the whole
// mobile shell (PageTransition/<Ssgoi> with the router adapter, scroller, TabShell, tab-bar,
// pull-to-refresh, glass); app-group-layout and app-screen are the only SsgoiPageBoundary owners
// (group layouts and pages). The skill's own assets only place these and list the tabs.
const UI_COMPONENTS = ['app-shell', 'app-group-layout', 'app-screen', 'bottom-sheet', 'button']
// Registry items above exist from these versions on. The CLI is bin-only, so it resolves by its entry file.
// comwit-ui 0.8.0 is the first registry whose shell uses SsgoiPageBoundary (AppGroupLayout/AppScreen);
// older shells key a RouteBoundary per route, which remounts pages Cache Components keeps alive.
const MIN_VERSIONS = {
  '@comwit/ui': { min: [0, 6, 0], entry: '@comwit/ui' },
  'comwit-ui': { min: [0, 8, 0], entry: 'comwit-ui/src/index.js' },
  // SsgoiPageBoundary ships in @ssgoi/react 7.5.0 (beta.2 is the first usable build).
  '@ssgoi/react': { min: [7, 5, 0, 'beta.2'], entry: '@ssgoi/react' },
}
// The installed boundary check (assets/tests) runs in `pnpm run validate` through this script.
const TEST_SCRIPT = ['test:app', 'node --test tests/*.test.mjs']
const TEMPLATE_VALIDATE = 'pnpm run --parallel "/^(typecheck|lint)$/"'
const APP_VALIDATE = 'pnpm run --parallel "/^(typecheck|lint|test:app)$/"'

/** -1/0/1 for semver [major, minor, patch, prerelease?]; a release sorts after its prereleases. */
function compareVersion(version, [major, minor, patch, pre]) {
  const [core, prerelease] = version.split('-', 2)
  const parts = core.split('.').map(Number)
  for (const [a, b] of [[parts[0], major], [parts[1], minor], [parts[2], patch]]) {
    if (a !== b) return a < b ? -1 : 1
  }
  if (!prerelease || !pre) return prerelease ? -1 : pre ? 1 : 0
  return prerelease.localeCompare(pre, 'en', { numeric: true })
}

/** Package "exports" may hide package.json, so walk up from the resolved entry to the package root. */
function installedVersion(requireFromProject, name, entry) {
  let dir = path.dirname(requireFromProject.resolve(entry))
  for (;;) {
    const manifest = path.join(dir, 'package.json')
    if (fs.existsSync(manifest)) {
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'))
      if (pkg.name === name) return pkg.version
    }
    const parent = path.dirname(dir)
    if (parent === dir) throw new Error(`Cannot find the installed version of ${name}`)
    dir = parent
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    console.log(usage)
    return
  }
  let tabsPath
  let pwaPath
  let dryRun = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true
    else if (args[i] === '--tabs' && args[i + 1] && !tabsPath) tabsPath = args[++i]
    else if (args[i] === '--pwa' && args[i + 1] && !pwaPath) pwaPath = args[++i]
    else throw new Error(usage)
  }
  if (!tabsPath) throw new Error(usage)

  const pkgPath = path.join(projectRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const declared = { ...pkg.dependencies, ...pkg.devDependencies }
  const requireFromProject = createRequire(pkgPath)
  for (const name of ['@comwit/ui', '@ssgoi/react', 'comwit-ui']) {
    if (!declared[name]) throw new Error(`Required package is not declared: ${name}`)
  }
  for (const name of ['@comwit/ui', '@ssgoi/react']) requireFromProject.resolve(name)
  for (const [name, { min, entry }] of Object.entries(MIN_VERSIONS)) {
    const version = installedVersion(requireFromProject, name, entry)
    if (compareVersion(version, min) < 0) {
      const wanted = `${min.slice(0, 3).join('.')}${min[3] ? `-${min[3]}` : ''}`
      throw new Error(`${name}@${version} is too old; app-setup needs ${name}@${wanted} or newer`)
    }
  }
  if (!fs.existsSync(path.join(projectRoot, 'comwit.json'))) {
    throw new Error('comwit.json is missing. Run pnpm exec comwit-ui init first.')
  }
  // Tab icons come from the kit's own set; a name is the export without its `Icon` suffix (House, Search …).
  const icons = requireFromProject('@comwit/ui/icons')
  const tabs = JSON.parse(fs.readFileSync(path.resolve(projectRoot, tabsPath), 'utf8'))
  if (!Array.isArray(tabs) || tabs.length < 2 || tabs.length > 5) {
    throw new Error('tabs.json must contain 2–5 tabs with href, label, icon')
  }
  const hrefs = new Set()
  for (const tab of tabs) {
    if (!tab || typeof tab.href !== 'string' ||
        !/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(tab.href) || hrefs.has(tab.href)) {
      throw new Error('Tab hrefs must be unique static paths, e.g. / or /search')
    }
    if (typeof tab.label !== 'string' || !tab.label.trim() ||
        typeof tab.icon !== 'string' || !/^[A-Z][A-Za-z0-9]*$/.test(tab.icon) ||
        typeof icons[`${tab.icon}Icon`] !== 'function') {
      throw new Error('Each tab needs a nonempty label and a Comwit icon name from @comwit/ui/icons (without the Icon suffix, e.g. House)')
    }
    hrefs.add(tab.href)
  }

  // Plan everything before writing: missing guides or a home collision cannot
  // leave a half-installed shell. Existing custom assets are never overwritten.
  const writes = []
  const moves = []
  const review = []
  // Shell UI comes from the comwit-ui registry, never from this skill. The CLI skips files that
  // already exist, so local edits survive; --no-install keeps the project's dependency pins.
  const cliEntry = requireFromProject.resolve('comwit-ui/src/index.js')
  const components = execFileSync(process.execPath, [
    cliEntry, 'add', ...UI_COMPONENTS, '--no-install', ...(dryRun ? ['--dry'] : []),
  ], { cwd: projectRoot, encoding: 'utf8' })
    .replace(/\x1b\[[0-9;]*m/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[✔•] /.test(line))
  const absolute = (relative) => path.join(projectRoot, relative)
  const read = (relative) => fs.readFileSync(absolute(relative), 'utf8')
  const write = (relative, content) => writes.push({ relative, content })
  await planPwa({
    projectRoot, skillRoot, writes, review, startUrl: tabs[0].href,
    options: pwaPath ? JSON.parse(fs.readFileSync(path.resolve(projectRoot, pwaPath), 'utf8')) : undefined,
  })
  function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name)
      return entry.isDirectory() ? walk(full) : [full]
    })
  }
  // src/: group layouts, tab list, PWA banner. tests/: the (app) boundary check.
  const assetSources = ['src', 'tests'].flatMap((base) =>
    walk(path.join(skillRoot, 'assets', base)).map((source) => ({ base, source })))
  for (const { base, source } of assetSources) {
    const relative = path.join(base, path.relative(path.join(skillRoot, 'assets', base), source))
    let content = fs.readFileSync(source, 'utf8')
    if (path.basename(source) === 'app-tabs.ts') {
      const imports = [...new Set(tabs.map((tab) => `${tab.icon}Icon`))].join(', ')
      content = content.replace("import { HouseIcon } from '@comwit/ui/icons'", `import { ${imports} } from '@comwit/ui/icons'`)
      content = content.replace(
        "  { href: '/', label: '홈', icon: HouseIcon },",
        tabs.map((tab) => `  { href: ${JSON.stringify(tab.href)}, label: ${JSON.stringify(tab.label)}, icon: ${tab.icon}Icon },`).join('\n'),
      )
    }
    if (!fs.existsSync(absolute(relative))) write(relative, content)
    else if (read(relative) !== content) review.push(`Reconcile existing file: ${relative}`)
  }

  for (const [insertName, relative] of [
    ['page.ai.md', 'src/services/page.ai.md'],
    ['state.ai.md', 'src/services/state.ai.md'],
    ['app.ai.md', 'src/app/.ai.md'],
  ]) {
    const guidePath = relative
    const current = read(guidePath)
    const insert = fs.readFileSync(path.join(skillRoot, 'assets', 'inserts', insertName), 'utf8').trimStart()
    const marker = insert.split('\n')[0]
    if (!current.includes(marker)) write(guidePath, current.trimEnd() + '\n\n' + insert)
    else if (!current.includes(insert.trimEnd())) review.push(`Reconcile existing guide block: ${relative}`)
  }

  // Keep the boundary check in validate after the skill removes itself.
  const scripts = { ...pkg.scripts }
  let scriptsChanged = false
  if (!scripts[TEST_SCRIPT[0]]) {
    scripts[TEST_SCRIPT[0]] = TEST_SCRIPT[1]
    scriptsChanged = true
  } else if (scripts[TEST_SCRIPT[0]] !== TEST_SCRIPT[1]) {
    review.push(`Make package.json "${TEST_SCRIPT[0]}" run tests/app-boundaries.test.mjs`)
  }
  if (scripts.validate === TEMPLATE_VALIDATE) {
    scripts.validate = APP_VALIDATE
    scriptsChanged = true
  } else if (scripts.validate !== APP_VALIDATE) {
    review.push(`Make package.json "validate" also run "${TEST_SCRIPT[0]}"`)
  }
  if (scriptsChanged) write('package.json', JSON.stringify({ ...pkg, scripts }, null, 2) + '\n')

  // The installed AppShell (<Ssgoi> + scroller, refresh, scroll chrome, back depth) wraps the routed
  // UI once. It holds no transition boundary: group layouts and pages own those.
  const client = 'src/services/app/page/layout/client.tsx'
  const currentClient = read(client)
  const templateReturn = 'return <>{children}</>'
  const shellReturn = 'return <AppShell tabs={APP_TABS} top={<PwaInstallBanner />}>{children}</AppShell>'
  const shellImports = [
    "import { AppShell } from '@/lib/components/ui/app-shell'",
    "import { APP_TABS } from './app-tabs'",
    "import { PwaInstallBanner } from './pwa-install-banner'",
  ].join('\n')
  if (!currentClient.includes('<AppShell')) {
    if (currentClient.split(templateReturn).length === 2 &&
        /^(['"])use client\1\r?\n/.test(currentClient)) {
      write(client, currentClient
        .replace(/^(['"])use client\1\r?\n/, `$&\n${shellImports}\n`)
        .replace(templateReturn, shellReturn))
    } else review.push(`Wrap routed UI with <AppShell tabs={APP_TABS} top={<PwaInstallBanner />}>, preserving user hydration: ${client}`)
  } else if (!currentClient.includes('<AppShell tabs={APP_TABS}')) {
    review.push(`Verify the existing AppShell receives tabs={APP_TABS} and preserves user hydration: ${client}`)
  }

  const home = 'src/app/(app)/page.tsx'
  if (fs.existsSync(absolute(home))) {
    if (hrefs.has('/')) {
      const target = 'src/app/(app)/(top-level)/page.tsx'
      if (fs.existsSync(absolute(target))) throw new Error(`Home route collision: ${home} and ${target}`)
      moves.push({ from: home, to: target })
      // Route-local companions and relative imports may depend on the old level.
      review.push('Check moved home relative imports and route-local layout/loading/error/metadata dependencies')
    } else review.push('Move the existing home into the appropriate group or replace it with a redirect inside a group')
  }
  for (const tab of tabs) {
    const relative = `src/app/(app)/(top-level)${tab.href === '/' ? '' : tab.href}/page.tsx`
    if (!fs.existsSync(absolute(relative)) && !moves.some((move) => move.to === relative)) {
      review.push(`Build or relocate tab page: ${relative}`)
    }
  }

  if (!dryRun) {
    for (const { relative, content } of writes) {
      fs.mkdirSync(path.dirname(absolute(relative)), { recursive: true })
      fs.writeFileSync(absolute(relative), content)
    }
    for (const { from, to } of moves) {
      fs.mkdirSync(path.dirname(absolute(to)), { recursive: true })
      fs.renameSync(absolute(from), absolute(to))
    }
  }
  console.log(JSON.stringify({
    dryRun, components, writes: writes.map((entry) => entry.relative), moves, review,
    next: dryRun
      ? 'Review the plan, then rerun without --dry-run. No files have been changed.'
      : 'Shell installed; product work remains. Resolve review items, connect requested routes (every page renders AppScreen/DetailScreen, every group layout AppGroupLayout), card-to-detail cache writes, shared detail queries and UI using the three installed guides, then validate and clean up (see SKILL.md).',
  }, null, 2))
}

try {
  await main()
} catch (error) {
  console.error(`app-setup: ${error.message}`)
  process.exitCode = 1
}
