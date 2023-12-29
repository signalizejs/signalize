import bind from './plugins/bind';
import dispatch from './plugins/dispatch'
import domReady from './plugins/dom-ready';
import mutationsObserver from './plugins/mutation-observer';
import on from './plugins/on';
import type { CustomEventListener } from './plugins/on';
import component from './plugins/component';
import dashCase from './plugins/dash-case';
import select from './plugins/select';
import signal from './plugins/signal';
import vnode from './plugins/vnode';

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
	componentPrefix: string
	globals?: SignalizeGlobals
	plugins?: SignalizePlugin[]
}

export type SignalizePlugin = (signalize: Signalize) => void

export class Signalize {
	#plugins = new Set();
	root!: Element | Document;
	attributeSeparator!: string;
	attributePrefix!: string;
	componentPrefix!: string;
	globals!: SignalizeGlobals;

	constructor (options: Partial<SignalizeOptions> = {}) {
		this.root = options?.root ?? document;
		const readyListeners: CallableFunction[] = [];
		let inited = false;

		const usePlugins = (signalizeInstance: Signalize, plugins: SignalizePlugin[]) => {
			for (const plugin of plugins) {
				signalizeInstance.use(plugin);
			}
		}

		if (this.root?.__signalize === undefined) {
			this.attributePrefix = options?.attributePrefix ?? '';
			this.attributeSeparator = options?.attributeSeparator ?? '-';
			this.componentPrefix = options?.componentPrefix ?? '';
			this.globals = { ...this.globals, ...options?.globals ?? {} };
			dispatch(this);
			on(this);
			this.customEventListener('signalize:ready', ({ listener }) => {
				if (inited) {
					listener(this);
					return;
				}
				readyListeners.push(listener);
			});
			domReady(this);
			select(this);
			vnode(this);
			signal(this);
			bind(this);
			dashCase(this);
			component(this);
			mutationsObserver(this);

			usePlugins(this, options?.plugins ?? []);

			while (readyListeners.length > 0) {
				readyListeners.shift()();
			}

			this.root.__signalize = this;
			inited = true;

			this.observeMutations(this.root, (event, node) => {
				if (!(node instanceof Element)) {
					return;
				}
				this.dispatch(event, node);
			});
		}

		const signalizeInstance = this.root.__signalize;
		signalizeInstance.globals = { ...signalizeInstance.globals, ...options?.globals ?? {} };

		usePlugins(signalizeInstance, options?.plugins ?? []);

		return this.root.__signalize;
	}

	use = (plugin: SignalizePlugin): void => {
		const pluginCacheName = plugin.name.length > 0 ? plugin.name : plugin.toString().replace(/(\s|\n)*/g, '');

		if (this.#plugins.has(pluginCacheName)) {
			return;
		}

		this.#plugins.add(pluginCacheName);
		plugin.call(undefined, this);
	}
}

export default Signalize;
