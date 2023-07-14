import { resolve, parse } from 'path'
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import { existsSync, rmdirSync } from 'fs';

const packagesDir = resolve('./packages');
const signalizeDir = `${packagesDir}/signalize`;

/**
 * @type { RollupOptions[] }
 */
const packages = [
	// SignalizeJS
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/src`,
				declarationDir: `${signalizeDir}/dist`
			})
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

	// Ajax
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

	// Component
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${signalizeDir}/component/src`,
				declarationDir: `${signalizeDir}/component/dist`
			})
		],
		input: `${signalizeDir}/component/src/index.ts`,
		treeshake: false,
		external: ['signalizejs'],
		output: [
			{
				file: `${signalizeDir}/component/dist/component.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/component/dist/component.cjs`,
				format: 'cjs'
			}
		]
	},

	// Dialog
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

	// Hypertext
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

	// Script Loader
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

	// Snippets
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

	// Spa
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
