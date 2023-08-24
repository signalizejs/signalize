// With dependencies
import DomReadyPlugin from './core/domReady';
import NormalizeTargetsPlugin from './core/normalizeTargets';
import ObservePlugin from './core/observe';
import BindPlugin from './core/bind';
import DirectivePlugin from './core/directives';
import OnPlugin from './core/on';
import OfPlugin from './core/off';
import RefPlugin from './core/ref';
import ScopePlugin from './core/scope';
import SelectPlugin from './core/select';
// Without dependencies or stateless
import AsyncFunction from './core/AsyncFunction'
import dispatch from './core/dispatch'
import html from './core/html'
import isJson from './core/isJson'
import mergeObjects from './core/mergeObjects'
import { Signal, signal } from './core/signal'

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
		this.config = mergeObjects(this.config, config ?? {});

		this.use(DomReadyPlugin);
		this.use(NormalizeTargetsPlugin);
		this.use(OnPlugin);
		this.use(ScopePlugin);

		this.use(ObservePlugin);
		this.use(BindPlugin);
		this.use(DirectivePlugin);
		this.use(OfPlugin);
		this.use(RefPlugin);
		this.use(RefPlugin);
		this.use(ScopePlugin);
		this.use(SelectPlugin);

		this.observe(this.config.root);
	}

	use<O extends Record<string, any>>(plugin: Plugin<O>, options?: O): void {
		plugin(this, options);
	}

	AsyncFunction = AsyncFunction;
	Signal = Signal;
	dispatch = dispatch;
	isJson = isJson;
	html = html;
	mergeObjects = mergeObjects;
	signal = signal
}

export default Signalize;
