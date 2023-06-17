type SignalWatcher<T> = (options: SignalWatcherArguments<T>) => void;

interface SignalWatcherArguments<T> {
	newValue: T | undefined
	oldValue?: T
}

export class Signal<T> {
	protected readonly _watchers = new Set<SignalWatcher<T>>();
	protected _value: T | undefined;

	constructor (defaultValue: T) {
		this._value = defaultValue;
	}

	public get (): T | undefined {
		return this._value;
	}

	public set (newValue: T): void {
		const oldValue = this._value;

		if (newValue === oldValue) return;

		this._value = newValue;
		for (const watcher of this._watchers) {
			watcher({ newValue, oldValue });
		}
	}

	public watch (listener: SignalWatcher<T>, immediate = false): CallableFunction {
		this._watchers.add(listener);

		if (immediate) {
			listener({ newValue: this._value });
		}

		return () => this._watchers.delete(listener);
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
