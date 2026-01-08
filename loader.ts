// load-injectables.ts
import path from 'node:path';
import fg from 'fast-glob';
import fs from 'node:fs';
export type LoadInjectablesOptions = {
	srcDir?: string;
	distDir?: string;
	patterns?: string[];
	runOnlySrc?: boolean;
};
export function loadInjectables(opts?: LoadInjectablesOptions) {
	const srcDir = opts?.srcDir ?? 'src';
	const distDir = opts?.distDir ?? 'dist';
	const patterns = opts?.patterns ?? ['**/*.(ts|js)'];

	const isProd = process.env.NODE_ENV === 'production';
	const baseDir = path.join(
		opts?.runOnlySrc ? srcDir : isProd ? distDir : srcDir
	);
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

	files.forEach((f) => {
		const file = fs.readFileSync(f, 'utf8');
		console.log(file);
		if (!file.startsWith('//mini-dont-auto-load')) {
			console.log('auto-loading', f);
			require(f);
		} else {
			console.log('skipping', f);
		}
	});
	return { files, count: files.length };
}
