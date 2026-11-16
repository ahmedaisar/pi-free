# Compiled packaging

pi-free supports two extension loaders with different entry-point requirements:

- **Pi** loads the compiled Node ESM output at `dist/index.js`.
- **Oh My Pi (OMP)** installs Git dependencies with Bun. Bun intentionally does not run lifecycle scripts for untrusted Git dependencies, so a Git install cannot rely on `prepare` to create `dist/`. OMP therefore loads the TypeScript source entry at `index.ts`.

The package declares both manifests: `pi.extensions` points to `./dist/index.js`, while `omp.extensions` points to `./index.ts`. OMP prefers its native `omp` manifest; Pi continues to use the `pi` manifest. This keeps Pi's compiled runtime contract intact while making direct Git installs in OMP deterministic without executing install-time build scripts.

## Build

`tsconfig.build.json` uses the pinned TypeScript compiler with `module` and
`moduleResolution` set to `NodeNext`. It emits the runtime graph rooted at
`index.ts` as ES2022 JavaScript, keeps peer imports external, and uses
`rewriteRelativeImportExtensions` so source `.ts` imports become `.js` imports.
The build also copies `provider-failover/benchmarks.json` to the matching
`dist/provider-failover/` path.

```sh
npm run build       # clean and emit dist/
npm run clean       # remove dist/
npm run lint        # type-check source
npm run test:run    # source-mode tests
npm run smoke:compiled
```

`prepare` builds the compiled entry for npm packaging and compatible Git installers. It is not required for OMP Git installs: Bun skips lifecycle scripts for untrusted Git dependencies by design. The OMP entry is source-first and imports the checked-in TypeScript graph directly.

The npm package includes both the compiled `dist/` output and the source files required by OMP's `index.ts` entry. The package tarball is checked for both manifest entries and their relative import closure.

## Validation

Build and package checks are available with:

```sh
npm run build
npm run check
npm pack
node scripts/check-tarball.mjs ./pi-free-*.tgz
node scripts/smoke-compiled.mjs ./dist/index.js
bun scripts/smoke-omp-source.mjs
```

CI validates the compiled Pi entry and separately imports the OMP TypeScript entry using Bun, including the source tree extracted from the npm tarball. This specifically guards against regressions where a Git install has a manifest entry that exists only after a lifecycle build.

Dynamic imports remain unbundled, with one deliberate exception: the
last-resort pi-ai fallback bundles in `dist/vendor/` (`pi-ai-compat.js`,
`pi-ai-providers-all.js`). Bun-compiled Pi binaries cannot resolve bare
specifiers from external files at all, so no on-disk pi-ai layout can serve
pi-free's runtime imports there; the bundles inline transitive dependencies
and are imported only when no real pi-ai package resolves on disk. The OpenCode
paths otherwise continue to use runtime specifier resolution, so the compiled
output must be tested with the host Pi peer packages available.

## Startup comparison

The import-inclusive benchmark supports both modes:

```sh
npx tsx scripts/bench-startup.ts warm source
npm run build
npx tsx scripts/bench-startup.ts warm compiled
```

The `RESULT` line includes `entryKind`, `importMs`, `factoryMs`, and the
import-inclusive `totalMs`. Source mode includes Bun/tsx module loading while
compiled mode measures Node's native ESM loader; provider initialization and
the existing warm/cold network scenarios are kept the same.
