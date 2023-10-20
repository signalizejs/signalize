import { default as SignalizeCore, SignalizeConfig } from 'signalizejs/core';
import DirectivesPlugin from 'signalizejs/directives';

declare global {
	interface Window {
		Signalize: Signalize
	}
}

export class Signalize extends SignalizeCore {
	constructor (config?: Partial<SignalizeConfig>) {
		super(config)
		this.#init();
	}

	#init (): void {
		this.use(DirectivesPlugin);
	}
}

/*
export class Signalize {
	config: SignalizeConfig = {
		root: document,
		exposeSignalize: true,
		attributesPrefix: '',
		directivesSeparator: '-'
	}

	globals: Record<string, any> = {}

	constructor (config?: Partial<SignalizeConfig>) {
		this.#init(config);
	}

	use<O = Record<string, any>>(plugin: Plugin<O>, options?: O): void {
		plugin(this, options);
	}

	configure = (config: Partial<SignalizeConfig>): void => {
		this.config = this.merge(this.config, config) as SignalizeConfig
	}

	#init (config?: Partial<SignalizeConfig>): void {
		this.use(MergePlugin);

		this.config = this.merge(this.config, config ?? {}) as SignalizeConfig;

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
		this.use(DirectivePlugin);

		this.on('dom:ready', () => {
			this.observeMutations(this.config.root);
		})
	}
}

export default Signalize;
 */
