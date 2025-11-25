/**
 * Supabase Docker cleanup helper.
 * - Disables auto-restart on running Supabase containers.
 * - Prunes unused Supabase images (keeps ones in use by running containers).
 * - Optionally runs a full docker system prune when PRUNE_SYSTEM=1.
 */
const { execSync } = require('child_process')

const log = (message) => console.log(`🧹 ${message}`)

const dockerAvailable = () => {
  try {
    execSync('docker info', { stdio: 'ignore' })
    return true
  } catch {
    log('Docker is not available; skipping cleanup.')
    return false
  }
}

const disableRestartPolicy = () => {
  const ids = execSync('docker ps --filter name=supabase --quiet', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  })
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (ids.length === 0) {
    return
  }

  log(`Disabling auto-restart on ${ids.length} Supabase container(s)...`)
  execSync(`docker update --restart=no ${ids.join(' ')}`, { stdio: 'inherit' })
}

const pruneSupabaseImages = () => {
  log('Pruning unused Supabase images...')

  // docker image prune does not accept a reference filter, so remove matches directly
  const ids = execSync(
    'docker images --filter "reference=public.ecr.aws/supabase/*" --quiet',
    {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (ids.length === 0) {
    log('No Supabase images found.')
    return
  }

  const failed = []

  ids.forEach((id) => {
    try {
      execSync(`docker image rm ${id}`, { stdio: 'inherit' })
    } catch {
      failed.push(id)
    }
  })

  if (failed.length > 0) {
    log(
      `Could not remove ${failed.length} image(s) (likely still used by containers): ${failed.join(
        ', '
      )}`
    )
  }
}

const systemPruneIfRequested = () => {
  if (
    !['1', 'true'].includes(
      String(process.env.PRUNE_SYSTEM || '').toLowerCase()
    )
  ) {
    return
  }

  log('Running docker system prune (requested)...')
  execSync('docker system prune -af --volumes', { stdio: 'inherit' })
}

const runCleanup = () => {
  if (!dockerAvailable()) return
  try {
    disableRestartPolicy()
  } catch (error) {
    log(`Could not disable restart policy: ${error.message}`)
  }

  try {
    pruneSupabaseImages()
  } catch (error) {
    log(`Could not prune Supabase images: ${error.message}`)
  }

  try {
    systemPruneIfRequested()
  } catch (error) {
    log(`System prune failed: ${error.message}`)
  }
}

if (require.main === module) {
  runCleanup()
}

module.exports = {
  runCleanup,
  pruneSupabaseImages,
  disableRestartPolicy,
  systemPruneIfRequested,
}
