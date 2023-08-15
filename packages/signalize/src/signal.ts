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

	const watchers: Record<SignalWatcherExecutionOption, Set<CallableFunction>> = {
		beforeSet: new Set(),
		afterSet: new Set(),
		onGet: new Set()
	};

	const get = () => {
		for (const watcher of watchers.onGet) {
			watcher({ newValue: value, oldValue: value });
		}

		return value;
	}

	function signal() {
		return get();
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

	signal.toString = (): string => String(get());

	signal.toJSON = (): T => get();

	signal.valueOf = (): T => get();

	return signal
}

export const signal = <T>(defaultValue: T): SignalInstance<T> => new (Signal as any)(defaultValue);
