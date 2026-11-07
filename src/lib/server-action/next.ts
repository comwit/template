import type { NextConfig } from 'next'
import { fileURLToPath } from 'node:url'

const indexLoader = fileURLToPath(
  new URL('./build/index-loader.cjs', import.meta.url),
)
const manifestLoader = fileURLToPath(
  new URL('./build/manifest-loader.cjs', import.meta.url),
)
const serverOnlyLoader = fileURLToPath(
  new URL('./build/server-only-action-loader.cjs', import.meta.url),
)

/**
 * Connect Server Function client/server transforms and virtual manifest generation to Next config.
 * Callers do not manage loader paths or Turbopack conditions directly.
 */
export function withServerFn(config: NextConfig): NextConfig {
  const projectRoot = process.cwd()
  const wildcardRule = config.turbopack?.rules?.['*']
  const existingWildcardRules = wildcardRule
    ? Array.isArray(wildcardRule)
      ? wildcardRule
      : [wildcardRule]
    : []

  return {
    ...config,
    turbopack: {
      ...config.turbopack,
      rules: {
        ...config.turbopack?.rules,
        // Receive candidates with '*' and select exact files using project-relative path conditions.
        // This avoids Turbopack rule-key glob semantics changing depending on whether a slash is present.
        '*': [
          ...existingWildcardRules,
          {
            // Replace source 'use server' with a server-only import in output. The client index
            // variant drops action imports; this guard fails the build if one leaks there anyway.
            condition: {
              path: /src\/services\/[^/]+\/api\/[^/]+\/actions\/.*\.ts$/,
            },
            loaders: [serverOnlyLoader],
            as: '*.js',
          },
          // One API index, three variants: the plain import re-exports the conditional
          // `#comwit-server-fn-api/*` package import, which selects `?comwit-server-fn=server`
          // under `react-server` and `?comwit-server-fn=client` otherwise (browser and SSR).
          ...(['facade', 'server', 'client'] as const).map((runtime) => ({
            condition: {
              all: [
                {
                  path: /src\/services\/[^/]+\/api\/[^/]+\/index\.ts$/,
                },
                { content: /\bresolveActions\b/ },
                runtime === 'facade'
                  ? { not: { query: /[?&]comwit-server-fn=/ } }
                  : { query: `?comwit-server-fn=${runtime}` },
              ],
            },
            loaders: [
              {
                loader: indexLoader,
                options: { projectRoot, runtime },
              },
            ],
            as: '*.js',
          })),
          {
            condition: {
              all: [
                { not: 'browser' },
                { path: /src\/lib\/server-action\/manifest\.ts$/ },
              ],
            },
            loaders: [
              {
                loader: manifestLoader,
                options: { projectRoot },
              },
            ],
            as: '*.js',
          },
        ],
      },
    },
  }
}
