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
	value: T;
	watchers: Record<SignalWatcherExecutionOption, Set<CallableFunction>> = {
		beforeSet: new Set(),
		afterSet: new Set(),
		onGet: new Set()
	};

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
			setTimeout(() => watcher({ newValue, oldValue }), 0)
		}
	}

	watch = (listener: BeforeSetSignalWatcher<T> | AfterSetSignalWatcher<T>, options: SignalWatcherOptions = {}) => {
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

export default (signalize: Signalize): void => {
	signalize.Signal = Signal;
	signalize.signal = <T>(defaultValue: T): Signal<T> => new Signal(defaultValue);
}
