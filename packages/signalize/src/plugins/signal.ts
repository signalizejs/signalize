import type Signalize from '..';

declare module '..' {
	interface Signalize {
		Signal: Signal
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

class Signal<T = any> extends Function {
	constructor (defaultValue: T) {
		super()

		let value: T = defaultValue;

		const watchers: Record<SignalWatcherExecutionOption, Set<CallableFunction>> = {
			beforeSet: new Set(),
			afterSet: new Set(),
			onGet: new Set()
		};

		const get = (): T => {
			for (const watcher of watchers.onGet) {
				watcher({ newValue: value, oldValue: value });
			}

			return value;
		}

		this.set = (newValue: T): void => {
			const oldValue = value;

			if (['string', 'number'].includes(typeof newValue) && newValue === oldValue) {
				return;
			}

			let settable = true;
			for (const watcher of watchers.beforeSet) {
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

			value = newValue;

			for (const watcher of watchers.afterSet) {
				setTimeout(() => watcher({ newValue, oldValue }), 0)
			}
		}

		this.watch = (listener: BeforeSetSignalWatcher<T> | AfterSetSignalWatcher<T>, options: SignalWatcherOptions = {}) => {
			const immediate = options.immediate ?? false;
			const execution = options.execution ?? 'afterSet';

			if (immediate) {
				const watcherData = listener({ newValue: value });
				if (typeof watcherData !== 'undefined' && execution === 'beforeSet' && (watcherData.settable ?? true)) {
					value = watcherData.value;
				}
			}

			watchers[execution].add(listener);
			return () => {
				watchers[execution].delete(listener);
			}
		}

		this.toString = (): string => String(get());
		this.toJSON = get;
		this.valueOf = get;

		return new Proxy(this, {
			apply: get
		})
	}
}

export default (signalize: Signalize): void => {
	signalize.Signal = Signal;
	signalize.signal = <T>(defaultValue: T): Signal<T> => new Signal(defaultValue);
}
