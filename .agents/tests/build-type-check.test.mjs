import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('the build type checks in its own step before next build and stops on errors', async () => {
  const { scripts } = JSON.parse(await read('package.json'))
  // Next's in-build check is off only because the build script runs the project's check first.
  assert.match(await read('next.config.ts'), /typescript:\s*\{\s*ignoreBuildErrors:\s*true\s*\}/)
  assert.equal(scripts.typecheck, 'node scripts/typecheck.mjs')
  assert.match(scripts.build, /&& pnpm run typecheck && next build$/)
  assert.match(scripts.validate, /typecheck/)
  const checker = await read('scripts/typecheck.mjs')
  assert.match(checker, /"typegen"/)
  assert.match(checker, /"--noEmit"/)
  assert.match(checker, /TYPECHECK_MAX_OLD_SPACE_SIZE/)
  // A failed step exits non-zero, which stops `&& next build`.
  assert.match(checker, /process\.exit\(result\.status \?\? 1\)/)
  assert.match(await read('AGENTS.md'), /run `pnpm run validate`[\s\S]*stops on type errors/)
})
