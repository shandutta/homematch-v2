#!/usr/bin/env node

/**
 * Zombie process watcher
 * - Logs STAT=Z processes with PID/PPID/age/command
 * - Attempts container-aware attribution using /proc/<pid>/cgroup
 * - Optionally restarts matching containers when zombies stack up
 *
 * ENV:
 *   ZOMBIE_RESTART_THRESHOLD   zombies required before restart (default: 3)
 *   ZOMBIE_RESTART_MIN_AGE     minimum age in seconds to trigger restart (default: 1800)
 *   ZOMBIE_RESTART_CONTAINER_REGEX regex to allow restarts (default: "supabase")
 *   ZOMBIE_LOG_PATH            override log file (default: .logs/zombie-watch.log)
 *   ZOMBIE_DRY_RUN             if set to "1", only log restart intent
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const LOG_DIR = path.join(__dirname, '..', '.logs')
const LOG_FILE =
  process.env.ZOMBIE_LOG_PATH || path.join(LOG_DIR, 'zombie-watch.log')
const RESTART_THRESHOLD = Number.parseInt(
  process.env.ZOMBIE_RESTART_THRESHOLD || '3',
  10
)
const MIN_AGE_SECONDS = Number.parseInt(
  process.env.ZOMBIE_RESTART_MIN_AGE || '1800',
  10
)
const RESTART_REGEX = new RegExp(
  process.env.ZOMBIE_RESTART_CONTAINER_REGEX || 'supabase',
  'i'
)
const DRY_RUN = process.env.ZOMBIE_DRY_RUN === '1'

function now() {
  return new Date().toISOString()
}

function safeLog(message) {
  const line = `[${now()}] ${message}`
  console.log(line)
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
    fs.appendFileSync(LOG_FILE, `${line}\n`)
  } catch (error) {
    console.warn(`Unable to write zombie log: ${error.message}`)
  }
}

function run(cmd) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    return ''
  }
}

function loadContainerNames() {
  const map = new Map()
  const output = run('docker ps --format "{{.ID}} {{.Names}}"')
  output
    .trim()
    .split('\n')
    .filter(Boolean)
    .forEach((line) => {
      const [id, ...rest] = line.trim().split(/\s+/)
      if (id) {
        map.set(id.slice(0, 12), rest.join(' ') || id.slice(0, 12))
      }
    })
  return map
}

function findContainerIdForPid(pid) {
  try {
    const cgroup = fs.readFileSync(`/proc/${pid}/cgroup`, 'utf8')
    for (const line of cgroup.split('\n')) {
      const match = line.match(/docker[\\/-]([0-9a-f]{12,64})/i)
      if (match && match[1]) {
        return match[1].slice(0, 12)
      }
    }
  } catch {
    // Ignore read errors
  }
  return null
}

function parsePsLine(line) {
  const parts = line.trim().split(/\s+/)
  if (parts.length < 7) return null
  const [pidStr, ppidStr, stat, etimesStr, pcpuStr, pmemStr, ...cmdParts] =
    parts
  return {
    pid: Number.parseInt(pidStr, 10),
    ppid: Number.parseInt(ppidStr, 10),
    stat,
    etimes: Number.parseInt(etimesStr, 10),
    pcpu: Number.parseFloat(pcpuStr),
    pmem: Number.parseFloat(pmemStr),
    cmd: cmdParts.join(' '),
  }
}

function readProcCmd(pid) {
  if (!pid || Number.isNaN(pid)) return ''
  try {
    const raw = fs
      .readFileSync(`/proc/${pid}/cmdline`, 'utf8')
      .replace(/\0/g, ' ')
    const cleaned = raw.trim()
    if (cleaned) return cleaned
  } catch {
    // Ignore read errors
  }
  try {
    return fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim()
  } catch {
    return ''
  }
}

function formatCmd(cmd) {
  if (!cmd) return ''
  return cmd.length > 200 ? `${cmd.slice(0, 197)}...` : cmd
}

function getZombies() {
  const output = run('ps -eo pid,ppid,stat,etimes,pcpu,pmem,comm,args')
  return output
    .split('\n')
    .map(parsePsLine)
    .filter(
      (proc) =>
        proc &&
        typeof proc.stat === 'string' &&
        proc.stat.includes('Z') &&
        proc.etimes > 10 // Ignore transient zombies (<10s)
    )
}

function restartContainer(containerId, name, reason) {
  const label = `${name || containerId} (${containerId})`
  if (DRY_RUN) {
    safeLog(`DRY RUN: would restart ${label} ${reason}`)
    return
  }
  try {
    safeLog(`Restarting ${label} ${reason}`)
    execSync(`docker restart ${containerId}`, { stdio: 'ignore' })
    safeLog(`Restarted ${label}`)
  } catch (error) {
    safeLog(`Failed to restart ${label}: ${error.message}`)
  }
}

function main() {
  const zombies = getZombies().map((proc) => ({
    ...proc,
    cmd: formatCmd(proc.cmd),
    parentCmd: formatCmd(readProcCmd(proc.ppid)),
  }))
  if (!zombies.length) {
    safeLog('No zombie processes found')
    return
  }

  const containerNames = loadContainerNames()
  const groups = new Map()

  const parentGroups = new Map()

  zombies.forEach((proc) => {
    const containerId = findContainerIdForPid(proc.pid)
    const key = containerId || 'host'
    if (!groups.has(key)) {
      groups.set(key, {
        containerId,
        name: containerId
          ? containerNames.get(containerId) || containerId
          : 'host',
        zombies: [],
      })
    }
    groups.get(key).zombies.push(proc)

    const parentKey = `${proc.ppid || 0}:${proc.parentCmd || ''}`
    if (!parentGroups.has(parentKey)) {
      parentGroups.set(parentKey, {
        ppid: proc.ppid,
        cmd: proc.parentCmd,
        children: [],
      })
    }
    parentGroups.get(parentKey).children.push(proc.pid)
  })

  const summary = Array.from(groups.values()).map((group) => {
    const roster = group.zombies
      .map(
        (proc) =>
          `pid=${proc.pid} ppid=${proc.ppid} age=${proc.etimes}s cmd="${proc.cmd}" parent="${proc.parentCmd || 'unknown'}"`
      )
      .join('; ')
    return `${group.name || 'host'}: ${roster}`
  })

  safeLog(`Found ${zombies.length} zombie process(es): ${summary.join(' | ')}`)

  if (parentGroups.size) {
    const parentSummary = Array.from(parentGroups.values())
      .map(
        (parent) =>
          `ppid=${parent.ppid} children=[${parent.children.join(',')}] parent="${parent.cmd || 'unknown'}"`
      )
      .join(' | ')
    safeLog(`Zombie parents: ${parentSummary}`)
  }

  groups.forEach((group) => {
    const { containerId, name, zombies: zs } = group
    if (!containerId) return
    if (!RESTART_REGEX.test(name || containerId)) return
    if (zs.length < RESTART_THRESHOLD) return
    const minAge = Math.min(...zs.map((z) => z.etimes || 0))
    if (minAge < MIN_AGE_SECONDS) return
    restartContainer(
      containerId,
      name,
      `(zombies=${zs.length} minAge=${minAge}s threshold=${RESTART_THRESHOLD} age>=${MIN_AGE_SECONDS}s)`
    )
  })
}

main()
