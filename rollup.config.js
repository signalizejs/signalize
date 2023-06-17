import { resolve, parse } from 'path'
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import { existsSync, rmdirSync } from 'fs';

const packagesDir = resolve('./packages');
const islandsDir = `${packagesDir}/islands`;

/**
 * @type { RollupOptions[] }
 */
const packages = [
	// IslandsJS
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${islandsDir}/src`,
				declarationDir: `${islandsDir}/dist`
			})
		],
		input: `${islandsDir}/src/index.ts`,
		treeshake: false,
		output: [
			{
				file: `${islandsDir}/dist/islands.js`,
				format: 'esm'
			},
			{
				file: `${islandsDir}/dist/islands.cjs`,
				format: 'cjs'
			}
		]
	},

	// Ajax
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${islandsDir}/ajax/src`,
				declarationDir: `${islandsDir}/ajax/dist`
			})
		],
		input: `${islandsDir}/ajax/src/index.ts`,
		treeshake: false,
		external: ['islandsjs'],
		output: [
			{
				file: `${islandsDir}/ajax/dist/ajax.js`,
				format: 'esm'
			},
			{
				file: `${islandsDir}/ajax/dist/ajax.cjs`,
				format: 'cjs'
			}
		]
	},

	// Component
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${islandsDir}/component/src`,
				declarationDir: `${islandsDir}/component/dist`
			})
		],
		input: `${islandsDir}/component/src/index.ts`,
		treeshake: false,
		external: ['islandsjs'],
		output: [
			{
				file: `${islandsDir}/component/dist/component.js`,
				format: 'esm'
			},
			{
				file: `${islandsDir}/component/dist/component.cjs`,
				format: 'cjs'
			}
		]
	},

	// Dialog
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${islandsDir}/dialog/src`,
				declarationDir: `${islandsDir}/dialog/dist`
			})
		],
		input: `${islandsDir}/dialog/src/index.ts`,
		treeshake: false,
		external: ['islandsjs'],
		output: [
			{
				file: `${islandsDir}/dialog/dist/dialog.js`,
				format: 'esm'
			},
			{
				file: `${islandsDir}/dialog/dist/dialog.cjs`,
				format: 'cjs'
			}
		]
	},

	// Hypertext
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${islandsDir}/h/src`,
				declarationDir: `${islandsDir}/h/dist`
			})
		],
		input: `${islandsDir}/h/src/index.ts`,
		treeshake: false,
		external: ['islandsjs'],
		output: [
			{
				file: `${islandsDir}/h/dist/h.js`,
				format: 'esm'
			},
			{
				file: `${islandsDir}/h/dist/h.cjs`,
				format: 'cjs'
			}
		]
	},

	// Script Loader
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${islandsDir}/script-loader/src`,
				declarationDir: `${islandsDir}/script-loader/dist`
			})
		],
		input: `${islandsDir}/script-loader/src/index.ts`,
		treeshake: false,
		external: ['islandsjs'],
		output: [
			{
				file: `${islandsDir}/script-loader/dist/script-loader.js`,
				format: 'esm'
			},
			{
				file: `${islandsDir}/script-loader/dist/script-loader.cjs`,
				format: 'cjs'
			}
		]
	},

	// Snippets
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${islandsDir}/snippets/src`,
				declarationDir: `${islandsDir}/snippets/dist`
			})
		],
		input: `${islandsDir}/snippets/src/index.ts`,
		treeshake: false,
		external: ['islandsjs'],
		output: [
			{
				file: `${islandsDir}/snippets/dist/snippets.js`,
				format: 'esm'
			},
			{
				file: `${islandsDir}/snippets/dist/snippets.cjs`,
				format: 'cjs'
			}
		]
	},

	// Spa
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${islandsDir}/spa/src`,
				declarationDir: `${islandsDir}/spa/dist`
			})
		],
		input: `${islandsDir}/spa/src/index.ts`,
		treeshake: false,
		external: ['islandsjs'],
		output: [
			{
				file: `${islandsDir}/spa/dist/spa.js`,
				format: 'esm'
			},
			{
				file: `${islandsDir}/spa/dist/spa.cjs`,
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
