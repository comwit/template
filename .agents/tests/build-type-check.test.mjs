import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('the remote build skips type checking only because validate runs tsc', async () => {
  const { scripts } = JSON.parse(await read('package.json'))
  assert.match(await read('next.config.ts'), /typescript:\s*\{\s*ignoreBuildErrors:\s*true\s*\}/)
  assert.match(scripts.typecheck, /^tsc --noEmit\b/)
  assert.match(scripts.validate, /typecheck/)
  assert.match(await read('AGENTS.md'), /run `pnpm run validate`[\s\S]*Type checking runs in validate/)
})
