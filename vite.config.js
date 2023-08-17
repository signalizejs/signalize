import { resolve } from 'path';
import { defineConfig } from 'vite';

const packagesDir = resolve('./packages');

export default defineConfig({
	base: './',
	resolve: {
		conditions: ['development', 'browser'],
		alias: {
			'signalizejs/ajax': `${packagesDir}/signalize/ajax/src/index.ts`,
			'signalizejs/asset-loader': `${packagesDir}/signalize/asset-loader/src/index.ts`,
			'signalizejs/dialog': `${packagesDir}/signalize/dialog/src/index.ts`,
			'signalizejs/h': `${packagesDir}/signalize/h/src/index.ts`,
			'signalizejs/logger': `${packagesDir}/signalize/logger/src/index.ts`,
			'signalizejs/snippets': `${packagesDir}/signalize/snippets/src/index.ts`,
			'signalizejs/spa': `${packagesDir}/signalize/spa/src/index.ts`,
			signalizejs: `${packagesDir}/signalize/src/index.ts`
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
