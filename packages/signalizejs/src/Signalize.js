import eventModule from 'signalizejs/event';
import mutationObserverModule from 'signalizejs/mutation-observer';
import domReadyModule from 'signalizejs/dom-ready';

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
	#internalModules = [
		'bind',
		'component',
		'dash-case', 'dialog', 'dom-ready', 'directives',
		'evaluate', 'event',
		'fetch',
		'height', 'hyperscript',
		'intersection-observer', 'is-visible',
		'mutation-observer',
		'scope', 'signal', 'snippets', 'spa',
		'task',
		'traverser-dom',
		'viewport',
	];
	#currentlyResolvedModules = {};
	/** @type {Record<string, any>} */
	#modules = {};
	/** @type {Promise<any>|null} */
	#initPromise = null;
	#inited = false;
	/**
	 * @param {string} moduleName
	 * @returns {Promise<any>}
	 */
	#resolver = (moduleName) => import(moduleName);
	/** @type { Element | Document } */
	root;
	/** @type { SignalizeGlobals } */
	globals = {};
	params = {
		attributePrefix: '',
		attributeSeparator: '-'
	};

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
				if ('resolver' in options) {
					this.#resolver = options.resolver;
				}

				this.globals = options.globals ?? {};
				this.params = options.params ?? {};

				const { customEventListener, dispatch, observeMutations } = await this.resolve(
					['event', eventModule],
					['mutation-observer', mutationObserverModule],
					['dom-ready', domReadyModule]
				);

				customEventListener('signalize:ready', ({ listener }) => {
					if (this.#inited) {
						listener(this);
						return;
					}

					readyListeners.push(listener);
				});

				this.root.__signalize = this;

				if (options?.modules) {
					await this.resolve(...options.modules);
				}

				this.#inited = true;

				while (readyListeners.length > 0) {
					readyListeners.shift()();
				}

				observeMutations(this.root, (event, node) => {
					if (!(node instanceof Element)) {
						return;
					}

					dispatch(event, node);
				});
			};

			this.#initPromise = init();
		} else {
			const signalizeInstance = this.root.__signalize;
			signalizeInstance.globals = { ...signalizeInstance.globals, ...options?.globals ?? {} };
		}

		return this.root.__signalize;
	}

	inited = async (callback) => {
		await this.#initPromise;

		if (callback) {
			callback();
		}
	};

	/**
	 * @param {Array<string|[string, Record<string, any>|Function, Record<string, any>|undefined]|Record<string, any>>} modules
	 * @returns {Promise<Record<string, any>>}
	 */
	resolve = async (...modules) => {
		const lastItem = modules[modules.length - 1];
		const lastItemIsConfig = !(Array.isArray(lastItem) || typeof lastItem === 'string');
		let resolveConfig = {
			waitOnInit: true,
			...lastItemIsConfig ? lastItem : {}
		};

		if (lastItemIsConfig) {
			modules.pop();
		}

		if (resolveConfig.waitOnInit === true && !this.#inited) {
			await this.inited();
		}

		/** @var { Record<string, any> } */
		let resolved = {};
		/** @type { Promise<boolean>[]} */
		let importsPromises = [];

		for (const moduleToImport of modules) {
			/** @type {string} */
			let moduleName;
			let moduleInitFunction = null;
			let moduleConfig = this.params[moduleName] ?? {};

			if (typeof moduleToImport === 'string') {
				moduleName = moduleToImport;
			} else if (Array.isArray(moduleToImport) && moduleToImport.length > 1) {
				moduleName = moduleToImport[0];
				if (typeof moduleToImport[1] === 'function') {
					moduleInitFunction = moduleToImport[1];
					moduleConfig = moduleToImport[2] ?? null;
				} else {
					moduleConfig = moduleToImport[1];
				}
			} else {
				throw new Error(`The "import" method expects module to be a name or array with config [name, config]. Got ${JSON.stringify(moduleToImport)}.`);
			}

			if (this.#internalModules.includes(moduleName)) {
				moduleName = `signalizejs/${moduleName}`;
			}

			if (moduleName in this.#modules && Object.keys(moduleConfig).length === 0) {
				console.trace(moduleName);
				resolved = {
					...resolved,
					...this.#modules[moduleName]
				};
				continue;
			}

			let modulePromise;

			const canBeCached = !(moduleName in this.#modules) && (moduleConfig === null || !this.#inited);

			if (canBeCached && !(moduleName in this.#currentlyResolvedModules)) {
				this.#currentlyResolvedModules[moduleName] = new Promise(async (resolve, reject) => {
					try {
						let moduleFunctionality;
						if (moduleInitFunction === null) {
							const module = await this.#resolver(moduleName);
							moduleFunctionality = (module[moduleName] ?? module.default)(this, moduleConfig);
						} else {
							moduleFunctionality = await moduleInitFunction(this, moduleConfig);
						}

						if (!(moduleName in this.#modules) && (moduleConfig === null || !this.#inited)) {
							this.#modules[moduleName] = moduleFunctionality;
						}

						delete this.#currentlyResolvedModules[moduleName];
						resolve(this.#modules[moduleName]);
					} catch (e) {
						reject(`Module "${moduleName}" could not be loaded from import. ${e}`);
					}
				});

				modulePromise = this.#currentlyResolvedModules[moduleName];
			} else if (canBeCached) {
				modulePromise = this.#currentlyResolvedModules[moduleName];
			}

			importsPromises.push(modulePromise);
		}

		for (const module of await Promise.all(importsPromises)) {
			resolved = {
				...resolved,
				...module
			};
		}

		return resolved;
	};
}

export default Signalize;
