/**
 * Custom event listeners for the Signalize module.
 *
 * @typedef {Object} CustomEventListeners
 * @property {import('./modules/on.js').CustomEventListener} signalize:ready - Custom event listener for the 'signalize:ready' event.
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
 * @property {SignalizePlugin[]} [modules] - Optional array of modules to be applied to Signalize.
 */

/**
 * @typedef {function} SignalizeModule
 * @param {Signalize} signalize - The Signalize instance to which the module will be applied.
 * @returns {void}
 */
export class Signalize {
	#modules = new Set();
	// Imports are translated into native importmap
	#imports = {};
	#inited = false;
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

		if (this.root?.__signalize === undefined) {
			this.root.__signalize = this;

			const init = async () => {
				this.attributePrefix = options?.attributePrefix ?? '';
				this.attributeSeparator = options?.attributeSeparator ?? '-';
				this.componentPrefix = options?.componentPrefix ?? '';
				this.globals = { ...this.globals, ...options?.globals ?? {} };

				const { customEventListener, observeMutations } = await this.import(['on', 'mutation-observer']);

				customEventListener('signalize:ready', ({ listener }) => {
					if (this.#inited) {
						listener(this);
						return;
					}
					readyListeners.push(listener);
				});

				while (readyListeners.length > 0) {
					readyListeners.shift()();
				}

				this.root.__signalize = this;
				this.#inited = true;

				observeMutations(this.root, (event, node) => {
					if (!(node instanceof Element)) {
						return;
					}
					const { dispatch } = this.import('signalizejs/dispatch');
					dispatch(event, node);
				});
			};

			init();
		} else {
			const signalizeInstance = this.root.__signalize;
			signalizeInstance.globals = { ...signalizeInstance.globals, ...options?.globals ?? {} };
		}

		return this.root.__signalize;
	}

	imports(map) {
		this.#imports = { ...this.#imports, ...map};
	}

	import = async (moduleNamesOrAliases) => {
		const modules = typeof moduleNamesOrAliases === 'string'
			? moduleNamesOrAliases.split(' ')
			: moduleNamesOrAliases;

		/** @var { Promise[] } imports */
		let imports = [];
		for (let i = 0; i < modules.length; i++) {
			const moduleNameOrAlias = modules[i];
			let importPath = this.#imports[moduleNameOrAlias];

			if (importPath in this.#imports) {
				importPath = this.#imports[importPath];
			}

			if (typeof importPath === 'undefined') {
				importPath = `./modules/${moduleNameOrAlias}.js`;
			}

			imports.push(new Promise(async (resolve, reject) => {
				try {
					const module = await import(importPath);
					resolve(module.default({ $: this, options: this.#modules[modules[i]] ?? {} }));
				} catch (e) {
					reject(`Module '${moduleNameOrAlias}' could not be loaded in import path(${importPath}). ${e}`);
				}
			}));
		}

		imports = await Promise.all(imports);
		let functions = {};

		for (const moduleFunctions of imports) {
			functions = {
				...functions,
				...moduleFunctions
			};
		}

		return functions;
	};
}

export default Signalize;
