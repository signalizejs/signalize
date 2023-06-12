import { defineConfig } from 'vite';
import commonJs from '@rollup/plugin-commonjs';

export default defineConfig({
	build: {
		manifest: false,
		minify: false,
		rollupOptions: {
			input: {
				islands: './packages/islands/src/index.ts',
			}
		}
	},
	server: {
		host: "0.0.0.0",
		port: "5173"
	},
})
