import type Signalize from '..';

declare module '..' {
	interface Signalize {
		Signal: Signal<any>
		signal: <T>(defaultValue: T) => Signal<T>
	}
}

type BeforeSetSignalWatcher<T> = (options: SignalWatcherArguments<T>) => { value: T, settable?: boolean } | undefined
type AfterSetSignalWatcher<T> = (options: SignalWatcherArguments<T>) => void;

type SignalWatcherExecutionOption = 'beforeSet' | 'afterSet' | 'onGet'

interface SignalWatcherOptions {
	immediate?: boolean
	execution?: SignalWatcherExecutionOption
}

interface SignalWatcherArguments<T> {
	newValue: T | undefined
	oldValue?: T
}

type SignalUnwatch = () => void

interface SignalWatchers extends Record<SignalWatcherExecutionOption, Set<CallableFunction>> {
	beforeSet: Set<CallableFunction>
	afterSet: Set<CallableFunction>
	onGet: Set<CallableFunction>
}

export interface Signal<T> {
	value: T
	watchers: SignalWatchers
	get: () => T
	set: (newValue: T) => void
	watch: (listener: BeforeSetSignalWatcher<T> | AfterSetSignalWatcher<T>, options?: SignalWatcherOptions) => SignalUnwatch
	toString: () => string
	valueOf: () => T
	toJSON: () => T

}

export default ($: Signalize): void => {
	class SignalStructure<T = any> extends Function implements Signal<T> {
		value: T;
		watchers: SignalWatchers = {
			beforeSet: new Set(),
			afterSet: new Set(),
			onGet: new Set()
		};

		#setTimeout!: number;

		constructor (defaultValue: T) {
			super()
			this.value = defaultValue;
			return new Proxy(this, {
				apply: () => {
					return this.get()
				}
			})
		}

		get = (): T => {
			for (const watcher of this.watchers.onGet) {
				watcher({ newValue: this.value, oldValue: this.value });
			}

			return this.value;
		}

		set = (newValue: T): void => {
			clearTimeout(this.#setTimeout);
			this.#setTimeout = setTimeout(() => {
				const oldValue = this.value;

				if (['string', 'number'].includes(typeof newValue) && newValue === oldValue) {
					return;
				}

				let settable = true;
				for (const watcher of this.watchers.beforeSet) {
					const watcherData = watcher({ newValue, oldValue });
					if (typeof watcherData !== 'undefined') {
						settable = watcherData.settable ?? settable;
						newValue = watcherData.value;
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
					watcher({ newValue, oldValue })
				}
			});
		}

		watch = (listener: BeforeSetSignalWatcher<T> | AfterSetSignalWatcher<T>, options: SignalWatcherOptions = {}): SignalUnwatch => {
			const immediate = options.immediate ?? false;
			const execution = options.execution ?? 'afterSet';

			if (immediate) {
				const watcherData = listener({ newValue: this.value });
				if (typeof watcherData !== 'undefined' && execution === 'beforeSet' && (watcherData.settable ?? true)) {
					this.value = watcherData.value;
				}
			}

			this.watchers[execution].add(listener);

			return () => {
				this.watchers[execution].delete(listener);
			}
		}

		toString = (): string => {
			return String(this.get())
		}

		toJSON = (): T => {
			return this.get();
		}

		valueOf = (): T => {
			return this.get();
		}
	}

	$.Signal = SignalStructure;
	$.signal = <T>(defaultValue: T): Signal<T> => new SignalStructure(defaultValue);
}
