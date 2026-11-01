// Installed by app-setup. Runs in `pnpm run validate` through the `test:app` script.
//
// `(app)` transitions use SSGOI `SsgoiPageBoundary`. With Next.js Cache Components a visited
// route is not unmounted: React hides it inside `<Activity>` (`display: none !important` on its
// top-most host node) and shows it again on Back, state intact. That hide/show is the OUT/IN,
// so a page or group layout without a boundary changes with no transition and leaves no trace.
// Boundaries are therefore created only by the shared components: every page renders
// `AppScreen` (or `DetailScreen`), every group or persistent layout renders `AppGroupLayout`.
//
// This test follows each route file's default export through its JSX and imports (TypeScript
// AST, not string search) and checks that it reaches those components. A render test cannot
// cover every page that needs server data or a session, so this is a structural check.
//
// Exception lists must be exact in both directions: an exception that starts rendering the
// boundary fails too. Add every exception with its reason.
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const APP_GROUP = path.join(SRC, 'app/(app)')
const UI = path.join(SRC, 'lib/components/ui')

/** The installed comwit-ui components that own `SsgoiPageBoundary`. */
const MARKERS = {
  AppScreen: { file: path.join(UI, 'app-screen.tsx'), names: ['AppScreen', 'DetailScreen'] },
  AppGroupLayout: { file: path.join(UI, 'app-group-layout.tsx'), names: ['AppGroupLayout'] },
}

/** Pages that need not render `AppScreen`. Paths are relative to `src/app/(app)`. */
const PAGE_EXCEPTIONS = {
  // Redirect only; renders nothing.
  //   '(detail)/me/page.tsx': 'redirect only',
  // `@modal` intercepts float over the background page and are never wrapped.
  //   '(top-level)/@modal/(.)posts/[id]/page.tsx': '@modal intercept',
  // Panes inside a persistent layout whose own AppGroupLayout is the screen.
  //   '(detail)/projects/[id]/settings/page.tsx': 'project workspace pane',
}

/** Persistent layouts that render the screen itself (`AppScreen`) instead of a group boundary. */
const SCREEN_LAYOUTS = {}

/** Layouts that need no boundary. */
const LAYOUT_EXCEPTIONS = {
  // Service layout: auth hydration and AppShell (`<Ssgoi>` + scroller). A boundary here would
  // trap every move between (top-level), (detail) and (entry) inside it.
  'layout.tsx': 'service layout, Ssgoi provider only',
  // Pass-through layouts that render only `children` (auth guards, parallel-slot hosts).
  //   '(detail)/(protected)/layout.tsx': 'auth guard pass-through',
}

/** Where `@ssgoi/react` may be imported (paths relative to src/). SSGOI stays in the app service. */
const SSGOI_IMPORT_DIRS = ['lib/components/ui/', 'services/app/']
/** Where `<Ssgoi>` and `SsgoiPageBoundary` may be rendered: the installed shell components only. */
const BOUNDARY_DIRS = ['lib/components/ui/']

// ── Static render graph ──────────────────────────────────────────────────────

const modules = new Map()

function resolveModule(spec, from) {
  let base
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
  else return null
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

function hasModifier(node, kind) {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === kind)
}

function parse(file) {
  const cached = modules.get(file)
  if (cached) return cached
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const info = { imports: new Map(), locals: new Map(), exports: new Map(), stars: [], defaultNode: undefined }
  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
      const clause = stmt.importClause
      if (!clause || clause.isTypeOnly) continue
      const spec = stmt.moduleSpecifier.text
      if (clause.name) info.imports.set(clause.name.text, { spec, name: 'default' })
      const bindings = clause.namedBindings
      if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) {
          if (!el.isTypeOnly) info.imports.set(el.name.text, { spec, name: (el.propertyName ?? el.name).text })
        }
      }
    } else if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly) continue
      const spec = stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : null
      if (!stmt.exportClause) {
        if (spec) info.stars.push(spec)
      } else if (ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          const local = (el.propertyName ?? el.name).text
          info.exports.set(el.name.text, spec ? { spec, name: local } : { local })
        }
      }
    } else if (ts.isExportAssignment(stmt)) {
      info.defaultNode = stmt.expression
    } else if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
      const isDefault = hasModifier(stmt, ts.SyntaxKind.DefaultKeyword)
      if (stmt.name) info.locals.set(stmt.name.text, stmt)
      if (isDefault) info.defaultNode = stmt
      else if (stmt.name && hasModifier(stmt, ts.SyntaxKind.ExportKeyword)) {
        info.exports.set(stmt.name.text, { local: stmt.name.text })
      }
    } else if (ts.isVariableStatement(stmt)) {
      const exported = hasModifier(stmt, ts.SyntaxKind.ExportKeyword)
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !decl.initializer) continue
        info.locals.set(decl.name.text, decl.initializer)
        if (exported) info.exports.set(decl.name.text, { local: decl.name.text })
      }
    }
  }
  modules.set(file, info)
  return info
}

/** JSX tag identifiers rendered anywhere inside `node` (props such as `fallback={<X />}` included). */
function renderedTags(node) {
  const tags = []
  const visit = (n) => {
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && ts.isIdentifier(n.tagName)) {
      tags.push(n.tagName.text)
    }
    ts.forEachChild(n, visit)
  }
  visit(node)
  return tags
}

const memo = new Map()

/** Whether `file`'s export `name` renders `marker`, following JSX tags through imports. */
function exportRenders(file, name, marker) {
  const { file: markerFile, names } = MARKERS[marker]
  if (file === markerFile && names.includes(name)) return true
  const key = `${marker}\0${file}\0${name}`
  const known = memo.get(key)
  if (known !== undefined) return known
  memo.set(key, false) // cycle guard
  const info = parse(file)
  let result = false
  if (name === 'default' && info.defaultNode) {
    result = ts.isIdentifier(info.defaultNode)
      ? localRenders(file, info.defaultNode.text, marker, new Set())
      : nodeRenders(file, info.defaultNode, marker, new Set())
  } else {
    const target = info.exports.get(name)
    if (target && 'local' in target) result = localRenders(file, target.local, marker, new Set())
    else if (target) result = bindingRenders(file, target, marker)
    else {
      result = info.stars.some((spec) => {
        const resolved = resolveModule(spec, file)
        return resolved !== null && exportRenders(resolved, name, marker)
      })
    }
  }
  memo.set(key, result)
  return result
}

function bindingRenders(file, binding, marker) {
  const resolved = resolveModule(binding.spec, file)
  return resolved !== null && exportRenders(resolved, binding.name, marker)
}

function localRenders(file, name, marker, seen) {
  const { file: markerFile, names } = MARKERS[marker]
  if (file === markerFile && names.includes(name)) return true
  const info = parse(file)
  const imported = info.imports.get(name)
  if (imported) return bindingRenders(file, imported, marker)
  const node = info.locals.get(name)
  if (!node || seen.has(name)) return false
  seen.add(name)
  return nodeRenders(file, node, marker, seen)
}

function nodeRenders(file, node, marker, seen) {
  return renderedTags(node).some((tag) => localRenders(file, tag, marker, seen))
}

// ── Route files ──────────────────────────────────────────────────────────────

function walk(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const routeFiles = walk(APP_GROUP)
const rel = (file) => path.relative(APP_GROUP, file).split(path.sep).join('/')
const pages = routeFiles.filter((file) => path.basename(file) === 'page.tsx').map(rel).sort()
const layouts = routeFiles.filter((file) => path.basename(file) === 'layout.tsx').map(rel).sort()
const renders = (routeFile, marker) => exportRenders(path.join(APP_GROUP, routeFile), 'default', marker)

describe('(app) transition boundaries', () => {
  it('finds the installed boundary components', () => {
    for (const { file } of Object.values(MARKERS)) {
      assert.ok(existsSync(file), `${path.relative(ROOT, file)} is missing; run pnpm ui add app-shell app-screen`)
    }
  })

  it('renders AppScreen from every page that is not an explicit exception', () => {
    const missing = pages.filter((page) => !(page in PAGE_EXCEPTIONS) && !renders(page, 'AppScreen'))
    assert.deepEqual(missing, [])
  })

  it('keeps the page exception list exact', () => {
    const stale = Object.keys(PAGE_EXCEPTIONS).filter((page) => !pages.includes(page))
    const covered = Object.keys(PAGE_EXCEPTIONS).filter((page) => pages.includes(page) && renders(page, 'AppScreen'))
    assert.deepEqual({ stale, covered }, { stale: [], covered: [] })
  })

  it('renders AppGroupLayout from every group and persistent layout', () => {
    const missing = layouts.filter((layout) =>
      !(layout in LAYOUT_EXCEPTIONS) &&
      !(layout in SCREEN_LAYOUTS) &&
      !renders(layout, 'AppGroupLayout'),
    )
    assert.deepEqual(missing, [])
    const screenLayoutsWithoutScreen = Object.keys(SCREEN_LAYOUTS).filter((layout) => !renders(layout, 'AppScreen'))
    assert.deepEqual(screenLayoutsWithoutScreen, [])
  })

  it('keeps the layout exception lists exact and the (app) root free of boundaries', () => {
    const listed = [...Object.keys(LAYOUT_EXCEPTIONS), ...Object.keys(SCREEN_LAYOUTS)]
    assert.deepEqual(listed.filter((layout) => !layouts.includes(layout)), [])
    const bounded = Object.keys(LAYOUT_EXCEPTIONS).filter((layout) =>
      renders(layout, 'AppGroupLayout') || renders(layout, 'AppScreen'),
    )
    assert.deepEqual(bounded, [])
  })

  it('keeps SSGOI in the app service, boundaries in the shell components, and no keyed boundaries', () => {
    const importers = walk(SRC)
      .filter((file) => /\.(?:tsx?|mts|cts)$/.test(file))
      .flatMap((file) => {
        const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, false)
        const imports = sf.statements.filter((stmt) =>
          ts.isImportDeclaration(stmt) &&
          ts.isStringLiteral(stmt.moduleSpecifier) &&
          stmt.moduleSpecifier.text.startsWith('@ssgoi/react'),
        )
        const specs = imports.map((stmt) => stmt.moduleSpecifier.text)
        const names = imports.flatMap((stmt) => {
          const bindings = stmt.importClause?.namedBindings
          return bindings && ts.isNamedImports(bindings) ? bindings.elements.map((el) => (el.propertyName ?? el.name).text) : []
        })
        return imports.length ? [{ file: path.relative(SRC, file).split(path.sep).join('/'), specs, names }] : []
      })
    const outside = importers.filter(({ file }) => !SSGOI_IMPORT_DIRS.some((dir) => file.startsWith(dir)))
    assert.deepEqual(outside.map(({ file }) => file), [])
    const boundaries = importers.filter(({ file, names }) =>
      !BOUNDARY_DIRS.some((dir) => file.startsWith(dir)) && names.some((name) => name === 'Ssgoi' || name === 'SsgoiPageBoundary'),
    )
    assert.deepEqual(boundaries.map(({ file }) => file), [])
    // SsgoiLayoutBoundary / the deprecated router subpaths key boundaries by route and remount
    // the page, discarding the state Cache Components keeps. Never mix them with SsgoiPageBoundary.
    const keyed = importers.filter(({ specs, names }) =>
      specs.some((spec) => /^@ssgoi\/react\/(?:nextjs|remix|react-router|tanstack-router)$/.test(spec)) ||
      names.some((name) => name === 'SsgoiLayoutBoundary' || name === 'SsgoiRouteBoundary' || name === 'SsgoiTransition'),
    )
    assert.deepEqual(keyed.map(({ file }) => file), [])
  })
})
