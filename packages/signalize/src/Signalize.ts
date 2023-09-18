import AsyncFunctionPlugin from './plugins/AsyncFunction';
import BindPlugin from './plugins/bind';
import CallableClassPlugin from './plugins/CallableClass';
import DirectivePlugin from './plugins/directives';
import DispatchPlugin from './plugins/dispatch'
import DomReadyPlugin from './plugins/domReady';
import MergePlugin from './plugins/merge';
import NormalizeTargetsPlugin from './plugins/normalizeTargets';
import ObservePlugin from './plugins/observe';
import OnPlugin from './plugins/on';
import OfPlugin from './plugins/off';
import ParseHtmlPlugin from './plugins/parseHTML'
import RefPlugin from './plugins/ref';
import ScopePlugin from './plugins/scope';
import SelectPlugin from './plugins/select';
import SignalPlugin from './plugins/signal';

export * from './plugins/AsyncFunction';
export * from './plugins/bind';
export * from './plugins/CallableClass';
export * from './plugins/directives';
export * from './plugins/dispatch'
export * from './plugins/domReady';
export * from './plugins/merge';
export * from './plugins/normalizeTargets';
export * from './plugins/observe';
export * from './plugins/on';
export * from './plugins/off';
export * from './plugins/parseHTML'
export * from './plugins/ref';
export * from './plugins/scope';
export * from './plugins/select';
export * from './plugins/signal';

declare global {
	interface Window {
		Signalize: Signalize
	}
}

export type Plugin<O> = (signalize: Signalize, options?: O) => void;

export interface SignalizeConfig extends Record<string, any> {
	root: HTMLElement | Document | DocumentFragment
	exposeSignalize: boolean
	typeBasedSignals: boolean
	attributesPrefix: string
	directivesSeparator: string
}

export class Signalize {
	config: SignalizeConfig = {
		root: document,
		exposeSignalize: true,
		typeBasedSignals: true,
		attributesPrefix: '',
		directivesSeparator: ':'
	}

	constructor (config?: Partial<SignalizeConfig>) {
		this.use(MergePlugin);
		this.config = this.merge(this.config, config ?? {}) as SignalizeConfig;

		this.use(AsyncFunctionPlugin);
		this.use(CallableClassPlugin);
		this.use(ParseHtmlPlugin);
		this.use(NormalizeTargetsPlugin);
		this.use(DomReadyPlugin);
		this.use(SelectPlugin);
		this.use(DispatchPlugin);
		this.use(OnPlugin);
		this.use(SignalPlugin);
		this.use(ScopePlugin);
		this.use(ObservePlugin);
		this.use(BindPlugin);
		this.use(OfPlugin);
		this.use(RefPlugin);
		this.use(DirectivePlugin);

		this.observe(this.config.root);
	}

	use<O = Record<string, any>>(plugin: Plugin<O>, options?: O): void {
		plugin(this, options);
	}
}

export default Signalize;
