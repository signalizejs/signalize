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

export class Signal<T> {
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

	public set (newValue: T): void {
		const oldValue = this._value;
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

		if (newValue === oldValue || !settable) {
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

		this._watchers[execution].add(listener as any);

		if (immediate) {
			const watcherData = listener({ newValue: this._value });

			if (typeof watcherData !== 'undefined' && execution === 'beforeSet' && (watcherData.settable ?? true)) {
				this._value = watcherData.value;
			}
		}

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
