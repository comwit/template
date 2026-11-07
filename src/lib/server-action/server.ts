import 'server-only'

import { cache } from 'react'
import { stringifyServerFnWire } from './protocol'

// oxlint-disable-next-line typescript/no-explicit-any
type ActionFn = (...args: any[]) => Promise<unknown>

/**
 * Request-scoped memo of in-flight calls, one per Server Component render request.
 * React.cache sets the scope, so calling the same function with equal arguments in one
 * render runs it once and every caller shares the same promise (and resolved object).
 * Outside a render (Route Handlers, the SSR bridge, tests) React has no cache dispatcher,
 * cache() passes straight through, every call gets a fresh Map and nothing is memoized.
 */
const requestMemo = cache(() => new Map<ActionFn, Map<string, Promise<unknown>>>())

/**
 * Arguments must already pass the browser path's wire codec, so the wire string is a
 * value-equality key: unlike React.cache's identity keys, inline object calls such as
 * `findAll({}, { page: 1 })` dedupe too.
 */
function memoize<F extends ActionFn>(action: F): F {
  return ((...args: unknown[]) => {
    const memo = requestMemo()
    let calls = memo.get(action)
    if (!calls) {
      calls = new Map()
      memo.set(action, calls)
    }
    const key = stringifyServerFnWire(args)
    let pending = calls.get(key)
    if (!pending) {
      pending = action(...args)
      calls.set(key, pending)
    }
    return pending
  }) as F
}

/**
 * Wrap the resolveActions object of a server API index variant (`?comwit-server-fn=server`).
 * The index loader inserts this call, so callers never wrap API calls in cache() themselves.
 */
export function memoizeServerActions<T extends Record<string, ActionFn>>(
  actions: T,
): T {
  const memoized: Record<string, ActionFn> = {}
  for (const [name, action] of Object.entries(actions)) {
    memoized[name] = memoize(action)
  }
  return memoized as T
}
