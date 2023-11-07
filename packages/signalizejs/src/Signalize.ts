import bind from './plugins/bind';
import dispatch from './plugins/dispatch'
import domReady from './plugins/domReady';
import height from './plugins/height';
import intersectionObserver from './plugins/intersection-observer';
import isInViewport from './plugins/is-in-viewport';
import isVisible from './plugins/is-visible';
import merge from './plugins/merge';
import mutationsObserver from './plugins/mutation-observer';
import off from './plugins/off';
import offset from './plugins/offset';
import on from './plugins/on';
import scope from './plugins/scope';
import select from './plugins/select';
import signal from './plugins/signal';
import task from './plugins/task';
import width from './plugins/width';

export * from './plugins/bind';
export * from './plugins/dispatch'
export * from './plugins/domReady';
export * from './plugins/height';
export * from './plugins/intersection-observer';
export * from './plugins/is-in-viewport';
export * from './plugins/is-visible';
export * from './plugins/merge';
export * from './plugins/mutation-observer';
export * from './plugins/off';
export * from './plugins/offset';
export * from './plugins/on';
export * from './plugins/scope';
export * from './plugins/select';
export * from './plugins/signal';
export * from './plugins/task';
export * from './plugins/width';

export type SignalizeGlobals = Record<string, any>

export interface SignalizeOptions {
	root: Element | Document
	attributeSeparator: string
	attributePrefix: string
	globals?: SignalizeGlobals
	plugins?: SignalizePlugin
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

		task(this);
		height(this);
		width(this);
		select(this);
		dispatch(this);
		offset(this);
		isVisible(this);
		isInViewport(this);
		on(this);
		domReady(this);
		off(this);
		signal(this);
		intersectionObserver(this);
		scope(this);
		bind(this);
		mutationsObserver(this);

		for (const plugin of options?.plugins ?? []) {
			plugin(this);
		}

		this.on('dom:ready', () => {
			this.observeMutations(this.root);
		});
	}
}

export default Signalize;
