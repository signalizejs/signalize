/* declare module '..' {
	interface Signalize {
		Signal: Signal<any>
		signal: <T>(defaultValue: T) => Signal<T>
	}
} */

/**
 * Represents a function to be called before setting a signal watcher.
 *
 * @typedef {(options: SignalWatcherArguments<T>) => { value: T, settable?: boolean } | undefined} BeforeSetSignalWatcher
 * @template T
 */

/**
 * Represents a function to be called after setting a signal watcher.
 *
 * @typedef {(options: SignalWatcherArguments<T>) => void | Promise<void>} AfterSetSignalWatcher
 * @template T
 */

/**
 * Represents the available execution options for a signal watcher.
 *
 * @typedef {'beforeSet' | 'afterSet' | 'onGet'} SignalWatcherExecutionOption
 */

/**
 * Represents options for configuring a signal watcher.
 *
 * @typedef {Object} SignalWatcherOptions
 * @property {boolean} [immediate] - Whether the signal watcher should execute immediately.
 * @property {SignalWatcherExecutionOption} [execution] - The execution option for the signal watcher.
 */

/**
 * Represents the arguments passed to a signal watcher function.
 *
 * @typedef {Object} SignalWatcherArguments
 * @property {T | undefined} newValue - The new value being set.
 * @property {T | undefined} [oldValue] - The previous value.
 * @template T
 */

/**
 * Represents the function to stop watching a signal.
 *
 * @typedef {() => void} SignalUnwatch
 */

/**
 * Represents a collection of signal watcher functions categorized by their execution option.
 *
 * @typedef {Object} SignalWatchers
 * @property {Set<CallableFunction>} beforeSet - Set of functions to be called before setting a signal watcher.
 * @property {Set<CallableFunction>} afterSet - Set of functions to be called after setting a signal watcher.
 * @property {Set<CallableFunction>} onGet - Set of functions to be called when getting a signal.
 */

/**
 * Represents a signal with a specific value and associated watchers.
 *
 * @interface Signal
 * @template T
 * @property {T} value - The current value of the signal.
 * @property {SignalWatchers} watchers - Collection of watchers associated with the signal.
 * @property {(listener: BeforeSetSignalWatcher<T> | AfterSetSignalWatcher<T>, options?: SignalWatcherOptions) => SignalUnwatch} watch - Adds a watcher function to the signal.
 * @property {() => string} toString - Converts the signal to a string.
 * @property {() => T} valueOf - Returns the underlying value of the signal.
 * @property {() => T} toJSON - Converts the signal to a JSON-compatible representation.
 */

export default () => {
	/**
	 * Represents a Signal class extending the Function class.
	 *
	 * @class
	 * @extends {Function}
	 * @template T
	 */
	class Signal extends Function {
		/** @type {T} */
		value;

		/** @type {SignalWatchers} */
		watchers = {
			beforeSet: new Set(),
			afterSet: new Set(),
			onGet: new Set()
		};

		/** @type {number} */
		#setWatchersTimeout;

		/**
		 * @constructor
		 * @param {T} defaultValue
		 * @returns {void}
		 */
		constructor(defaultValue) {
			super();
			this.value = defaultValue;
			return new Proxy(this, {
				apply: (target, thisArg, args) => {
					if (args.length === 1) {
						this.#set(args[0]);
						return this.value;
					}
					return this.#get();
				}
			});
		}

		/**
		 * @returns {T}
		 */
		#get = () => {
			for (const watcher of this.watchers.onGet) {
				watcher({ newValue: this.value, oldValue: this.value });
			}

			return this.value;
		};

		/**
		 * @param {T} newValue
		 * @returns {void}
		 */
		#set = (newValue) => {
			const oldValue = this.value;

			let settable = true;

			for (const watcher of this.watchers.beforeSet) {
				const watcherData = watcher({ newValue, oldValue });
				if (typeof watcherData !== 'undefined') {
					settable = watcherData.settable ?? settable;
					newValue = watcherData.value ?? newValue;
				}

				if (!settable) {
					break;
				}
			}

			if (!settable) {
				return;
			}

			this.value = newValue;

			clearTimeout(this.#setWatchersTimeout);
			this.#setWatchersTimeout = setTimeout(() => {
				for (const watcher of this.watchers.afterSet) {
					watcher({ newValue, oldValue });
				}
			});
		};

		/**
		 * Adds a watcher function to the signal.
		 *
		 * @function
		 * @param {BeforeSetSignalWatcher<T> | AfterSetSignalWatcher<T>} listener - The watcher function to be added.
		 * @param {SignalWatcherOptions} [options={}] - Options for configuring the signal watcher.
		 * @returns {SignalUnwatch} A function to stop watching the signal.
		 */
		watch = (listener, options = {}) => {
			const execution = options.execution ?? 'afterSet';

			if (options.immediate ?? false) {
				const watcherData = listener({ newValue: this.value });
				if (typeof watcherData !== 'undefined' && execution === 'beforeSet' && (watcherData.settable ?? true)) {
					this.value = watcherData.value;
				}
			}

			this.watchers[execution].add(listener);

			return () => {
				this.watchers[execution].delete(listener);
			};
		};

		/**
		 * @returns {string}
		 */
		toString = () => String(this.#get());

		/**
		 * @returns {T}
		 */
		toJSON = () => this.#get();

		/**
		 * @returns { T}
		 */
		valueOf = () => this.#get();
	}

	/**
	 * Creates a new Signal instance with the provided default value.
	 *
	 * @function
	 * @template T
	 * @param {T} defaultValue - The default value for the signal.
	 * @returns {Signal<T>} A new Signal instance initialized with the default value.
	 */
	const signal = (defaultValue) => new Signal(defaultValue);

	return { signal, Signal };
};
