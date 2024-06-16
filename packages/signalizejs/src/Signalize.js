export class Signalize {
	/**
	 * List of internal modules in /modules,
	 * so they can be resolved without full package name like signalizejs/something
	 */
	#internalModules = [
		'ajax',
		'bind',
		'component',
		'dialog', 'dom/ready', 'dom/traverser', 'directives', 'directives/for', 'directives/if',
		'evaluator', 'event',
		'hyperscript',
		'intersection-observer', 'visibility',
		'mutation-observer',
		'offset',
		'scope', 'signal', 'sizes', 'snippets', 'spa', 'strings/cases',
		'task',
		'viewport',
	];
	/** @type {Record<string, Promise<any>>} */
	#currentlyResolvedModules = {};
	/** @type {Record<string, { initFunction: CallableFunction, config: Record<string, any>|undefined}} */
	#importedModulesQueue = {};
	/** @type {Record<string, any>} */
	#initedModules = {};
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
		const modulesToInit = [];

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

			modulesToInit.push({
				initFunction: moduleInitFunction,
				name: moduleName,
				config: moduleConfig
			});

			if (moduleInitFunction !== undefined) {
				if (this.#importedModulesQueue[moduleName]) {
					throw new Error(`Cannot initialize module "${moduleName}" twice with different init function.`);
				}

				this.#importedModulesQueue[moduleName] = {
					initFunction: moduleInitFunction,
					config: moduleConfig
				}
			}
		}

		for (const moduleToInit of modulesToInit) {
			const { name, config, initFunction } = moduleToInit;

			const configIsEmpty = Object.keys(config).length === 0;

			if (name in this.#initedModules && configIsEmpty) {
				resolved = {
					...resolved,
					...this.#initedModules[name]
				};
				continue;
			}

			let modulePromise;

			const canBeCached = !(name in this.#initedModules) && (configIsEmpty || !this.#inited);

			if (canBeCached && !(name in this.#currentlyResolvedModules)) {
				// eslint-disable-next-line no-async-promise-executor
				this.#currentlyResolvedModules[name] = new Promise(async (resolve, reject) => {
					try {
						let moduleFunctionality;


						if (initFunction !== undefined || this.#importedModulesQueue[name]?.initFunction !== undefined) {
							moduleFunctionality = await (initFunction ?? this.#importedModulesQueue[name]?.initFunction)(this, config);
						} else {
							const module = await this.#resolver(name);
							moduleFunctionality = await (module[name] ?? module.default)(this, config);
						}

						if (!(name in this.#initedModules) && (configIsEmpty || !this.#inited)) {
							this.#initedModules[name] = moduleFunctionality;
						}

						delete this.#currentlyResolvedModules[name];
						resolve(this.#initedModules[name]);
					} catch (e) {
						reject(e);
					}
				});

				modulePromise = this.#currentlyResolvedModules[name];
			} else if (canBeCached) {
				modulePromise = this.#currentlyResolvedModules[name];
			} else {
				throw new Error(`Module "${name}" could not be loaded.`);
			}

			importsPromises.push(modulePromise);
		}

		for (const module of await Promise.all(importsPromises)) {
			resolved = {
				...resolved,
				...module
			};
		}

		this.#importedModulesQueue = {};
		return resolved;
	};
}

export default Signalize;
