#!/usr/bin/env node
'use strict'

/**
 * Pre-commit runner that mirrors the simple-git-hooks config with strict lint:
 *   pnpm run format && pnpm run lint:fix && pnpm exec eslint . --max-warnings=0 && pnpm run type-check
 *
 * If a check fails, it will invoke the Codex CLI once with the captured errors
 * to attempt an automatic fix, then re-run the checks. Disable with
 * CODEX_AUTO_FIX=0 when needed.
 */

const { spawnSync } = require('child_process')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')

const commands = [
  { label: 'format', cmd: 'pnpm run format' },
  { label: 'lint:fix', cmd: 'pnpm run lint:fix' },
  // Treat warnings as failures so Codex runs when lint can't fully fix
  { label: 'lint', cmd: 'pnpm exec eslint . --max-warnings=0' },
  { label: 'type-check', cmd: 'pnpm run type-check' },
  { label: 'unit-test', cmd: 'pnpm test:unit' },
]

const runCommand = (command) => {
  console.log(`[pre-commit] Running: ${command}`)
  const result = spawnSync(command, {
    shell: true,
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  })

  if (result.stdout) {
    process.stdout.write(result.stdout)
  }
  if (result.stderr) {
    process.stderr.write(result.stderr)
  }

  return result
}

const shouldSkip = process.env.SKIP_SIMPLE_GIT_HOOKS === '1'
if (shouldSkip) {
  console.log(
    '[pre-commit] SKIP_SIMPLE_GIT_HOOKS=1 detected. Skipping hook tasks.'
  )
  process.exit(0)
}

const results = []
let failure

for (const command of commands) {
  const result = runCommand(command.cmd)
  results.push({ ...command, result })
  if (result.status !== 0) {
    failure = { ...command, result }
    break
  }
}

if (!failure) {
  process.exit(0)
}

const failureSummary = [
  `Command: ${failure.cmd}`,
  failure.result.stdout ? `stdout:\n${failure.result.stdout}` : null,
  failure.result.stderr ? `stderr:\n${failure.result.stderr}` : null,
]
  .filter(Boolean)
  .join('\n\n')

const autoFixEnv = process.env.CODEX_AUTO_FIX
const shouldAutoFix =
  autoFixEnv === undefined ||
  (autoFixEnv !== '0' && autoFixEnv.toLowerCase() !== 'false')

const resolveCodexBin = () => {
  if (process.env.CODEX_BIN) {
    return process.env.CODEX_BIN
  }

  const found = spawnSync('which codex', {
    shell: true,
    cwd: repoRoot,
    encoding: 'utf8',
  })

  if (found.status === 0 && found.stdout.trim()) {
    return found.stdout.trim()
  }

  return null
}

if (!shouldAutoFix) {
  console.error(
    '\n[pre-commit] Checks failed. Set CODEX_AUTO_FIX back to 1/true (default) to let Codex attempt an auto-fix.'
  )
  process.exit(failure.result.status ?? 1)
}

const codexBin = resolveCodexBin()
if (!codexBin) {
  console.error(
    '\n[pre-commit] Codex CLI is not available. Install/login to Codex, set CODEX_BIN to its path, or set CODEX_AUTO_FIX=0 to skip auto-fix.'
  )
  process.exit(failure.result.status ?? 1)
}

spawnSync(codexBin, ['--version'], {
  cwd: repoRoot,
  encoding: 'utf8',
})

console.warn('\n[pre-commit] Checks failed; invoking Codex for auto-fix...')

const prompt = [
  'You are helping with an automated pre-commit hook for the homematch-v2 repo.',
  'Goal: fix only the lint/format/type-check failures so that these commands succeed:',
  'pnpm run format && pnpm run lint:fix && pnpm run type-check',
  'Keep behavior unchanged; follow existing code style (Prettier, single quotes, no semicolons).',
  'Do not run git commit or push. Make minimal edits needed to fix the errors.',
  'Failure output:',
  failureSummary,
].join('\n\n')

const codexResult = spawnSync(
  codexBin,
  [
    '--ask-for-approval',
    'never',
    '--sandbox',
    'workspace-write',
    'exec',
    '--cd',
    repoRoot,
    '-',
  ],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
    input: prompt,
  }
)

if (codexResult.status !== 0) {
  console.error(
    '\n[pre-commit] Codex auto-fix failed or was interrupted. Aborting commit.'
  )
  process.exit(failure.result.status ?? 1)
}

console.log('\n[pre-commit] Re-running checks after Codex auto-fix...')

for (const command of commands) {
  const result = runCommand(command.cmd)
  if (result.status !== 0) {
    console.error(
      `\n[pre-commit] Still failing after Codex auto-fix. Command: ${command.cmd}`
    )
    process.exit(result.status ?? 1)
  }
}

process.exit(0)
