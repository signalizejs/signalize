import AsyncFunctionPlugin from './plugins/async-function';
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
import RefPlugin from './plugins/ref';
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

declare global {
	interface Window {
		Signalize: Signalize
	}
}

export type Plugin<O> = (signalize: Signalize, options?: O) => void;

export interface SignalizeConfig extends Record<string, any> {
	root: Element | Document | DocumentFragment
	exposeSignalize: boolean
	attributesPrefix: string
}

export type SignalizeGlobals = Record<string, any>

export interface SignalizeOptions {
	config?: SignalizeConfig
	globals?: SignalizeGlobals
}

export class Signalize {
	config: Partial<SignalizeConfig> = {
		root: document,
		exposeSignalize: true,
		attributesPrefix: ''
	}

	globals: SignalizeGlobals = {};

	constructor (options?: Partial<SignalizeOptions>) {
		this.#init(options);
	}

	use = <O = Record<string, any>>(plugin: Plugin<O>, options?: O): void => {
		plugin(this, options);
	}

	configure = (config: Partial<SignalizeConfig>): void => {
		this.config = this.merge(this.config, config) as SignalizeConfig
	}

	readonly #init = (options?: Partial<SignalizeOptions>): void => {
		this.use(MergePlugin);

		this.globals = this.merge(this.globals, options?.globals ?? {});
		this.config = this.merge(this.config, options?.config ?? {}) as SignalizeConfig;

		this.use(AsyncFunctionPlugin);
		this.use(TaskPlugin)
		this.use(DomReadyPlugin);
		this.use(HeightPlugin);
		this.use(WidthPlugin);
		this.use(SelectPlugin);
		this.use(DispatchPlugin);
		this.use(OffsetPlugin);
		this.use(IsVisiblePlugin);
		this.use(IsInViewportPlugin);
		this.use(OnPlugin);
		this.use(OffPlugin);
		this.use(SignalPlugin);
		this.use(IntersectionObserverPlugin);
		this.use(ScopePlugin);
		this.use(BindPlugin);
		this.use(RefPlugin);
		this.use(MutationsObserverPlugin);

		this.on('dom:ready', () => {
			this.observeMutations(this.config.root);
		})
	}
}

export default Signalize;
