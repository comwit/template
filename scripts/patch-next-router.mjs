// Next.js #98623: moving cached Activity siblings resets embedded frames, media
// and inner scroll positions. Apply the 16.4.3 fix inside this project's
// node_modules after dependencies are installed.
//
// This script never fails an install, dev or build. When it cannot apply the fix
// it prints one warning and exits 0; the app then runs on stock Next.js.
//
// Remove this script and its three calls in package.json (postinstall, dev,
// build) once next is upgraded to a release that fixes vercel/next.js#98623.
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSION = '16.4.3'
// Blob IDs from the original pnpm patch: [file, stock, patched].
const targets = [
  ['dist/client/components/layout-router.js', '316197c6b1e4f8fc97c410fce920c653a70ba2cb', '9e75a5f3bcdcd0f0d16c6da5593142f59913e1d1'],
  ['dist/esm/client/components/layout-router.js', '8fa63330cb8c8910a1323693fdabea0a9073377c', '325d9e408f2ddfaaa456a344cbc681ddf22e6762'],
]
const anchor = '    }while (bfcacheEntry !== null);\n    return children;'
const replacement = `    }while (bfcacheEntry !== null);
    // Keep sibling order stable across navigations. The bfcache list is ordered
    // most-recently-active (that order drives eviction), but rendering in that
    // order makes React move kept-alive <Activity> subtrees with
    // insertBefore/appendChild, which reloads iframes, restarts media and
    // resets inner scroll positions (vercel/next.js#98623). Sorting by key keeps
    // every pair of siblings in the same relative order, so React only inserts
    // new entries and removes evicted ones; it never moves an existing one.
    if (children.length > 1) {
        children.sort((a, b)=>a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    }
    return children;`

function blobId(source) {
  return createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex')
}

function skip(reason) {
  console.warn(`[patch-next-router] Skipped the Next.js layout-router fix (vercel/next.js#98623): ${reason}`)
}

function plan() {
  const require = createRequire(import.meta.url)
  let manifest
  try {
    manifest = realpathSync(require.resolve('next/package.json'))
  } catch {
    return skip('next is not installed in node_modules.')
  }
  // Only touch files inside this project. A shared location (pnpm global virtual
  // store, another workspace) would change Next.js for other projects.
  const projectModules = fileURLToPath(new URL('../node_modules/', import.meta.url))
  const localPath = relative(realpathSync(projectModules), manifest)
  if (isAbsolute(localPath) || localPath === '..' || localPath.startsWith(`..${sep}`)) {
    return skip(`next resolves outside this project's node_modules (${manifest}).`)
  }
  const { version } = require(manifest)
  if (version !== VERSION) {
    return skip(`it targets next@${VERSION} and found ${version}. Check whether the installed release already includes the fix, then remove this script.`)
  }
  // Check every file before writing any of them.
  const changes = []
  for (const [relativePath, original, patched] of targets) {
    const path = join(dirname(manifest), relativePath)
    const source = readFileSync(path, 'utf8')
    const current = blobId(source)
    if (current === patched) continue
    const updated = source.replace(anchor, replacement)
    if (current !== original || blobId(updated) !== patched) {
      return skip(`next@${version}/${relativePath} is not the published file (blob ${current}). Reinstall dependencies from the lockfile.`)
    }
    changes.push({ path, updated })
  }
  return changes
}

function apply(changes) {
  for (const { path, updated } of changes) {
    // pnpm may hardlink files from its store. Write a new file and rename it over
    // the project's entry so the store copy keeps the published content.
    const temporary = `${path}.${randomUUID()}.tmp`
    try {
      writeFileSync(temporary, updated, { flag: 'wx', mode: statSync(path).mode })
      renameSync(temporary, path)
    } finally {
      rmSync(temporary, { force: true })
    }
  }
}

try {
  const changes = plan()
  if (changes) apply(changes)
} catch (error) {
  skip(error instanceof Error ? error.message : String(error))
}
