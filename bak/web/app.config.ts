import { defineConfig } from '@solidjs/start/config';
import UnoCSS from 'unocss/vite';
import { Plugin } from 'vite';

import { env } from './src/utils/env';
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
env;

const sqlocal: Plugin = {
	name: 'configure-response-headers',
	configureServer: (server) => {
		server.middlewares.use((_req, res, next) => {
			res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
			res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
			next();
		});
	}
};

export default defineConfig({
	ssr: false,
	server: {
		static: true,
		esbuild: {
			options: {
				target: 'esnext'
			}
		},
		devProxy: {
			'/api': 'http://localhost:3002/api'
		}
	},
	vite: {
		// @ts-ignore
		server: {
			port: 3001,
			hmr: {
				protocol: 'ws',
				port: 8754
			}
		},
		plugins: [sqlocal, UnoCSS()],
		optimizeDeps: {
			exclude: ['sqlocal']
		},
		worker: {
			format: 'es'
		}
	}
});
