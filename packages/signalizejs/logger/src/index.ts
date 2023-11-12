import type { Signalize, SignalizePlugin, CustomEventListener } from 'signalizejs';
import type { FetchReturn } from 'signalizejs/fetch';

declare module '..' {

	interface CustomEventListeners {
		'logger:log': CustomEventListener
		'logger:warn': CustomEventListener
		'logger:error': CustomEventListener
	}
}

interface Log {
	type: 'log' | 'warn' | 'error'
	file?: string | null
	lineNumber?: number
	columnNumber?: number
	stack?: string | null
}

interface CompleteLogData extends Log {
	body: Log
	url: string
}

type Levels = 'log' | 'error' | 'warn';

export interface PluginOptions {
	enabledLevels: Levels[]
}

export default (options: PluginOptions): SignalizePlugin => {
	return ($: Signalize) => {
		const { fetch, dispatch } = $;
		let enabledLevels: Levels[] = ['error'];

		const originalConsoleError = console.error;
		const originalConsoleInfo = console.info;
		const originalConsoleLog = console.log;
		const originalConsoleWarn = console.warn;
		const originalWindowOnError = window.onerror;

		const handler = (log: Log): void => {
			const data: CompleteLogData = {
				body: log,
				url: window.location.href
			}

			dispatch(`logger:${log.type}`, {
				data,
				sendToServer: async (url = window.location.href, options = { body: data }): Promise<FetchReturn> => fetch(
					url, options
				)
			});
		}

		console.error = (...args: any[]): void => {
			if ('error' in enabledLevels) {
				handler({
					type: 'error',
					message: args
				})
			}

			originalConsoleError(...args);
		}

		console.log = (...args: any[]): void => {
			if ('log' in enabledLevels) {
				handler({
					type: 'log',
					message: args
				})
			}

			originalConsoleLog(...args);
		}

		console.info = (...args: any[]): void => {
			if ('log' in enabledLevels) {
				handler({
					type: 'log',
					message: args
				})
			}

			originalConsoleInfo(...args);
		}

		console.warn = (...args: any[]): void => {
			if ('warn' in enabledLevels) {
				handler({
					type: 'warn',
					message: args
				})
			}

			originalConsoleWarn(...args);
		}

		window.onerror = (message: Event | string, file?: string, lineNumber?: number, columnNumber?: number, error?: Error) => {
			if (message === 'Script error.') {
				// https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
				return;
			}

			if ('error' in enabledLevels) {
				handler({
					type: 'error',
					message: message instanceof Event ? message.type : message,
					file: file ?? null,
					lineNumber: lineNumber ?? 0,
					columnNumber: columnNumber ?? 0,
					stack: error?.stack ? error.stack : null
				})
			}

			originalWindowOnError(message, file, lineNumber, columnNumber, error);
		}

		enabledLevels = options?.enabledLevels ?? enabledLevels;

		window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
			// TODO test
			if ('error' in enabledLevels) {
				handler({});
			}
		});
	}
}
