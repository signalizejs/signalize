import { resolve } from 'path';
import { defineConfig } from "rollup";
import typescript from '@rollup/plugin-typescript';

const islandsDir = resolve('.');
const islandsDistDir = `${islandsDir}/dist`;
const islandsSrcDir = `${islandsDir}/src`;
const islandsCommonPlugins = [
	typescript({
		declaration: true,
		rootDir: islandsSrcDir,
		declarationDir: islandsDistDir,
	})
];
const islandsCommonExternal = ['./core'];

/**
 * @type { RollupOptions[] }
 */
const islandsPackages = [
	// Full Library
	{
		plugins: islandsCommonPlugins,
		input:  `${islandsSrcDir}/index.ts`,
		treeshake: false,
		output: [
			{
				file: `${islandsDistDir}/islands.js`,
				format: 'esm',
			},
			{
				file: `${islandsDistDir}/islands.cjs`,
				format: 'cjs',
			},
		]
	},
 	// Separated modules
	{
		plugins: islandsCommonPlugins,
		input: `${islandsSrcDir}/ajaxify.ts`,
		treeshake: false,
		external: islandsCommonExternal,
		output: [
			{
				file: `${islandsDistDir}/ajaxify.js`,
				format: 'esm',
			},
			{
				file: `${islandsDistDir}/ajaxify.cjs`,
				format: 'cjs',
			},
		]
	},
	{
		plugins: islandsCommonPlugins,
		input: `${islandsSrcDir}/core.ts`,
		treeshake: false,
		output: [
			{
				file: `${islandsDistDir}/core.js`,
				format: 'esm',
			},
			{
				file: `${islandsDistDir}/core.cjs`,
				format: 'cjs',
			},
		]
	},
	{
		plugins: islandsCommonPlugins,
		input: `${islandsSrcDir}/dialog.ts`,
		treeshake: false,
		external: islandsCommonExternal,
		output: [
			{
				file: `${islandsDistDir}/dialog.js`,
				format: 'esm',
			},
			{
				file: `${islandsDistDir}/dialog.cjs`,
				format: 'cjs',
			},
		]
	},
	{
		plugins: islandsCommonPlugins,
		input: `${islandsSrcDir}/h.ts`,
		treeshake: false,
		external: islandsCommonExternal,
		output: [
			{
				file: `${islandsDistDir}/h.js`,
				format: 'esm',
			},
			{
				file: `${islandsDistDir}/h.cjs`,
				format: 'cjs',
			},
		]
	},
	{
		plugins: islandsCommonPlugins,
		input: `${islandsSrcDir}/script-loader.ts`,
		treeshake: false,
		external: islandsCommonExternal,
		output: [
			{
				file: `${islandsDistDir}/script-loader.js`,
				format: 'esm',
			},
			{
				file: `${islandsDistDir}/script-loader.cjs`,
				format: 'cjs',
			},
		]
	}
];

export default defineConfig([
	...islandsPackages,
])
