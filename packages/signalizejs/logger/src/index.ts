import type { Signalize, SignalizePlugin, CustomEventListener } from 'signalizejs';
import type { FetchReturn } from 'signalizejs/fetch';

declare module '..' {

	interface CustomEventListeners {
		'logger:log': CustomEventListener
		'logger:warn': CustomEventListener
		'logger:error': CustomEventListener
		'logger:info': CustomEventListener
	}
}

interface Log {
	type: Levels
	message: string
	file?: string | null
	lineNumber?: number
	columnNumber?: number
	stack?: string | null
}

type Levels = 'log' | 'info' | 'warn' | 'error';

export interface PluginOptions {
	levels?: Levels[]
	url: string
}

export default (pluginOptions: PluginOptions): SignalizePlugin => {
	return ($: Signalize) => {
		const enabledLevels: Levels[] = pluginOptions?.levels ?? ['error'];

		const handler = (log: Log): void => {
			const body = { log, url: window.location.href };
			const logStopped = $.dispatch(`logger:${log.type}`, body) === false
			if (!logStopped) {
				void $.fetch(pluginOptions.url, { body });
			}
		}

		for (const level of enabledLevels) {
			const originalCall = console[level];
			console[level] = (...args: any[]): void => {
				handler({ type: 'error', message: args.join(',') })
				originalCall(...args);
			}
		}

		if ('error' in enabledLevels) {
			window.onerror = (message: Event | string, file?: string, lineNumber?: number, columnNumber?: number, error?: Error) => {
				if (message === 'Script error.') {
					// https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
					return;
				}

				handler({
					type: 'error',
					message: message instanceof Event ? message.type : message,
					file: file ?? null,
					lineNumber: lineNumber ?? 0,
					columnNumber: columnNumber ?? 0,
					stack: error?.stack === undefined ? null : error.stack
				})

				console.error(message, file, lineNumber, columnNumber, error);
			}

			window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
				handler({ type: 'error', message: event.reason });
			});
		}
	}
}
