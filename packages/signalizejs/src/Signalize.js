/**
 * Global variables that can are used within an outside of Signalize to avoid poluting Window object.
 *
 * @typedef {Record<string, any>} SignalizeGlobals
 */

/**
 * Global settings for Signalize and its modules.
 *
 * @typedef {Record<string, any>} SignalizeParams
 */

/**
 * List of signalize modules that will be inited instantly when the Signalize instance is created.
 *
 * @typedef {Array<string|[string, Record<string, any>]|[string, Function]|[string, Function, Record<string, any>]>} SignalizeModules
 */

/**
 * Module resolver definition
 *
 * @template T
 * @callback SignalizeModulesResolver<T>
 * @param {string} moduleName
 * @returns {Promise<T>}
 */

/**
 * Options for configuring Signalize.
 *
 * @typedef {Object} SignalizeOptions
 * @property {Element | Document} [root] - The root element or document where Signalize will operate.
 * @property {SignalizeParams} [params] - The separator used in attribute names for component customization.
 * @property {SignalizeGlobals} [globals] - Optional global settings for Signalize.
 * @property {SignalizeModules} [modules] - Optional array of modules to be applied to Signalize.
 * @property {SignalizeModulesResolver<unknown>} [resolver] - Modules resolver
 */

/**
 * @template {Record<string, any> = {}} C
 * @template {Record<string, any>|void = {}} F
 * @callback SignalizeModule
 * @param {Signalize} signalize - The Signalize instance to which the module will be applied.
 * @param {C} config - Module config. Direct from init function or from params.
 * @returns {F|Promise<F>}
 */
export class Signalize {
	/**
	 * List of internal modules in /modules,
	 * so they can be resolved without full package name like signalizejs/something
	 */
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
	/**
	 * @type {Record<string, Promise<any>>}
	 */
	#currentlyResolvedModules = {};
	/** @type {Record<string, any>} */
	#modules = {};
	/** @type {Promise<any>|null} */
	#initPromise = null;
	#inited = false;
	/**
	 * @template T
	 * @type {SignalizeModulesResolver<T>}
	 */
	#resolver = (moduleName) => import(moduleName);
	/** @type {Element|Document} */
	root;
	/** @type {SignalizeGlobals} */
	globals = {};
	/** @type {SignalizeParams} */
	params = {
		attributePrefix: '',
		attributeSeparator: '-'
	};

	/**
	 * @constructor
	 * @param {SignalizeOptions} options
	 */
	constructor (options = {}) {
		this.root = options?.root ?? document;

		if (this.root?.__signalize === undefined) {
			this.root.__signalize = this;

			const init = async () => {
				if ('resolver' in options) {
					this.#resolver = options.resolver;
				}
				this.globals = options.globals ?? {};
				this.params = options.params ?? {};

				this.root.__signalize = this;

				if (options?.modules) {
					await this.resolve(...options.modules);
				}

				this.#inited = true;
			};

			this.#initPromise = init();
		} else {
			const signalizeInstance = this.root.__signalize;
			signalizeInstance.globals = { ...signalizeInstance.globals, ...options?.globals ?? {} };
		}

		return this.root.__signalize;
	}

	/**
	 * @param {Function} [callback]
	 * @returns {Promise<void>}
	 */
	inited = async (callback) => {
		await this.#initPromise;

		if (callback) {
			callback();
		}
	};

	/**
	 * @template T
	 * @param {Array<string|[string, Record<string, any>|Function, Record<string, any>|undefined]|Record<string, any>>} modules
	 * @returns {Promise<T>}
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

		/** @type {T} */
		let resolved = {};
		/** @type {Promise<Record<string, any>>[]} */
		let importsPromises = [];

		for (const moduleToImport of modules) {
			/** @type {string} */
			let moduleName;
			let moduleInitFunction = null;
			let moduleConfig = {};

			if (typeof moduleToImport === 'string') {
				moduleName = moduleToImport;
			} else if (Array.isArray(moduleToImport) && moduleToImport.length > 1) {
				moduleName = moduleToImport[0];
				if (typeof moduleToImport[1] === 'function') {
					moduleInitFunction = moduleToImport[1];
					moduleConfig = moduleToImport[2] ?? moduleConfig;
				} else {
					moduleConfig = moduleToImport[1];
				}
			} else {
				throw new Error(`The "import" method expects module to be a name or array with config [name, config]. Got ${JSON.stringify(moduleToImport)}.`);
			}

			if (Object.keys(moduleConfig).length === 0 && moduleName in this.params) {
				moduleConfig = this.params[moduleName];
			}

			if (this.#internalModules.includes(moduleName)) {
				moduleName = `signalizejs/${moduleName}`;
			}

			if (moduleName in this.#modules && Object.keys(moduleConfig).length === 0) {
				resolved = {
					...resolved,
					...this.#modules[moduleName]
				};
				continue;
			}

			let modulePromise;

			const canBeCached = !(moduleName in this.#modules) && (moduleConfig === null || !this.#inited);

			if (canBeCached && !(moduleName in this.#currentlyResolvedModules)) {
				// eslint-disable-next-line no-async-promise-executor
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
			} else {
				throw new Error(`Module "${moduleName}" could not be loaded.`);
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
