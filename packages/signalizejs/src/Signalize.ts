import AsyncFunctionPlugin from './plugins/AsyncFunction';
import BindPlugin from './plugins/bind';
import DispatchPlugin from './plugins/dispatch'
import DomReadyPlugin from './plugins/domReady';
import MergePlugin from './plugins/merge';
import ObservePlugin from './plugins/mutation-observer';
import OnPlugin from './plugins/on';
import OffPlugin from './plugins/off';
import RefPlugin from './plugins/ref';
import ScopePlugin from './plugins/scope';
import SelectPlugin from './plugins/select';
import SignalPlugin from './plugins/signal';
import TaskPlugin from './plugins/task';

export * from './plugins/AsyncFunction';
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
export * from './plugins/task'

declare global {
	interface Window {
		Signalize: Signalize
	}
}

export type Plugin<O> = (signalize: Signalize, options?: O) => void;

export interface SignalizeConfig extends Record<string, any> {
	root: HTMLElement | Document | DocumentFragment
	exposeSignalize: boolean
	attributesPrefix: string
}

export type SignalizeGlobals = Record<string, any>

export interface SignalizeOptions {
	config?: SignalizeConfig
	globals?: SignalizeGlobals
}

export class Signalize {
	config: SignalizeConfig = {
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

	#init = (options?: Partial<SignalizeOptions>): void => {
		this.use(MergePlugin);

		this.globals = this.merge(this.globals, options?.globals ?? {});
		this.config = this.merge(this.config, options?.config ?? {}) as SignalizeConfig;

		this.use(AsyncFunctionPlugin);
		this.use(TaskPlugin)
		this.use(DomReadyPlugin);
		this.use(SelectPlugin);
		this.use(DispatchPlugin);
		this.use(OnPlugin);
		this.use(OffPlugin);
		this.use(SignalPlugin);
		this.use(ScopePlugin);
		this.use(ObservePlugin);
		this.use(BindPlugin);
		this.use(RefPlugin);

		this.on('dom:ready', () => {
			this.observeMutations(this.config.root);
		})
	}
}

export default Signalize;
