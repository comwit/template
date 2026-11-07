import { cache } from 'react'
import {
  serverFnManifest,
  type ServerFnModuleLoader,
} from './manifest'
import { stringifyServerFnWire } from './protocol'

type ServerFnDefinitions = Readonly<Record<string, string>>

/**
 * Request-scoped memo of in-flight Server Function calls, keyed by function ID and
 * wire-encoded arguments. React.cache gives one Map per Server Component render request,
 * so the same call with equal arguments in one render runs once and every caller shares
 * the same promise (and resolved object). Outside a render (Route Handlers, the SSR
 * bridge, scripts) React has no cache dispatcher, cache() calls straight through, and
 * every call gets a fresh Map — nothing is memoized there.
 */
const requestMemo = cache(() => new Map<string, Promise<unknown>>())

/**
 * Arguments must already be wire-serializable because the browser path sends them
 * through the same codec, so the wire string is a value-equality key: inline object
 * literals such as `findAll({}, { page: 1 })` dedupe, unlike React.cache's identity keys.
 */
function memoKey(id: string, args: unknown[]): string {
  return `${id}:${stringifyServerFnWire(args)}`
}

/**
 * Create the server/RSC/SSR API facade. Import manifest-allowed actions on demand
 * and invoke them directly without sending HTTP requests to our own Route Handler.
 * Every method is deduped per Server Component render request (see requestMemo).
 */
export function resolveCompiledActions(
  definitions: ServerFnDefinitions,
  manifest: Readonly<Record<string, ServerFnModuleLoader>> = serverFnManifest,
): Record<string, (...args: unknown[]) => Promise<unknown>> {
  const actions: Record<string, (...args: unknown[]) => Promise<unknown>> = {}

  for (const [name, id] of Object.entries(definitions)) {
    const run = async (args: unknown[]) => {
      const loadAction = manifest[id]
      if (!loadAction) throw new Error(`Unknown Server Function: ${id}`)
      const action = await loadAction()
      return action(...args)
    }

    actions[name] = (...args: unknown[]) => {
      const memo = requestMemo()
      const key = memoKey(id, args)
      let pending = memo.get(key)
      if (!pending) {
        pending = run(args)
        memo.set(key, pending)
      }
      return pending
    }
  }

  return actions
}
