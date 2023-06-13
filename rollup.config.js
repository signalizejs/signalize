import { resolve } from 'path'
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import { existsSync, rmdirSync } from 'fs';

const packagesDir = resolve('./packages');
const distDirs = [
	`${packagesDir}/islands/dist`,
	`${packagesDir}/islands/ajax/dist`,
	`${packagesDir}/islands/ajaxify/dist`,
	`${packagesDir}/islands/component/dist`,
	`${packagesDir}/islands/dialog/dist`,
	`${packagesDir}/islands/h/dist`,
	`${packagesDir}/islands/script-loader/dist`
]

for (const distDir of distDirs) {
	if (!existsSync(distDir)) {
		continue;
	}

	rmdirSync(distDir, { recursive: true, force: true });
}

const islandsDir = `${packagesDir}/islands`;

/**
 * @type { RollupOptions[] }
 */
const islandsPackages = [
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

	// Ajaxify
	{
		plugins: [
			typescript({
				declaration: true,
				rootDir: `${islandsDir}/ajaxify/src`,
				declarationDir: `${islandsDir}/ajaxify/dist`
			})
		],
		input: `${islandsDir}/ajaxify/src/index.ts`,
		treeshake: false,
		external: ['islandsjs'],
		output: [
			{
				file: `${islandsDir}/ajaxify/dist/ajaxify.js`,
				format: 'esm'
			},
			{
				file: `${islandsDir}/ajaxify/dist/ajaxify.cjs`,
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
	}
]

export default defineConfig([
	...islandsPackages
])
