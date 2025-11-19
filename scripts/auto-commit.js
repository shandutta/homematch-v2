#!/usr/bin/env node
'use strict'

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
    console.error('Failed to check git status:', error.message)
    process.exit(1)
  }
}

const getCommitContext = () => {
  try {
    const shortStatus = run('git status --short')
    const diffStat = run('git diff --stat')
    const diff = run('git diff')
    return { shortStatus, diffStat, diff }
  } catch (error) {
    console.error('Failed to collect git diff context:', error.message)
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
      'OPENROUTER_API_KEY is not set. Cannot request commit message.'
    )
    process.exit(1)
  }

  const model = process.env.AUTO_COMMIT_MODEL || 'openrouter/gpt-oss-20b'
  const payload = {
    model,
    max_tokens: 80,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'You generate concise Conventional Commit titles (max 65 characters).',
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
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

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
      throw new Error('OpenRouter returned an empty commit message.')
    }

    return message.replace(/^"|"$/g, '')
  } catch (error) {
    console.error('Failed to fetch commit message from OpenRouter:', error.message)
    process.exit(1)
  }
}

const gitCommit = (message) => {
  try {
    run('git add -A')
  } catch (error) {
    console.error('Failed to stage changes:', error.message)
    process.exit(1)
  }

  const commit = spawnSync('git', ['commit', '-m', message], {
    stdio: 'inherit',
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
    console.error('git push failed.')
    process.exit(push.status ?? 1)
  }
}

const main = async () => {
  if (!hasChanges()) {
    console.log('No pending changes. Nothing to commit.')
    return
  }

  const context = getCommitContext()
  const commitMessage = await callOpenRouter(context)

  console.log('AI-generated commit message:', commitMessage)
  gitCommit(commitMessage)
  gitPush()
}

main().catch((error) => {
  console.error('Unexpected auto-commit error:', error)
  process.exit(1)
})
