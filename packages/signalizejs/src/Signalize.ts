import BindPlugin from './plugins/bind';
import DispatchPlugin from './plugins/dispatch'
import DomReadyPlugin from './plugins/domReady';
import HeightPlugin from './plugins/height';
import IntersectionObserverPlugin from './plugins/intersection-observer';
import IsInViewportPlugin from './plugins/is-in-viewport';
import IsVisiblePlugin from './plugins/is-visible';
import MergePlugin from './plugins/merge';
import MutationsObserverPlugin from './plugins/mutation-observer';
import OffPlugin from './plugins/off';
import OffsetPlugin from './plugins/offset';
import OnPlugin from './plugins/on';
import ScopePlugin from './plugins/scope';
import SelectPlugin from './plugins/select';
import SignalPlugin from './plugins/signal';
import TaskPlugin from './plugins/task';
import WidthPlugin from './plugins/width';

/* export * from './plugins/async-function';
export * from './plugins/bind';
export * from './plugins/dispatch'
export * from './plugins/domReady';
export * from './plugins/merge';
export * from './plugins/mutation-observer';
export * from './plugins/on';
export * from './plugins/off';
export * from './plugins/ref';
export * from './plugins/scope';
export * from './plugins/select';
export * from './plugins/signal';
export * from './plugins/task' */

export interface SignalizeConfig extends Record<string, any> {
	root: Element | Document | DocumentFragment
	attributeSeparator: string
	attributePrefix: string
}

export type SignalizeGlobals = Record<string, any>

export interface SignalizeOptions {
	config?: SignalizeConfig
	globals?: SignalizeGlobals
	plugins?: SignalizePlugin
}

export type SignalizePlugin = (signalize: Signalize) => void

export class Signalize {
	config: Partial<SignalizeConfig> = {
		root: document,
		attributeSeparator: '-',
		attributePrefix: '',
		customEventListeners: {}
	}

	globals: SignalizeGlobals = {};

	constructor (options?: Partial<SignalizeOptions>) {
		this.#init(options);
	}

	readonly #init = (options?: Partial<SignalizeOptions>): void => {
		const readyListeners: CallableFunction = [];

		this.config.customEventListeners['signalize:ready'] = (target: HTMLElement | string, listener: CallableFunction, options: AddEventListenerOptions) => {
			readyListeners.push(listener);
		}

		MergePlugin(this);
		TaskPlugin(this);
		HeightPlugin(this);
		WidthPlugin(this);
		SelectPlugin(this);
		DispatchPlugin(this);
		OffsetPlugin(this);
		IsVisiblePlugin(this);
		IsInViewportPlugin(this);
		OnPlugin(this);
		DomReadyPlugin(this);
		OffPlugin(this);
		SignalPlugin(this);
		IntersectionObserverPlugin(this);
		ScopePlugin(this);
		BindPlugin(this);
		MutationsObserverPlugin(this);

		for (const plugin of options?.plugins ?? []) {
			plugin(this);
		}

		this.globals = this.merge(this.globals, options?.globals ?? {});
		this.config = this.merge(this.config, options?.config ?? {}) as SignalizeConfig;

		while(readyListeners.length) {
			readyListeners.shift()(this)
		}

		this.on('dom:ready', () => {
			this.observeMutations(this.config.root);
		});
	}
}

export default Signalize;
