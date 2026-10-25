import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const isRsc = (route) => route.id?.endsWith('_rsc') || /\\\.rsc(?:\$|\b)/.test(route.pattern ?? '') || route.file?.endsWith('.rsc')

/** The current brrrd deployment router cannot concatenate a PPR prefix and its resumed HTML. */
export function prepareRuntimePages(manifest) {
  if (!Array.isArray(manifest.routes)) throw new Error('brrrd manifest is missing its route table')
  const pages = manifest.routes.filter(route => route.type === 'page' && !isRsc(route))
  const shells = manifest.routes.filter(route => route.type === 'prerender' && route.ppr && !isRsc(route))
  for (const shell of shells) {
    const candidates = [shell.file, shell.file?.replace(/\/index$/, '') || '/'].filter(Boolean)
    const pathname = candidates.find(candidate => new RegExp(shell.pattern).test(candidate))
    if (!pathname || !pages.some(page => new RegExp(page.pattern).test(pathname))) {
      throw new Error(`PPR document ${shell.id} has no matching runtime page; refusing an incomplete deployment`)
    }
  }
  const removed = new Set(shells)
  return {
    ...manifest,
    routes: manifest.routes.filter(route => !removed.has(route)).map(route => {
      if (route.type !== 'page' || isRsc(route) || !route.pprResume) return route
      const { pprResume: _resume, ...page } = route
      return page
    }),
  }
}

export async function prepareRuntimePageManifest(projectDir) {
  const file = join(projectDir, 'dist', 'brrrd', 'manifest.json')
  const original = JSON.parse(await readFile(file, 'utf8'))
  const prepared = prepareRuntimePages(original)
  const temporary = `${file}.tmp`
  await writeFile(temporary, `${JSON.stringify(prepared, null, 2)}\n`)
  await rename(temporary, file)
  return original.routes.length - prepared.routes.length
}
