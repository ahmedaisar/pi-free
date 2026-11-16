#!/usr/bin/env node
/**
 * Smoke-test the OMP manifest entry with Bun. OMP installs Git dependencies
 * without running untrusted dependency lifecycle scripts, so this entry must
 * be importable directly from the checked-in TypeScript source tree.
 *
 * Usage:
 *   bun scripts/smoke-omp-source.mjs [package-directory]
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, join, relative, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

if (!process.versions.bun) {
	throw new Error("This smoke test must run under Bun");
}

const packageDir = resolve(process.argv[2] ?? ".");
const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
const entries = pkg.omp?.extensions;

if (!Array.isArray(entries) || entries.length === 0) {
	throw new Error("package.json must declare omp.extensions");
}

for (const entry of entries) {
	const entryPath = resolve(packageDir, entry);
	const relativeEntry = relative(packageDir, entryPath);
	if (relativeEntry.startsWith("..") || isAbsolute(relativeEntry)) {
		throw new Error(`OMP extension entry escapes package directory: ${entry}`);
	}
	if (!existsSync(entryPath)) {
		throw new Error(`OMP extension entry missing on disk: ${entry}`);
	}
	const module = await import(pathToFileURL(entryPath).href);
	if (typeof module.default !== "function") {
		throw new Error(`OMP extension entry does not export a default factory: ${entry}`);
	}
	console.log(`OK: OMP source extension imports and exports a factory: ${entry}`);
}
