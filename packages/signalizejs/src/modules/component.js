/**
 * Options for configuring a component.
 *
 * @typedef ComponentOptions
 * @property {Record<string, any> | string[]} [props] - Props to be used by the component (optional).
 * @property {() => void | Promise<void>} [setup] - Function for setting up the component (optional).
 * @property {ShadowRootInit} [shadow] - Configuration options for the shadow DOM (optional).
 */

/** @type {import('../Signalize').SignalizeModule} */
export default async ({ resolve, params }, config) => {
	const { componentPrefix = '' } = config;
	const { attributePrefix } = params;
	const { signal, dispatch, scope } = await resolve('signal', 'event', 'scope', 'dash-case');

	const cloakAttribute = `${attributePrefix}cloak`;

	/**
	 * Creates a custom Web Component with the specified name and options
	 *
	 * @function
	 * @param {string} name - The name of the component.
	 * @param {ComponentOptions} [optionsOrSetup] - Options for configuring the component.
	 * @returns {typeof HTMLElement} The constructor function for the component.
	 */
	const component = (name, optionsOrSetup) => {
		let options = optionsOrSetup;
		let setup = null;

		if (typeof optionsOrSetup === 'function') {
			options = {};
			setup = optionsOrSetup;
		} else {
			setup = options?.setup;
		}

		let componentName = `${componentPrefix}${name}`;

		if (customElements.get(componentName) !== undefined) {
			console.warn(`Custom element "${componentName}" already defined. Skipping.`);
			return;
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

		const attributesPropertiesMap = {};

		for (const propertyName of propertyKeys) {
			attributesPropertiesMap[dashCase(propertyName)] = propertyName;
		}

		const observableAttributes = Object.keys(attributesPropertiesMap);

		class Component extends HTMLElement {
			/**
			 * @readonly
			 * @type {Promise<void>}
			 */
			#constructPromise;
			#inited = false;
			/**
			 * @readonly
			 * @type {import('./scope').Scope}
			 */
			#scope;
			/** @readonly */
			#connected = async () => {};
			/** @readonly */
			#disconnected = async () => {};
			/** @readonly */
			#adopted = async () => {};

			constructor () {
				super();
				this.#constructPromise = this.#setup();
			}

			/**
			 * @return {Promise<void>}
			 */
			async #setup () {
				/* const originalInnerHTML = this.innerHTML; */
				let root = this;

				if (options?.shadow) {
					root = this.attachShadow({
						...options?.shadow
					});
				}

				this.#scope = scope(root, (node) => {
					node.$propsAliases = attributesPropertiesMap;
					node.$props = {};

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
					}
				});

				let dependencies = [];
				for (const componentDependency of options?.components ?? []) {
					if (!customElements.get(componentDependency)) {
						dependencies = new Promise(async (resolve) => {
							await customElements.whenDefined(componentDependency)
							resolve();
						});
					}
				}

				await Promise.all(dependencies);

				for (const attr of this.#scope.$el.attributes) {
					this.attributeChangedCallback(attr.name, undefined, this.#scope.$el.getAttribute(attr.name));
				}

				dispatch('component:beforeSetup', this.#scope, { target: this.#scope.$el, bubbles: true });

				if (setup !== undefined) {
					const data = await setup?.call(undefined, {
						...this.#scope,
						$connected: (listener) => {
							this.#connected = listener;
						},
						$disconnected: (listener) => {
							this.#disconnected = listener;
						},
						$adopted: (listener) => {
							this.#adopted = listener;
						},
					});

					for (const [key, value] of Object.entries(data ?? {})) {
						this.#scope.$data[key] = value;
					}
				}

				/* const convertInnerHtmlToFragment = () => {
					const template = document.createElement('template');
					template.innerHTML = this.innerHTML.trim();
					return template;
				} */

				/* let root = this;
root
				if (options?.shadow) {
					root = this.attachShadow({
						...options?.shadow
					});

					if (template === undefined) {
						template = convertInnerHtmlToFragment();
						this.innerHTML = '';
					}
				} else if (template !== undefined) {
					const fragment = convertInnerHtmlToFragment();

					for (const slot of selectAll('[slot]', fragment)) {
						const slotName = slot.getAttribute('slot');
						slot.removeAttribute('slot');
						select(`slot[name="${slotName}"]`, template.content)?.replaceWith(slot);
					}

					select('slot:not([name])', template.content)?.replaceWith(currentTemplate.content);
				} */

				this.#scope._setuped = true;
				dispatch('component:setuped', this.#scope, { target: this.#scope.$el, bubbles: true });
			}

			/**
			 * @returns {string[]}
			 */
			static get observedAttributes () {
				return observableAttributes;
			}

			/**
			 * @param {string} name
			 * @param {string} oldValue
			 * @returns {void}
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

			/**
			 * @returns {Promise<void>}
			 */
			async connectedCallback () {

				await this.#constructPromise;
				await this.#connected();
				this.#inited = true;
				this.removeAttribute(cloakAttribute);
				dispatch('component:connected', this.#scope, { target: this.#scope.$el });
			}

			/**
			 * @returns {Promise<void>}
			 */
			async disconnectedCallback () {
				await this.#disconnected();
				dispatch('component:disconnected', this.#scope, { target: this.#scope.$el });
			}

			/**
			 * @returns {Promise<void>}
			 */
			async adoptedCallback () {
				await this.#adopted();
				dispatch('component:adopted', this.#scope, { target: this.#scope.$el });
			}
		}

		customElements.define(componentName, Component);
		return Component;
	};

	return { component };
};
