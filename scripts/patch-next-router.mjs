// Next.js #98623: moving cached Activity siblings resets embedded frames and media.
// Apply the 16.4.3 fix after fetching, when the project source is available.
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const manifest = realpathSync(require.resolve('next/package.json'))
const projectModules = fileURLToPath(new URL('../node_modules/', import.meta.url))
const localPath = relative(projectModules, manifest)
if (isAbsolute(localPath) || localPath === '..' || localPath.startsWith(`..${sep}`)) {
  throw new Error(`Next.js resolves outside this project's node_modules: ${manifest}. Use a local pnpm virtual store in node_modules/.pnpm before applying the layout-router fix.`)
}
const { version } = require(manifest)
if (version !== '16.4.3') {
  throw new Error(`Expected next@16.4.3, found ${version}. Review the layout-router fix for this version.`)
}

// Blob IDs from the original pnpm patch. Check both variants before writing either.
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

const changes = []
for (const [relativePath, original, patched] of targets) {
  const path = join(dirname(manifest), relativePath)
  const source = readFileSync(path, 'utf8')
  const current = blobId(source)
  if (current === patched) continue
  const updated = source.replace(anchor, replacement)
  if (current !== original || blobId(updated) !== patched) {
    throw new Error(`Cannot patch next@${version}/${relativePath}: found blob ${current}, expected ${original} or ${patched}. Reinstall from the lockfile and review upstream changes.`)
  }
  changes.push({ path, updated })
}
for (const { path, updated } of changes) {
  // pnpm may hardlink files from its store. Replace the project's directory entry.
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, updated, { flag: 'wx', mode: statSync(path).mode })
    renameSync(temporary, path)
  } finally {
    rmSync(temporary, { force: true })
  }
}
