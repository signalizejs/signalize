/** @type {import('../../types/Signalize').Module<import('../../types/modules/signal').SignalModule>} */
export default () => {
	/**
	 * @template T
	 * @type {import('../../types/modules/signal').Signal<T>}
	*/
	class Signal {
		/** @type {T} */
		value;

		/** @type {import('../../types/modules/signal').SignalWatchers} */
		watchers = {
			beforeSet: new Set(),
			afterSet: new Set(),
			onGet: new Set()
		};

		/** @param {T} defaultValue */
		constructor(defaultValue) {
			this.value = defaultValue;

			// In order to make signal callable and to be able to check if created signal is instanceof Signal
			// We have to create this function and bind a protype of the Signal to it
			const callable = (...args) => {
				if (args.length === 1) {
					this.#set(args[0]);
					return this.value;
				}
				return this.#get();
			};

			Object.setPrototypeOf(callable, this);

			return callable;
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

			for (const watcher of this.watchers.afterSet) {
				watcher({ newValue, oldValue });
			}
		};

		/** @type {import('../../types/modules/signal').SetSignalWatcher<T>} */
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

	/** @type {import('../../types/modules/signal').signal} */
	const signal = (defaultValue) => new Signal(defaultValue);

	return { signal, Signal };
};
