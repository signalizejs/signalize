/**
 * Represents a log entry with information about the log type, message, and optional details.
 *
 * @typedef {Object} Log
 * @property {Levels} type - The type of log entry (log, info, warn, error).
 * @property {string} message - The log message.
 * @property {string | null} [file] - The file associated with the log entry (optional).
 * @property {number | undefined} [lineNumber] - The line number associated with the log entry (optional).
 * @property {number | undefined} [columnNumber] - The column number associated with the log entry (optional).
 * @property {string | null} [stack] - The stack trace associated with the log entry (optional).
 */

/**
 * Represents different levels of log entries (log, info, warn, error).
 *
 * @typedef {('log' | 'info' | 'warn' | 'error')} Levels
 */

/**
 * Options for configuring a plugin.
 *
 * @typedef PluginOptions
 * @property {Levels[]} [levels] - An array of log levels (optional).
 * @property {string} url - The URL associated with the plugin.
 */

/** @type {import('../Signalize').SignalizeModule} */
export default async ({ resolve}, options) => {
	const { ajax, dispatch } = await resolve('ajax', 'event');

	/** @type {Levels[]} */
	const enabledLevels = options?.levels ?? ['error'];

	/**
	 * @param {Log} log - The log information
	 * @returns {void}
	 */
	const handler = (log) => {
		const body = { log, url: window.location.href };
		const logStopped = !dispatch(`logger:${log.type}`, body);
		if (!logStopped) {
			void ajax(options.url, { body });
		}
	};

	for (const level of enabledLevels) {
		const originalCall = console[level];
		/**
		 * @param  {...any} args
		 * @returns {void}
		 */
		console[level] = (...args) => {
			handler({ type: 'error', message: args.join(',') });
			originalCall(...args);
		};
	}

	if ('error' in enabledLevels) {
		/**
		 * Global error handler function invoked when an unhandled error occurs.
		 *
		 * @function
		 * @param {Event | string} message - The error message or event object.
		 * @param {string} [file] - The file associated with the error (optional).
		 * @param {number} [lineNumber] - The line number associated with the error (optional).
		 * @param {number} [columnNumber] - The column number associated with the error (optional).
		 * @param {Error} [error] - The Error object representing the error (optional).
		 * @returns {void}
		 */
		window.onerror = (message, file, lineNumber, columnNumber, error) => {
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
			});

			console.error(message, file, lineNumber, columnNumber, error);
		};

		/**
		 * Event listener for handling unhandled promise rejections.
		 *
		 * @function
		 * @param {PromiseRejectionEvent} event - The event object representing the unhandled promise rejection.
		 * @returns {void}
		 */
		window.addEventListener('unhandledrejection', (event) => {
			handler({ type: 'error', message: event.reason });
		});
	}
};
