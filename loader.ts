// load-injectables.ts
import path from 'node:path';
import fg from 'fast-glob';
import fs from 'node:fs';
export type LoadInjectablesOptions = {
	autoload?: boolean;
	workingDirectory?: string;
	patterns?: string[];
	logging?: boolean;
	extensions?: string[];
};
export function loadInjectables(opts?: LoadInjectablesOptions) {
	if (!opts?.autoload) return;
	const logging = opts?.logging ?? false;
	const patterns = opts?.patterns ?? ['**/*.(ts|js)'];
	const extensions = opts?.extensions ?? [
		'ts',
		'mts',
		'cts',
		'js',
		'cjs',
		'mjs',
	];
	const workingDirectory = opts?.workingDirectory;
	if (!workingDirectory) throw new Error('Working directory is required');
	const baseDir = path.resolve(path.join(workingDirectory));
	if (logging) {
		console.log('------ AUTO LOADING BASE DIR ------');
		console.log(baseDir);
		console.log('------ AUTO LOADING PATTERNS ------');
		console.log(patterns);
	}
	// TS dev: .ts, prod: .js
	const files = fg.sync(
		extensions.flatMap((ext) =>
			patterns.map((p) => path.join(baseDir, p.replace('(ts|js)', ext)))
		),
		{
			onlyFiles: true,
			unique: true,
		}
	);

	if (logging) {
		console.log('------ AUTO LOADING FILES ------');
		console.log(files);
	}
	if (files.length > 0) {
		files.forEach((f) => {
			const file = fs.readFileSync(f, 'utf8');
			if (!file.startsWith('//mini-dont-auto-load')) {
				if (logging) {
					console.log('auto-loading', f);
				}
				require(f);
			} else {
				if (logging) {
					console.log('skipping', f);
				}
			}
		});
	} else {
		if (opts?.logging) console.log('------ NO FILES FOUND TO AUTO LOAD ------');
	}
	return { files, count: files.length };
}
