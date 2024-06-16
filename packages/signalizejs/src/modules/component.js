/**
 * @type {import('../../types/Signalize').Module<
 *   import('../../types/modules/component').ComponentModule,
 *   import('../../types/modules/component').ComponentModuleConfig
 *  >}
 */
export default async ({ resolve, params }, config) => {
	const { componentPrefix = '' } = config;
	const { attributePrefix } = params;

	/**
	 * @type {{
	 *  signal: import('../../types/modules/signal').signal,
	 *  dispatch: import('../../types/modules/event').dispatch,
	 *  scope: import('../../types/modules/scope').scope,
	 *  dashCase: import('../../types/modules/strings/cases').dashCase
	 * }}
	*/
	const { dispatch, scope, signal, dashCase } = await resolve('event', 'scope', 'signal', 'strings/cases');

	const cloakAttribute = `${attributePrefix}cloak`;

	/** @type {import('../../types/modules/component').component} */
	const component = (name, optionsOrSetup) => {
		let options = optionsOrSetup;
		/** @type {import('../../types/modules/component').setupCallback|undefined} */
		let setup;

		if (typeof optionsOrSetup === 'function') {
			options = {};
			setup = optionsOrSetup;
		} else {
			setup = options?.setup;
		}

		const componentName = `${componentPrefix}${name}`;
		const definedElement = customElements.get(componentName);

		if (definedElement !== undefined) {
			console.warn(`Custom element "${componentName}" already defined. Skipping.`);
			return definedElement;
		}

		let propertyKeys = [];
		const props = options?.props;
		let propsAreArray = false;
		let propsAreFunction = false;
		let propsAreObject = false;

		if (Array.isArray(props)) {
			propertyKeys = props;
			propsAreArray = true;
		} else if (typeof props === 'function') {
			propertyKeys = Object.keys(props());
			propsAreFunction = true;
		} else if (typeof props === 'object') {
			propsAreObject = true;
			propertyKeys = Object.keys(props);
		}

		/** @type {Record<string, string>} */
		const attributesPropertiesMap = {};

		for (const propertyName of propertyKeys) {
			attributesPropertiesMap[dashCase(propertyName)] = propertyName;
		}

		const observableAttributes = Object.keys(attributesPropertiesMap);

		class Component extends HTMLElement {
			/**
			 * @readonly
			 * @type {string[]}
			 */
			static observedAttributes = observableAttributes;

			/**
			 * @readonly
			 * @type {Promise<void>}
			 */
			#constructPromise;
			#inited = false;
			/**
			 * @readonly
			 * @type {import('../../types/modules/scope').Scope}
			 */
			#scope;
			/** @type {import('../../types/modules/component').LifeCycleListeners} */
			#connected = [];
			/** @type {import('../../types/modules/component').LifeCycleListeners} */
			#disconnected = [];
			/** @type {import('../../types/modules/component').LifeCycleListeners} */
			#adopted = [];

			constructor () {
				super();
				this.#constructPromise = this.#setup();
			}

			/**  @return {Promise<void>} */
			async #setup () {
				/** @type {HTMLElement|ShadowRoot} */
				let root = this;

				if (options?.shadow) {
					root = this.attachShadow({
						...options?.shadow
					});
				}

				this.#scope = scope(root, (node) => {
					node.$propsAliases = attributesPropertiesMap;
					node.$props = {};

					/** @type {Record<string, any>} */
					let properties = {};

					if (propsAreArray) {
						for (const propertyName of props) {
							properties[propertyName] = undefined;
						}
					} else if (propsAreFunction) {
						properties = props();
					} else if (propsAreObject) {
						properties = structuredClone(props);
					}

					for (const [key, value] of Object.entries(properties)) {
						node.$props[key] = signal(value);
						node.$data[key] = node.$props[key];
					}
				});

				// Sometime, it's much nicer to wait on child components to be defined.
				// It can save a lot of boilerplate code.
				const dependencies = [];

				for (const componentDependency of options?.components ?? []) {
					if (!customElements.get(componentDependency)) {
						dependencies.push(new Promise(async (resolve) => {
							await customElements.whenDefined(componentDependency);
							resolve(true);
						}));
					}
				}

				await Promise.all(dependencies);

				for (const attr of this.#scope.$el.attributes) {
					this.attributeChangedCallback(attr.name, undefined, this.#scope.$el.getAttribute(attr.name));
				}

				await dispatch('component:beforeSetup', this.#scope, { target: this.#scope.$el, bubbles: true });

				if (setup !== undefined) {
					const data = await setup.call(undefined, {
						...this.#scope,
						$connected: (listener) => this.#connected.push(listener),
						$disconnected: (listener) => this.#disconnected.push(listener),
						$adopted: (listener) => this.#adopted.push(listener),
					});

					for (const [key, value] of Object.entries(data ?? {})) {
						this.#scope.$data[key] = value;
					}
				}

				this.#scope._setuped = true;
				dispatch('component:setuped', this.#scope, { target: this.#scope.$el, bubbles: true });
			}

			/**
			 * @param {string} name
			 * @param {string} oldValue
			 * @param {string} newValue
			 */
			attributeChangedCallback(name, oldValue, newValue) {
				if (!observableAttributes.includes(name)) {
					return;
				}

				const valueTypeMap = {
					null: null,
					undefined: undefined,
					false: false,
					true: true
				};

				const currentProperty = this.#scope.$props[attributesPropertiesMap[name]];
				let valueToSet = Number.isNaN(parseFloat(currentProperty())) ? newValue : parseFloat(newValue);

				if (typeof currentProperty() === 'boolean') {
					valueToSet = valueToSet.length > 0 ? !!valueToSet : this.#scope.$el.hasAttribute(name);
				}

				if (valueToSet !== currentProperty()) {
					const newPropertyValue = valueToSet in valueTypeMap ? valueTypeMap[valueToSet] : valueToSet;
					if (this.#inited) {
						currentProperty(newPropertyValue);
					} else {
						currentProperty.value = newPropertyValue;
					}
				}
			}

			async connectedCallback () {
				await this.#constructPromise;

				this.#callLifeCycleListeners(this.#connected);
				this.#inited = true;
				this.removeAttribute(cloakAttribute);
				dispatch('component:connected', this.#scope, { target: this.#scope.$el });
			}

			async disconnectedCallback () {
				this.#callLifeCycleListeners(this.#disconnected);
				dispatch('component:disconnected', this.#scope, { target: this.#scope.$el });
			}

			async adoptedCallback () {
				this.#callLifeCycleListeners(this.#adopted);
				dispatch('component:adopted', this.#scope, { target: this.#scope.$el });
			}

			/** @param {CallableFunction[]} lifeCycleListeners */
			#callLifeCycleListeners = async (lifeCycleListeners) => {
				/** @type {Promise<any>[]} */
				const listeners = [];

				for (const listener of lifeCycleListeners) {
					listeners.push(listener());
				}

				await Promise.all(listeners);
			}
		}

		customElements.define(componentName, Component);
		return Component;
	};

	return { component };
};
