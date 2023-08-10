type BeforeSetSignalWatcher<T> = (options: SignalWatcherArguments<T>) => { value: T, settable?: boolean } | undefined
type AfterSetSignalWatcher<T> = (options: SignalWatcherArguments<T>) => void;

type SignalWatcherExecutionOption = 'beforeSet' | 'afterSet'

interface SignalWatcherOptions {
	immediate?: boolean
	execution?: SignalWatcherExecutionOption
}

interface SignalWatcherArguments<T> {
	newValue: T | undefined
	oldValue?: T
}

interface SignalOptions {
	equals: boolean
}

interface SignalInstance<T> {
	(): T
	set: (newValue: T, options?: SignalOptions) => void
	watch: (
		listener: BeforeSetSignalWatcher<T> | AfterSetSignalWatcher<T>,
		options?: SignalWatcherOptions
	) => () => void
	toString: () => string
	toJSON: () => T
	valueOf: () => T
}

export const $signals = {};

export function Signal<T> (this: SignalInstance<T>, defaultValue: T): (() => T) {
	let value: T = defaultValue;

	const watchers = {
		beforeSet: new Set(),
		afterSet: new Set()
	};

	function signal() {
		return value;
	}

	signal.set = (newValue: T, options?: SignalOptions): void => {
		const oldValue = value;
		if (newValue === oldValue && (options?.equals ?? true)) {
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
			watcher({ newValue, oldValue });
		}
	}

	signal.watch = (listener: BeforeSetSignalWatcher<T> | AfterSetSignalWatcher<T>, options: SignalWatcherOptions = {}) => {
		const immediate = options.immediate ?? false;
		const execution = options.execution ?? 'afterSet';

		if (immediate) {
			const watcherData = listener({ newValue: value });
			if (typeof watcherData !== 'undefined' && execution === 'beforeSet' && (watcherData.settable ?? true)) {
				value = watcherData.value;
			}
		}

		watchers[execution].add(listener);
		return () => watchers[execution].delete(listener);
	}

	signal.toString = (): string => String(value);

	signal.toJSON = (): T => value;

	signal.valueOf = (): T => value;

	return signal
}

export const signal = <T>(defaultValue: T): SignalInstance<T> => new (Signal as any)(defaultValue);
