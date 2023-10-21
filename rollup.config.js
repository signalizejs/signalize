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
			},
			{
				file: `${signalizeDir}/dist/signalize.cjs`,
				format: 'cjs'
			}
		]
	},
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/src`,
				declarationDir: `${signalizeDir}/dist`
			})
		],
		input: `${signalizeDir}/src/index.global.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/signalize.global.js`,
				format: 'iife'
			}
		]
	},

	// signalizejs/ajax
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/ajax/src`,
				declarationDir: `${signalizeDir}/ajax/dist`
			})
		],
		input: `${signalizeDir}/ajax/src/index.ts`,
		treeshake: false,
		external: ['signalizejs'],
		output: [
			{
				file: `${signalizeDir}/ajax/dist/ajax.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/ajax/dist/ajax.cjs`,
				format: 'cjs'
			}
		]
	},

	// signalizejs/dialog
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/asset-loader/src`,
				declarationDir: `${signalizeDir}/asset-loader/dist`
			})
		],
		input: `${signalizeDir}/asset-loader/src/index.ts`,
		treeshake: false,
		external: ['signalizejs'],
		output: [
			{
				file: `${signalizeDir}/asset-loader/dist/asset-loader.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/asset-loader/dist/asset-loader.cjs`,
				format: 'cjs'
			}
		]
	},

	// signalizejs/dialog
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/directives/src`,
				declarationDir: `${signalizeDir}/directives/dist`
			})
		],
		input: `${signalizeDir}/directives/src/index.ts`,
		treeshake: false,
		external: ['signalizejs'],
		output: [
			{
				file: `${signalizeDir}/directives/dist/directives.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/directives/dist/directives.cjs`,
				format: 'cjs'
			}
		]
	},

	// signalizejs/dialog
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/dialog/src`,
				declarationDir: `${signalizeDir}/dialog/dist`
			})
		],
		input: `${signalizeDir}/dialog/src/index.ts`,
		treeshake: false,
		external: ['signalizejs'],
		output: [
			{
				file: `${signalizeDir}/dialog/dist/dialog.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/dialog/dist/dialog.cjs`,
				format: 'cjs'
			}
		]
	},

	// signalizejs/h
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/h/src`,
				declarationDir: `${signalizeDir}/h/dist`
			})
		],
		input: `${signalizeDir}/h/src/index.ts`,
		treeshake: false,
		external: ['signalizejs'],
		output: [
			{
				file: `${signalizeDir}/h/dist/h.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/h/dist/h.cjs`,
				format: 'cjs'
			}
		]
	},

	// signalizejs/logger
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/logger/src`,
				declarationDir: `${signalizeDir}/logger/dist`
			})
		],
		input: `${signalizeDir}/logger/src/index.ts`,
		treeshake: false,
		external: ['signalizejs'],
		output: [
			{
				file: `${signalizeDir}/logger/dist/logger.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/logger/dist/logger.cjs`,
				format: 'cjs'
			}
		]
	},

	// signalizejs/snippets
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/snippets/src`,
				declarationDir: `${signalizeDir}/snippets/dist`
			})
		],
		input: `${signalizeDir}/snippets/src/index.ts`,
		treeshake: false,
		external: ['signalizejs'],
		output: [
			{
				file: `${signalizeDir}/snippets/dist/snippets.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/snippets/dist/snippets.cjs`,
				format: 'cjs'
			}
		]
	},

	// signalizejs/spa
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/spa/src`,
				declarationDir: `${signalizeDir}/spa/dist`
			})
		],
		input: `${signalizeDir}/spa/src/index.ts`,
		treeshake: false,
		external: ['signalizejs'],
		output: [
			{
				file: `${signalizeDir}/spa/dist/spa.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/spa/dist/spa.cjs`,
				format: 'cjs'
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
