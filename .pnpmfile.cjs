/**
 * Strip the supabase CLI's bin field and postinstall hook on Vercel builds.
 *
 * The supabase npm package declares `bin: "bin/supabase"` but the file is
 * downloaded by its postinstall script. pnpm tries to link the bin entry
 * before postinstall runs, producing a noisy ENOENT warning. Vercel never
 * invokes the supabase CLI during the build, so skipping both the bin link
 * and the postinstall download avoids the warning and shaves the CLI tarball
 * fetch off every deploy.
 *
 * Local installs (no VERCEL env var) are untouched so `pnpm exec supabase`
 * keeps working for developers.
 */
function readPackage(pkg) {
  if (process.env.VERCEL === '1' && pkg.name === 'supabase') {
    delete pkg.bin
    if (pkg.scripts) {
      delete pkg.scripts.postinstall
    }
  }
  return pkg
}

module.exports = {
  hooks: {
    readPackage,
  },
}
