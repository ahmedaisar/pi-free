/**
 * Source-checkout bootstrap for hosts that validate pi.extensions before
 * running package lifecycle scripts (including OMP's Git installer).
 * `npm run build` removes this directory and replaces this file with the
 * compiled extension entry. When lifecycle scripts are skipped, OMP's
 * TypeScript-aware loader can still resolve the source entry.
 */
export { default } from "../index.ts";
