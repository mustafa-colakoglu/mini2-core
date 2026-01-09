// load-injectables.ts
import path from 'node:path';
import fg from 'fast-glob';
import fs from 'node:fs';
export type LoadInjectablesOptions = {
	autoload?: boolean;
	srcDir?: string;
	distDir?: string;
	patterns?: string[];
	runOnlySrc?: boolean;
	logging?: boolean;
};
export function loadInjectables(opts?: LoadInjectablesOptions) {
	if (!opts?.autoload) return;
	const srcDir = opts?.srcDir ?? 'src';
	const distDir = opts?.distDir ?? 'dist';
	const patterns = opts?.patterns ?? ['**/*.(ts|js)'];

	const isProd = process.env.NODE_ENV === 'production';
	const baseDir = path.resolve(
		path.join(opts?.runOnlySrc ? srcDir : isProd ? distDir : srcDir)
	);
	if (opts?.logging) {
		console.log('------ AUTO LOADING BASE DIR ------');
		console.log(baseDir);
		console.log('------ AUTO LOADING PATTERNS ------');
		console.log(patterns);
	}
	// TS dev: .ts, prod: .js
	const exts = isProd ? ['js', 'cjs', 'mjs'] : ['ts', 'mts', 'cts'];

	const files = fg.sync(
		exts.flatMap((ext) =>
			patterns.map((p) => path.join(baseDir, p.replace('(ts|js)', ext)))
		),
		{
			onlyFiles: true,
			unique: true,
		}
	);

	if (opts?.logging) {
		console.log('------ AUTO LOADING FILES ------');
		console.log(files);
	}
	files.forEach((f) => {
		const file = fs.readFileSync(f, 'utf8');
		if (!file.startsWith('//mini-dont-auto-load')) {
			if (opts?.logging) console.log('auto-loading', f);
			require(f);
		} else {
			if (opts?.logging) console.log('skipping', f);
		}
	});
	return { files, count: files.length };
}
