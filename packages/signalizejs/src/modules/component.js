/* declare module '..' {
	interface Signalize {
		component: (name: string, init: ComponentOptions) => typeof HTMLElement
	}

	interface CustomEventListeners {
		'component:constructed': CustomEventListener
		'component:connected': CustomEventListener
		'component:disconnected': CustomEventListener
		'component:adopted': CustomEventListener
	}
} */

/**
 * Options for configuring a component.
 *
 * @interface ComponentOptions
 * @property {Record<string, any> | string[]} [props] - Props to be used by the component (optional).
 * @property {() => void | Promise<void>} [setup] - Function for setting up the component (optional).
 * @property {ShadowRootInit} [shadow] - Configuration options for the shadow DOM (optional).
 */

/**
 * @param {import('../Signalize').Signalize} $
 * @returns {void}
 */
export default async ({ $} ) => {
	const { signal, dispatch, scope } = await $.import(['signal', 'dispatch', 'scope']);

	const cloakAttribute = `${$.attributePrefix}cloak`;

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

		let componentName = `${$.componentPrefix}${name}`;

		if (customElements.get(componentName) !== undefined) {
			console.warn(`Custom element "${componentName}" already defined. Skipping.`);
			return;
		}

		const properties = {};

		if (Array.isArray(options?.props)) {
			for (const property of options.props) {
				properties[property] = undefined;
			}
		} else if (typeof options?.props === 'object') {
			for (const [key, value] of Object.entries(options?.props)) {
				properties[key] = value;
			}
		}

		const attributesPropertiesMap = {};

		for (const propertyName of Object.keys(properties)) {
			attributesPropertiesMap[$.dashCase(propertyName)] = propertyName;
		}

		const observableAttributes = Object.keys(attributesPropertiesMap);

		class Component extends HTMLElement {
			/**
			 * @readonly
			 * @type {Promise<void>}
			 */
			#constructPromise;
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
					node.$props = {};

					for (const [key, value] of Object.entries(properties)) {
						node.$props[key] = signal(value);
						node.$data[key] = node.$props[key];
					}
				});

				/**
				 * @param {string} name
				 */
				this.#scope.$children = async (name) => {
					if (customElements.get(name) === undefined) {
						await customElements.whenDefined(name);
					}

					const childComponents = this.#scope.$el.querySelectorAll(name);
					const initPromises = [];
					for (const childComponent of childComponents) {
						const componentScope = scope(childComponent);
						initPromises.push(
							componentScope?._setuped === true
								? componentScope
								: new Promise((resolve) => {
									$.on('component:setuped', ({ detail }) => {
										if (detail.$el === childComponent) {
											resolve(detail);
										}
									});
								})
						);
					}

					return await Promise.all(initPromises);
				};

				/**
				 * @param {string} name
				 */
				this.#scope.$child = async (name) => {
					return (await this.#scope.$children(name))[0] ?? null;
				};

				for (const attr of this.#scope.$el.attributes) {
					this.attributeChangedCallback(attr.name, undefined, this.#scope.$el.getAttribute(attr.name));
				}

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

				dispatch('component:setuped', this.#scope, { target: this.#scope.$el, bubbles: true });
				this.#scope._setuped = true;
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
			attributeChangedCallback (name, oldValue, newValue) {
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

				currentProperty(valueToSet in valueTypeMap ? valueTypeMap[valueToSet] : valueToSet);
			}

			/**
			 * @returns {Promise<void>}
			 */
			async connectedCallback () {
				await this.#constructPromise;
				await this.#connected();
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

	return {
		component
	};
};
