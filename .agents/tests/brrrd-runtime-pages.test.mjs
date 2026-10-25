import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { prepareRuntimePages } from '../../scripts/brrrd-runtime-pages.mjs'
import { withCompleteDocuments } from '../../scripts/brrrd-adapter.mjs'

function fixture() {
  return { schemaVersion: 1, buildId: 'build', routes: [
    { id: 'prerender-projects', type: 'prerender', pattern: '^/projects$', file: '/projects/index', ppr: true },
    { id: 'projects', type: 'page', pattern: '^/projects(?:/)?$', pprResume: { postponedState: 'private-state' } },
    { id: 'projects_rsc', type: 'page', pattern: '^/projects\\.rsc$', pprResume: { postponedState: 'rsc-state' } },
    { id: 'asset', type: 'static', file: '/_next/static/chunk.js' },
    { id: 'static', type: 'prerender', pattern: '^/terms$', file: '/terms/index', ppr: false },
    { id: 'rsc-shell', type: 'prerender', file: '/projects.rsc', ppr: true },
  ] }
}

test('PPR HTML selects full runtime rendering; RSC, assets and static documents are preserved', () => {
  const original = fixture()
  const copy = structuredClone(original)
  const prepared = prepareRuntimePages(original)
  assert.deepEqual(prepared.routes, [
    { id: 'projects', type: 'page', pattern: '^/projects(?:/)?$' },
    ...original.routes.slice(2),
  ])
  assert.equal(prepared.buildId, 'build')
  assert.deepEqual(original, copy)
  assert.deepEqual(prepareRuntimePages(prepared), prepared)
})

test('root and generated dynamic pages retain a matching runtime handler', () => {
  const result = prepareRuntimePages({ routes: [
    { id: 'root-shell', type: 'prerender', pattern: '^/$', file: '/index', ppr: true },
    { id: 'root', type: 'page', pattern: '^/$', pprResume: {} },
    { id: 'article-shell', type: 'prerender', pattern: '^/blog/hello$', file: '/blog/hello', ppr: true },
    { id: 'article', type: 'page', pattern: '^/blog/([^/]+)(?:/)?$', pprResume: {} },
    { id: 'renamed-rsc-handler', type: 'page', pattern: '^/blog/([^/]+)\\.rsc$', pprResume: { postponedState: 'rsc' } },
  ] })
  assert.deepEqual(result.routes.map(route => [route.id, route.pprResume]), [['root', undefined], ['article', undefined], ['renamed-rsc-handler', { postponedState: 'rsc' }]])
})

test('an unsupported or missing runtime route stops the build instead of dropping its only response', () => {
  assert.throws(() => prepareRuntimePages({}), /missing its route table/)
  const manifest = fixture(); manifest.routes.splice(1, 1)
  assert.throws(() => prepareRuntimePages(manifest), /no matching runtime page/)
})

test('the adapter hook repairs the emitted manifest after upstream completes, including direct next build', async (t) => {
  const projectDir = await mkdtemp(join(tmpdir(), 'comwit adapter '))
  t.after(() => rm(projectDir, { recursive: true, force: true }))
  const file = join(projectDir, 'dist', 'brrrd', 'manifest.json')
  const modifyConfig = config => ({ ...config, example: true })
  const adapter = withCompleteDocuments({ name: 'upstream', modifyConfig, async onBuildComplete(context) {
    assert.equal(context.projectDir, projectDir)
    await mkdir(join(projectDir, 'dist', 'brrrd'), { recursive: true })
    await writeFile(file, JSON.stringify(fixture()))
  } })
  assert.equal(adapter.modifyConfig, modifyConfig)
  assert.deepEqual(adapter.modifyConfig({}), { example: true })
  await adapter.onBuildComplete({ projectDir })
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), prepareRuntimePages(fixture()))
  const failing = withCompleteDocuments({ async onBuildComplete() { throw new Error('upstream build failed') } })
  await assert.rejects(failing.onBuildComplete({ projectDir }), /upstream build failed/)
})
