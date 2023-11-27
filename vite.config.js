import { resolve } from 'path';
import { defineConfig } from 'vite';

const signalizejsDir = resolve('./packages') + '/signalizejs';
const signalizejsSourceDir = signalizejsDir + '/src';
const pluginsDir = signalizejsSourceDir + '/plugins';

export default defineConfig({
	base: './',
	resolve: {
		conditions: ['development', 'browser'],
		alias: {
			'signalizejs/dialog': `${pluginsDir}/dialog.ts`,
			'signalizejs/directives/for': `${pluginsDir}/directives/for.ts`,
			'signalizejs/directives/if': `${pluginsDir}/directives/if.ts`,
			'signalizejs/directives': `${pluginsDir}/directives.ts`,
			'signalizejs/fetch': `${pluginsDir}/fetch.ts`,
			'signalizejs/h': `${pluginsDir}/h.ts`,
			'signalizejs/intersection-observer': `${pluginsDir}/intersection-observer.ts`,
			'signalizejs/is-in-viewport': `${pluginsDir}/is-in-viewport.ts`,
			'signalizejs/is-visible': `${pluginsDir}/is-visible.ts`,
			'signalizejs/logger': `${pluginsDir}/logger.ts`,
			'signalizejs/offset': `${pluginsDir}/offset.ts`,
			'signalizejs/snippets': `${pluginsDir}/snippets.ts`,
			'signalizejs/spa': `${pluginsDir}/spa.ts`,
			'signalizejs/width': `${pluginsDir}/width.ts`,
			'signalizejs/height': `${pluginsDir}/height.ts`,
			signalizejs: `${signalizejsSourceDir}/index.ts`
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
