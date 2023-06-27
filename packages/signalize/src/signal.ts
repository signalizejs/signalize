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

/* export class Signal<T> {
	protected readonly _watchers = {
		beforeSet: new Set<BeforeSetSignalWatcher<T>>(),
		afterSet: new Set<AfterSetSignalWatcher<T>>()
	}

	protected _value: T | undefined;

	constructor (defaultValue: T) {
		this._value = defaultValue;
	}

	public get (): T | undefined {
		return this._value;
	}

	public set (newValue: T, options?: SignalOptions): void {
		const oldValue = this._value;

		if (newValue === oldValue && (options?.equals ?? true)) {
			return;
		}

		let settable = true;

		for (const watcher of this._watchers.beforeSet) {
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

		this._value = newValue;

		for (const watcher of this._watchers.afterSet) {
			watcher({ newValue, oldValue });
		}
	}

	public watch (
		listener: BeforeSetSignalWatcher<T> | AfterSetSignalWatcher<T>,
		options: SignalWatcherOptions = {}
	): CallableFunction {
		const immediate = options.immediate ?? false;
		const execution = options.execution ?? 'afterSet';

		if (immediate) {
			const watcherData = listener({ newValue: this._value });

			if (typeof watcherData !== 'undefined' && execution === 'beforeSet' && (watcherData.settable ?? true)) {
				this._value = watcherData.value;
			}
		}

		this._watchers[execution].add(listener as any);

		return () => this._watchers[execution].delete(listener as any);
	}

	public toString (): string {
		return String(this.get());
	}

	public toJSON (): T | undefined {
		return this.get();
	}

	public valueOf (): T | undefined {
		return this.get();
	}
}

export const signal = <T>(defaultValue: T): Signal<T> => new Signal(defaultValue);
*/

export const signal = <T>(defaultValue: T) => {
	let value: T = defaultValue;

	const watchers = {
		beforeSet: new Set(),
		afterSet: new Set()
	};

	const set = (newValue, options) => {
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

	const watch = (listener, options = {}) => {
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

	const toString = (): string => String(value);

	const toJSON = (): T => value;

	const valueOf = (): T => value;

	function Signal (): T {
		return value;
	}

	Signal.set = set;
	Signal.watch = watch;
	Signal.toString = toString;
	Signal.valueOf = valueOf;
	Signal.toJSON = toJSON;

	return Signal;
}
