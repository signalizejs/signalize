export class Signalize {
	/**
	 * List of internal modules in /modules,
	 * so they can be resolved without full package name like signalizejs/something
	 */
	#internalModules = [
		'ajax',
		'bind',
		'component',
		'dash-case', 'dialog', 'dom-ready', 'directives', 'directives/for', 'directives/if',
		'evaluate', 'event',
		'height', 'hyperscript',
		'intersection-observer', 'is-visible',
		'mutation-observer',
		'scope', 'signal', 'snippets', 'spa',
		'task',
		'traverse-dom',
		'viewport',
	];
	/** @type {Record<string, Promise<any>>} */
	#currentlyResolvedModules = {};
	/** @type {Record<string, any>} */
	#modules = {};
	/** @type {Promise<any>|null} */
	#initPromise = null;
	#inited = false;
	/** @type {import('../types/Signalize').ModulesResolver} */
	#resolver = (moduleName) => import(moduleName);
	#instanceId = 'signalizejs';
	/** @type {import('../types/Signalize').Root} */
	root;
	/** @type {import('../types/Signalize').Globals} */
	globals = {};
	/** @type {import('../types/Signalize').Params} */
	params = {
		attributePrefix: '',
		attributeSeparator: '-'
	};

	/** @param {import('../types/Signalize').SignalizeConfig} options */
	constructor (options = {}) {
		this.root = options?.root ?? document;

		if (this.root?.__signalize === undefined) {
			this.root.__signalize = this;

			const init = async () => {
				this.#resolver = options.resolver ?? this.#resolver
				this.#instanceId = options?.instanceId ?? this.#instanceId;
				this.globals = options?.globals ?? this.globals;
				this.params = options?.params ?? this.params;

				this.root.__signalize = this;

				if (options?.modules) {
					await this.resolve(...options.modules, { waitOnInit: false });
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

	/** @param {import('../types/Signalize').InitedCallback} [callback] */
	inited = async (callback) => {
		if (!this.#inited) {
			await this.#initPromise;
		}

		if (callback) {
			callback();
		}
	};

	/**
	 * @template T
	 * @type {import('../types/Signalize').Resolve<T>}
	 */
	resolve = async (...modules) => {
		const lastItem = modules[modules.length - 1];
		const lastItemIsConfig = !(Array.isArray(lastItem) || typeof lastItem === 'string');
		const resolveConfig = {
			waitOnInit: true,
			...lastItemIsConfig ? lastItem : {}
		};

		if (lastItemIsConfig) {
			modules.pop();
		}

		if (resolveConfig.waitOnInit === true) {
			await this.inited();
		}

		/** @type {T} */
		let resolved = {};

		/**
		 * @template T
		 * @type {Promise<Record<string, any>>[]} */
		const importsPromises = [];

		for (const moduleToImport of modules) {
			/** @type {string} */
			let moduleName;
			/** @type {CallableFunction} */
			let moduleInitFunction;;
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
				throw new Error(`The "import" for "${moduleName}" method expects module to be a name or array with config [name, config]. Got ${JSON.stringify(moduleToImport)}.`);
			}

			moduleConfig = {
				...this.params[moduleName] ?? {},
				...moduleConfig
			}

			if (this.#internalModules.includes(moduleName)) {
				moduleName = `${this.#instanceId}/${moduleName}`;
			}

			const moduleConfigIsEmpty = Object.keys(moduleConfig).length === 0;

			if (moduleName in this.#modules && moduleConfigIsEmpty) {
				resolved = {
					...resolved,
					...this.#modules[moduleName]
				};
				continue;
			}

			let modulePromise;

			const canBeCached = !(moduleName in this.#modules) && (moduleConfigIsEmpty || !this.#inited);

			if (canBeCached && !(moduleName in this.#currentlyResolvedModules)) {
				// eslint-disable-next-line no-async-promise-executor
				this.#currentlyResolvedModules[moduleName] = new Promise(async (resolve, reject) => {
					try {
						let moduleFunctionality;
						if (moduleInitFunction === undefined) {
							const module = await this.#resolver(moduleName);
							moduleFunctionality = await (module[moduleName] ?? module.default)(this, moduleConfig);
						} else {
							moduleFunctionality = await moduleInitFunction(this, moduleConfig);
						}

						if (!(moduleName in this.#modules) && (moduleConfigIsEmpty || !this.#inited)) {
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
