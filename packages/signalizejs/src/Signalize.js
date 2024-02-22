import bind from './plugins/bind.js';
import dispatch from './plugins/dispatch.js';
import domReady from './plugins/dom-ready.js';
import mutationsObserver from './plugins/mutation-observer.js';
import on from './plugins/on.js';
import component from './plugins/component.js';
import dashCase from './plugins/dash-case.js';
import signal from './plugins/signal.js';
import scope from './plugins/scope.js';

/**
 * Custom event listeners for the Signalize module.
 *
 * @typedef {Object} CustomEventListeners
 * @property {import('./plugins/on.js').CustomEventListener} signalize:ready - Custom event listener for the 'signalize:ready' event.
 */

/**
 * Type representing global settings for Signalize.
 *
 * @typedef {Record<string, any>} SignalizeGlobals
 */

/**
 * Options for configuring Signalize.
 *
 * @typedef {Object} SignalizeOptions
 * @property {Element | Document} root - The root element or document where Signalize will operate.
 * @property {string} attributeSeparator - The separator used in attribute names for component customization.
 * @property {string} attributePrefix - The prefix used in attribute names for component customization.
 * @property {string} componentPrefix - The prefix used in component names for customization.
 * @property {SignalizeGlobals} [globals] - Optional global settings for Signalize.
 * @property {SignalizePlugin[]} [plugins] - Optional array of plugins to be applied to Signalize.
 */

/**
 * @typedef {function} SignalizePlugin
 * @param {Signalize} signalize - The Signalize instance to which the plugin will be applied.
 * @returns {void}
 */
export class Signalize {
	#plugins = new Set();
	/** @type { Element | Document } */
	root;
	/** @type { string } */
	attributeSeparator;
	/** @type { string } */
	attributePrefix;
	/** @type { string } */
	componentPrefix;
	/** @type { SignalizeGlobals } */
	globals;

	/**
	 * @constructor
	 * @param {SignalizeOptions} option
	 */
	constructor (options = {}) {
		this.root = options?.root ?? document;
		const readyListeners = /** *@type {CallableFunction[]} */ [];
		let inited = false;

		/**
		 * Applies an array of Signalize plugins to a Signalize instance.
		 *
		 * @param {Signalize} signalizeInstance - The Signalize instance to which the plugins will be applied.
		 * @param {SignalizePlugin[]} plugins - An array of Signalize plugins to be applied.
		 * @returns {void}
		 */
		const usePlugins = (signalizeInstance, plugins) => {
			for (const plugin of plugins) {
				signalizeInstance.use(plugin);
			}
		};

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
			scope(this);
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
		} else {
			const signalizeInstance = this.root.__signalize;
			signalizeInstance.globals = { ...signalizeInstance.globals, ...options?.globals ?? {} };
			usePlugins(signalizeInstance, options?.plugins ?? []);
		}

		return this.root.__signalize;
	}

	/**
	 * @param {SignalizePlugin} plugin
	 * @returns { void }
	 */
	use = (plugin) => {
		const pluginCacheName = plugin.name.length > 0 ? plugin.name : plugin.toString().replace(/(\s|\n)*/g, '');

		if (this.#plugins.has(pluginCacheName)) {
			return;
		}

		this.#plugins.add(pluginCacheName);
		plugin(this);
	};
}

export default Signalize;
