import { resolve } from 'path';
import { defineConfig } from 'vite';

const packagesDir = resolve('./packages') + '/signalizejs';

export default defineConfig({
	base: './',
	resolve: {
		conditions: ['development', 'browser'],
		alias: {
			'signalizejs/ajax': `${packagesDir}/ajax/src/index.ts`,
			'signalizejs/asset-loader': `${packagesDir}/asset-loader/src/index.ts`,
			'signalizejs/dialog': `${packagesDir}/dialog/src/index.ts`,
			'signalizejs/directives': `${packagesDir}/directives/src/index.ts`,
			'signalizejs/h': `${packagesDir}/h/src/index.ts`,
			'signalizejs/logger': `${packagesDir}/logger/src/index.ts`,
			'signalizejs/snippets': `${packagesDir}/snippets/src/index.ts`,
			'signalizejs/spa': `${packagesDir}/spa/src/index.ts`,
			signalizejs: `${packagesDir}/src/index.ts`
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
