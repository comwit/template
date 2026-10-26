import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const adapterDir = dirname(require.resolve('@brrrd/adapter'))
const { createNextBuildModel } = await import(pathToFileURL(join(adapterDir, 'model.js')).href)
const { compileRouteTable } = await import(pathToFileURL(join(adapterDir, 'routing-compiler.js')).href)

function model({ appPages = [], prerenders = [], staticFiles = [] } = {}) {
  return createNextBuildModel({
    projectDir: '/tmp/template-ppr-fixture',
    repoRoot: '/tmp/template-ppr-fixture',
    distDir: '/tmp/template-ppr-fixture/.next',
    config: {}, nextVersion: '16.4.3', buildId: 'fixture',
    outputs: { pages: [], pagesApi: [], appRoutes: [], appPages, prerenders, staticFiles },
  })
}

const page = pathname => ({ id: pathname, pathname, runtime: 'nodejs' })
const resume = { headers: { 'next-resume': '1' } }

test('upstream renders complete PPR documents while retaining static documents and assets', () => {
  const routes = compileRouteTable(model({
    appPages: [page('/')],
    prerenders: [
      { id: '/', pathname: '/', parentOutputId: '/', pprChain: resume, fallback: { postponedState: 'html-state' } },
      { id: '/terms', pathname: '/terms', fallback: { filePath: '/tmp/terms.html' } },
    ],
    staticFiles: [{ id: '/favicon.ico', pathname: '/favicon.ico', filePath: '/tmp/favicon.ico' }],
  }))
  assert.equal(routes.some(route => route.type === 'prerender' && route.ppr), false)
  const document = routes.find(route => route.type === 'page' && new RegExp(route.pattern).test('/'))
  assert.ok(document)
  assert.equal(document.pprResume, undefined)
  assert.ok(routes.some(route => route.type === 'prerender' && new RegExp(route.pattern).test('/terms')))
  assert.ok(routes.some(route => route.type === 'static' && route.file === '/favicon.ico'))
})

test('upstream preserves dynamic RSC resume metadata without serving a partial HTML shell', () => {
  const routes = compileRouteTable(model({
    appPages: [page('/posts/[id]'), page('/posts/[id].rsc')],
    prerenders: [
      { id: '/posts/hello', pathname: '/posts/hello', pprChain: resume },
      { id: '/posts/[id]', pathname: '/posts/[id]', pprChain: resume, fallback: { postponedState: 'html-state' } },
      { id: '/posts/[id].rsc', pathname: '/posts/[id].rsc', pprChain: resume, fallback: { postponedState: 'rsc-state' } },
    ],
  }))
  assert.equal(routes.some(route => route.type === 'prerender'), false)
  const document = routes.find(route => route.type === 'page' && new RegExp(route.pattern).test('/posts/hello'))
  assert.ok(document)
  assert.equal(document.pprResume, undefined)
  const rsc = routes.find(route => route.type === 'page' && route.pprResume && new RegExp(route.pattern).test('/posts/hello.rsc'))
  assert.equal(rsc?.pprResume.postponedState, 'rsc-state')
  assert.deepEqual(rsc.pprResume.headers, resume.headers)
})

test('upstream refuses to drop a PPR shell without a matching runtime page', () => {
  assert.throws(() => compileRouteTable(model({
    prerenders: [{ id: '/orphan', pathname: '/orphan', pprChain: resume }],
  })), /PPR document .* has no matching runtime page/)
})
