import { resolve } from 'path';
import { defineConfig } from 'vite';

const packagesDir = resolve('./packages');

export default defineConfig({
	base: './',
	resolve: {
		conditions: ['development', 'browser'],
		alias: {
			'islandsjs/ajax': `${packagesDir}/islands/ajax/src/index.ts`,
			'islandsjs/component': `${packagesDir}/islands/component/src/index.ts`,
			'islandsjs/dialog': `${packagesDir}/islands/dialog/src/index.ts`,
			'islandsjs/h': `${packagesDir}/islands/h/src/index.ts`,
			'islandsjs/script-loader': `${packagesDir}/islands/script-loader/src/index.ts`,
			'islandsjs/snippets': `${packagesDir}/islands/snippets/src/index.ts`,
			'islandsjs/spa': `${packagesDir}/islands/spa/src/index.ts`,
			islandsjs: `${packagesDir}/islands/src/index.ts`
		}
	},
	server: {
		host: '0.0.0.0',
		port: '5173'
	},
	preview: {
		host: '0.0.0.0',
		port: '4173'
	}
})
