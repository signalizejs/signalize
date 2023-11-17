import bind from './plugins/bind';
import dispatch from './plugins/dispatch'
import domReady from './plugins/domReady';
import merge from './plugins/merge';
import mutationsObserver from './plugins/mutation-observer';
import off from './plugins/off';
import on from './plugins/on';
import type { CustomEventListener } from './plugins/on';
import scope from './plugins/scope';
import select from './plugins/select';
import signal from './plugins/signal';
import task from './plugins/task';
import traverseDom from './plugins/traverse-dom';

export * from './plugins/bind';
export * from './plugins/dispatch'
export * from './plugins/domReady';
export * from './plugins/merge';
export * from './plugins/mutation-observer';
export * from './plugins/off';
export * from './plugins/on';
export * from './plugins/scope';
export * from './plugins/select';
export * from './plugins/signal';
export * from './plugins/task';
export * from './plugins/traverse-dom';

export type SignalizeGlobals = Record<string, any>

declare module '.' {

	interface CustomEventListeners {
		'signalize:ready': CustomEventListener
	}
}

export interface SignalizeOptions {
	root: Element | Document
	attributeSeparator: string
	attributePrefix: string
	globals?: SignalizeGlobals
	plugins?: SignalizePlugin[]
}

export type SignalizePlugin = (signalize: Signalize) => void

export class Signalize {
	root!: Element | Document;
	attributeSeparator!: string;
	attributePrefix!: string;
	globals: SignalizeGlobals = {};

	constructor (options: Partial<SignalizeOptions> = {}) {
		this.#init(options);
	}

	use = (plugin: SignalizePlugin): void => {
		plugin(this)
	}

	readonly #init = (options: Partial<SignalizeOptions>): void => {
		this.root = options?.root ?? document;
		this.attributePrefix = options?.attributePrefix ?? '';
		this.attributeSeparator = options?.attributeSeparator ?? '';

		merge(this);

		this.globals = this.merge(this.globals, options?.globals ?? {});
		const readyListeners: CallableFunction[] = [];
		task(this);
		select(this);
		dispatch(this);
		on(this);
		this.customEventListener('signalize:ready',  ({ listener }) => {
			readyListeners.push(listener);
		});
		domReady(this);
		mutationsObserver(this);
		traverseDom(this);
		scope(this);
		signal(this);
		off(this);
		bind(this);

		for (const plugin of options?.plugins ?? []) {
			plugin(this);
		}

		while(readyListeners.length > 0) {
			readyListeners.shift()();
		}

		this.on('dom:ready', () => {
			this.observeMutations(this.root);
		});
	}
}

export default Signalize;
