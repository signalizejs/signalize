import AsyncFunctionPlugin from './plugins/AsyncFunction';
import BindPlugin from './plugins/bind';
import CallableClassPlugin from './plugins/CallableClass';
import DirectivePlugin from './plugins/directives';
import DispatchPlugin from './plugins/dispatch'
import DomReadyPlugin from './plugins/domReady';
import IsJsonPlugin from './plugins/isJson';
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

declare global {
	interface Window {
		Signalize: Signalize
	}
}

export type Plugin<O> = (signalize: Signalize, options?: O) => void;

export interface Config extends Record<string, any> {
	root: HTMLElement | Document | DocumentFragment
	exposeSignalize: boolean
	typeBasedSignals: boolean
	attributesPrefix: string
	directivesSeparator: string
}

export class Signalize {
	config: Config = {
		root: document,
		exposeSignalize: true,
		typeBasedSignals: true,
		attributesPrefix: '',
		directivesSeparator: ':'
	}

	constructor (config?: Partial<Config>) {
		this.use(MergePlugin);
		this.config = this.merge(this.config, config ?? {}) as Config;

		this.use(AsyncFunctionPlugin);
		this.use(CallableClassPlugin);
		this.use(IsJsonPlugin);
		this.use(ParseHtmlPlugin);
		this.use(DomReadyPlugin);
		this.use(NormalizeTargetsPlugin);
		this.use(DispatchPlugin);
		this.use(OnPlugin);
		this.use(SignalPlugin);
		this.use(ScopePlugin);
		this.use(ObservePlugin);
		this.use(BindPlugin);
		this.use(DirectivePlugin);
		this.use(OfPlugin);
		this.use(RefPlugin);
		this.use(RefPlugin);
		this.use(ScopePlugin);
		this.use(SelectPlugin);
		this.use(ParseHtmlPlugin);

		this.observe(this.config.root);
	}

	use<O = Record<string, any>>(plugin: Plugin<O>, options?: O): void {
		plugin(this, options);
	}
}

export default Signalize;
