#!/usr/bin/env node
const { createRequire } = require('module')
const { spawn } = require('child_process')

const requireFromNext = createRequire(require.resolve('next/package.json'))
const { loadEnvConfig } = requireFromNext('@next/env')

loadEnvConfig(process.cwd(), true)

const child = spawn('next dev --hostname 0.0.0.0 --turbopack', {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    child.kill(sig)
  })
}
