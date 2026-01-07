# Performance Playbook

## Bundle analysis

- Run the analyzer:
  - `pnpm analyze`
  - `npm run analyze`
  - `yarn analyze`
- Output location: the analyzer writes HTML reports to `<distDir>/analyze/`
  (`client.html`, `nodejs.html`, `edge.html`). The build `distDir` is usually
  `.next`, or `.next-build` when `scripts/safe-build.js` isolates builds.

## Build time benchmarking

- Cold build (no cache):
  - `pnpm clean`
  - `time pnpm build`
- Warm build (cache present):
  - `time pnpm build`
- If you need a consistent distDir, set `NEXT_DIST_DIR=.next` or
  `NEXT_DIST_DIR=.next-build` before running the build.

## Tips to keep bundles lean

- Prefer dynamic imports (`next/dynamic`) for heavy or rarely used UI.
- Avoid importing large libraries in shared layouts or app shells.
- Keep route handlers light: move heavy work behind dynamic imports or into
  background jobs when possible.

## Cache + data patterns (guidance)

- Use `fetch` caching with `next/cache` revalidation where possible.
- Favor tag-based invalidation (`revalidateTag`) over broad revalidation.
- Avoid putting large computed datasets in module scope on the server.
