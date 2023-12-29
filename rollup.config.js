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

	// signalizejs/dialog
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/dialog.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/dialog.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/dist/plugins/dialog.cjs`,
				format: 'cjs'
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
			},
			{
				file: `${signalizeDir}/dist/plugins/directives.cjs`,
				format: 'cjs'
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
			},
			{
				file: `${signalizeDir}/dist/plugins/directives/for.cjs`,
				format: 'cjs'
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
			},
			{
				file: `${signalizeDir}/dist/plugins/directives/if.cjs`,
				format: 'cjs'
			}
		]
	},

	// signalizejs/evaluator
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/evaluate.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/evaluate.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/dist/plugins/evaluate.cjs`,
				format: 'cjs'
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
			},
			{
				file: `${signalizeDir}/dist/plugins/fetch.cjs`,
				format: 'cjs'
			}
		]
	},

	// signalizejs/h
	{
		plugins: [typescript()],
		input: `${signalizeDir}/src/plugins/h.ts`,
		treeshake: false,
		output: [
			{
				file: `${signalizeDir}/dist/plugins/h.js`,
				format: 'esm'
			},
			{
				file: `${signalizeDir}/dist/plugins/h.cjs`,
				format: 'cjs'
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
			},
			{
				file: `${signalizeDir}/dist/plugins/logger.cjs`,
				format: 'cjs'
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
			},
			{
				file: `${signalizeDir}/dist/plugins/snippets.cjs`,
				format: 'cjs'
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
			},
			{
				file: `${signalizeDir}/dist/plugins/spa.cjs`,
				format: 'cjs'
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
			},
			{
				file: `${signalizeDir}/dist/plugins/traverse-dom.cjs`,
				format: 'cjs'
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
			},
			{
				file: `${signalizeDir}/dist/plugins/task.cjs`,
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
