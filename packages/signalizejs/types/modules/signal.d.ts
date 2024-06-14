/** Callback for modifying value before setting watcher */
export type BeforeSetSignalWatcher<T> = (options: SignalWatcherArguments<T>) => {
	value: T;
	settable?: boolean
} | undefined;

/** Callback for actions after setting watcher */
export type AfterSetSignalWatcher<T> = (options: SignalWatcherArguments<T>) => void;

export type OnGetSignalWatcher<T> = (options: SignalWatcherArguments<T>) => void;

/** Available execution options for the watcher  */
export type SignalWatcherExecutionOption = 'beforeSet' | 'afterSet' | 'onGet';

/** Options for configuring a signal watcher */
export interface SignalWatcherOptions {
	/** If true, watcher is executed immediately */
	immediate?: boolean;
	/** Execution mode. */
	execution?: SignalWatcherExecutionOption;
}

/** Arguments passed to signal watcher function */
export interface SignalWatcherArguments<T> {
	/** New value */
	newValue?: T; // New value being set
	/** Previously setted value */
	oldValue?: T;
}

/** Function to stop watching a signal  */
export type SignalUnwatch = () => void;

/** Collection of categorized signal watcher functions */
export interface SignalWatchers {
	beforeSet: Set<CallableFunction>;
	afterSet: Set<CallableFunction>;
	onGet: Set<CallableFunction>;
}

export type SetSignalWatcher<T> = (listener: BeforeSetSignalWatcher<T> | AfterSetSignalWatcher<T> | OnGetSignalWatcher<T>, options?: SignalWatcherOptions) => SignalUnwatch;

/** Represents a signal with a specific value and associated watchers. */
export declare class Signal<T> {
	constructor(value: T);
	value: T;
	watchers: SignalWatchers;
	/** Adds a watcher function to the signal. */
	watch: SetSignalWatcher<any>;
	toString: () => string;
	valueOf: () => T;
	toJSON: () => T;
}

/** Creates a new Signal instance with the provided default value. */
export type signal = <T>(defaultValue: T) => Signal<T>;
