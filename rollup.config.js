import { resolve, parse } from 'path'
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import { existsSync, rmdirSync } from 'fs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const packagesDir = resolve('./packages');
const signalizeDir = `${packagesDir}/signalizejs`;

/**
 * @type { RollupOptions[] }
 */
const packages = [
	// signalizejs
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/src`,
				declarationDir: `${signalizeDir}/dist`
			}),
			nodeResolve()
		],
		input: `${signalizeDir}/src/index.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/signalize.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/dialog
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/dialog.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/dialog.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/directives
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/directives.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/directives.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/directives/for
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/directives/for.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/directives/for.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/directives/if
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/directives/if.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/directives/if.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/evaluator
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/evaluator.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/evaluator.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/fetch
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/fetch.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/fetch.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/h
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/hyperscript.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/hyperscript.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/logger
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/logger.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/logger.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/snippets
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/snippets.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/snippets.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/spa
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/spa.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/spa.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/traverse-dom
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/traverse-dom.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/traverse-dom.js`,
				format: 'esm'
			}
		]
	},

	// signalizejs/task
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/task.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/task.js`,
				format: 'esm'
			}
		]
	}
]

for (const packageConfig of packages) {
	const dir = parse(packageConfig.output[0].file).dir;

	if (!existsSync(dir)) {
		continue;
	}

	rmdirSync(dir, { recursive: true, force: true });
}

export default defineConfig([
	...packages
])
