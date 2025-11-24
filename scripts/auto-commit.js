#!/usr/bin/env node
'use strict'

// Load local env so OPENROUTER_API_KEY can live in .env/.env.local
const path = require('path')
const dotenv = require('dotenv')
dotenv.config()
dotenv.config({ path: '.env.local', override: true })

/**
 * Simple automation helper that:
 * 1. Checks for pending git changes.
 * 2. Asks OpenRouter for a short Conventional Commit summary.
 * 3. Commits (and optionally pushes) using that AI-generated message.
 *
 * Required env vars:
 *   OPENROUTER_API_KEY  - API key from https://openrouter.ai
 *
 * Optional env vars:
 *   AUTO_COMMIT_MODEL   - Override OpenRouter model (default: openrouter/gpt-oss-20b)
 *   AUTO_COMMIT_PUSH    - Set to "false" to skip git push
 *   OPENROUTER_REFERER  - Referer header recommended by OpenRouter
 *   OPENROUTER_TITLE    - Title header recommended by OpenRouter
 */

const { execSync, spawnSync } = require('child_process')
const repoRoot = path.resolve(__dirname, '..')

const timestamp = () =>
  new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
const log = (message) => console.log(`[${timestamp()}] ${message}`)

const CHECK_COMMANDS = [
  { label: 'format', cmd: 'pnpm run format' },
  { label: 'lint:fix', cmd: 'pnpm run lint:fix' },
  { label: 'lint', cmd: 'pnpm exec eslint . --max-warnings=0' },
  { label: 'type-check', cmd: 'pnpm run type-check' },
]

const run = (command, options = {}) => {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  }).trim()
}

const hasChanges = () => {
  try {
    const result = run('git status --porcelain')
    return result.length > 0
  } catch (error) {
    console.error(`[${timestamp()}] Failed to check git status:`, error.message)
    process.exit(1)
  }
}

const getCommitContext = () => {
  try {
    const shortStatus = run('git status --short')
    const diffStat = run('git diff --stat HEAD')
    const diff = run('git diff HEAD')
    return { shortStatus, diffStat, diff }
  } catch (error) {
    console.error(
      `[${timestamp()}] Failed to collect git diff context:`,
      error.message
    )
    process.exit(1)
  }
}

const ensureFetch = async () => {
  if (typeof fetch === 'undefined') {
    const nodeFetch = await import('node-fetch')
    global.fetch = nodeFetch.default
  }
}

const callOpenRouter = async ({ shortStatus, diffStat, diff }) => {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.error(
      `[${timestamp()}] OPENROUTER_API_KEY is not set. Cannot request commit message.`
    )
    process.exit(1)
  }

  const model =
    process.env.AUTO_COMMIT_MODEL || 'google/gemini-2.0-flash-exp:free'
  const payload = {
    model,
    max_tokens: 80,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'You generate concise, **lowercase** Conventional Commit titles (max 65 characters).',
      },
      {
        role: 'user',
        content: [
          'Summarize the code changes below as a short Conventional Commit title.',
          '',
          'Git status:',
          shortStatus,
          '',
          'Diff summary:',
          diffStat,
          '',
          'Full diff:',
          diff,
        ].join('\n'),
      },
    ],
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  if (process.env.OPENROUTER_REFERER) {
    headers['HTTP-Referer'] = process.env.OPENROUTER_REFERER
  }

  if (process.env.OPENROUTER_TITLE) {
    headers['X-Title'] = process.env.OPENROUTER_TITLE
  }

  try {
    await ensureFetch()
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `OpenRouter request failed (${response.status}): ${body || 'No body'}`
      )
    }

    const data = await response.json()
    const message =
      data?.choices?.[0]?.message?.content?.split('\n')[0]?.trim() ?? ''

    if (!message) {
      console.error(
        `[${timestamp()}] OpenRouter response data:`,
        JSON.stringify(data, null, 2)
      )
      throw new Error('OpenRouter returned an empty commit message.')
    }

    return message.replace(/^"|"$/g, '')
  } catch (error) {
    console.error(
      `[${timestamp()}] Failed to fetch commit message from OpenRouter:`,
      error.message
    )
    process.exit(1)
  }
}

const gitCommit = (message) => {
  try {
    run('git add -A')
  } catch (error) {
    console.error(`[${timestamp()}] Failed to stage changes:`, error.message)
    process.exit(1)
  }

  const commitEnv = { ...process.env }
  // Skip pre-commit hook since we already ran the checks in runChecksWithCodex()
  commitEnv.SKIP_SIMPLE_GIT_HOOKS = '1'

  const commit = spawnSync('git', ['commit', '-m', message], {
    stdio: 'inherit',
    env: commitEnv,
  })

  if (commit.status !== 0) {
    process.exit(commit.status ?? 1)
  }
}

const gitPush = () => {
  if (process.env.AUTO_COMMIT_PUSH === 'false') {
    return
  }

  const push = spawnSync('git', ['push'], { stdio: 'inherit' })
  if (push.status !== 0) {
    console.error(`[${timestamp()}] git push failed.`)
    process.exit(push.status ?? 1)
  }
}

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

const runCheck = (command) => {
  log(`Running check: ${command}`)
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

const runChecksWithCodex = () => {
  let failure

  for (const command of CHECK_COMMANDS) {
    const result = runCheck(command.cmd)
    if (result.status !== 0) {
      failure = { ...command, result }
      break
    }
  }

  if (!failure) {
    return
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

  if (!shouldAutoFix) {
    console.error(
      `[${timestamp()}] Checks failed. Set CODEX_AUTO_FIX back to 1/true (default) to let Codex attempt an auto-fix.`
    )
    process.exit(failure.result.status ?? 1)
  }

  const codexBin = resolveCodexBin()
  if (!codexBin) {
    console.error(
      `[${timestamp()}] Checks failed and Codex CLI is not available. Install/login to Codex, set CODEX_BIN, or set CODEX_AUTO_FIX=0 to skip auto-fix.`
    )
    process.exit(failure.result.status ?? 1)
  }

  spawnSync(codexBin, ['--version'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  console.warn(`[${timestamp()}] Checks failed; invoking Codex for auto-fix...`)

  const prompt = [
    'You are helping with an automated auto-commit task for the homematch-v2 repo.',
    'Goal: fix only the lint/format/type-check failures so that these commands succeed:',
    CHECK_COMMANDS.map((c) => c.cmd).join(' && '),
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
      `[${timestamp()}] Codex auto-fix failed or was interrupted. Aborting.`
    )
    process.exit(failure.result.status ?? 1)
  }

  log('Re-running checks after Codex auto-fix...')

  for (const command of CHECK_COMMANDS) {
    const result = runCheck(command.cmd)
    if (result.status !== 0) {
      console.error(
        `[${timestamp()}] Still failing after Codex auto-fix. Command: ${command.cmd}`
      )
      process.exit(result.status ?? 1)
    }
  }
}

const main = async () => {
  log('Starting auto-commit run')

  if (!hasChanges()) {
    log('No pending changes. Nothing to commit.')
    return
  }

  log('Running pre-commit checks (with Codex auto-fix if needed)...')
  runChecksWithCodex()

  const context = getCommitContext()
  log('Generating commit message via OpenRouter...')
  const commitMessage = await callOpenRouter(context)

  log(`AI-generated commit message: ${commitMessage}`)
  gitCommit(commitMessage)
  gitPush()

  log('Auto-commit completed and pushed successfully')
}

main().catch((error) => {
  console.error(`[${timestamp()}] Unexpected auto-commit error:`, error)
  process.exit(1)
})
