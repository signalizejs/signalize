type SignalWatcher<T> = (options: SignalWatcherArguments<T>) => void;

interface SignalWatcherArguments<T> {
	newValue: T | undefined
	oldValue?: T
	initializer?: string
}

interface SignalArguments<T> {
	defaultValue?: T | undefined
	globalName?: string
	globallySettable?: boolean
	equals?: boolean
}

export const definedSignals: Record<string, Signal<any>> = {};

export class Signal<T> {
	private readonly _watchers = new Set<SignalWatcher<T>>();
	private _value: T | undefined;

	constructor ({ defaultValue, globalName, globallySettable }: SignalArguments<T> = { }) {
		this._value = defaultValue

		if (globalName !== undefined) {
			if (globalName in definedSignals) {
				throw new Error(`Global signal "${globalName}" already defined.`);
			}
			const globalSignal = signal<T>(defaultValue);
			const originalSet = globalSignal.set;
			globalSignal.set = (newValue: T, initializer?: string) => {
				if (globallySettable ?? false) {
					throw new Error(`Global signal "${globalName}" is not writable.`);
				}
				originalSet(newValue, initializer);
			};
			definedSignals[globalName] = globalSignal;
		}
	}

	public get (): T | undefined {
		return this._value;
	}

	public set (newValue: T, initializer?: string): void {
		const oldValue = this._value;

		if (newValue === oldValue) return;

		this._value = newValue;
		for (const watcher of this._watchers) {
			watcher({ newValue, oldValue, initializer });
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

export const signal = <T>(defaultValue: T | undefined, options = {}): Signal<T> => new Signal<T>({
	defaultValue,
	...options
});
