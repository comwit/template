import {
  SERVER_FN_HEADER,
  SERVER_FN_SSR_DISPATCH,
  parseServerFnWire,
  stringifyServerFnWire,
  type ServerFnResponse,
  type ServerFnSsrDispatch,
} from './protocol'

/** During Client Component SSR, return the request-scoped dispatcher registered by the RSC graph. */
function ssrDispatch(): ServerFnSsrDispatch | undefined {
  if (typeof window !== 'undefined') return undefined
  return (globalThis as Record<symbol, ServerFnSsrDispatch | undefined>)[
    SERVER_FN_SSR_DISPATCH
  ]
}

/**
 * POST to the current page URL, like a Next Server Action, carrying the opaque function ID
 * in a header. src/proxy.ts rewrites the request to the internal Route Handler, so neither
 * the handler path nor the ID appears in the URL.
 */
async function postServerFn(id: string, args: unknown[]): Promise<string> {
  const response = await fetch(window.location.pathname, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      [SERVER_FN_HEADER]: id,
    },
    body: stringifyServerFnWire({ args }),
  })
  return response.text()
}

/**
 * Create a callable compiled API method. Browsers use same-origin POST;
 * Client Component SSR (.suspend() queryFn) uses the same request-scoped dispatcher without HTTP.
 * Both parse the same wire string, so SSR and browser results have identical shapes.
 */
export function createServerFnClient(id: string) {
  return async (...args: unknown[]): Promise<unknown> => {
    const dispatch = ssrDispatch()
    const text = dispatch
      ? await dispatch(id, args)
      : await postServerFn(id, args)

    let payload: ServerFnResponse
    try {
      payload = parseServerFnWire<ServerFnResponse>(text)
    } catch {
      throw new Error('서버 응답을 처리하지 못했어요')
    }

    if (!payload.ok) throw new Error(payload.error.message)
    return payload.data
  }
}
