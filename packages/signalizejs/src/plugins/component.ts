import type { Signalize } from '..';
import type { CustomEventListener } from './on';

declare module '..' {
	interface Signalize {
		component: (name: string, init: ComponentOptions) => typeof HTMLElement
	}

	interface CustomEventListeners {
		'component:constructed': CustomEventListener
		'component:connected': CustomEventListener
		'component:disconnected': CustomEventListener
		'component:adopted': CustomEventListener
	}
}

export interface ComponentOptions {
	props?: Record<string, any> | string[]
	construct?: () => void | Promise<void>
	constructed?: () => void | Promise<void>
	connected?: () => void | Promise<void>
	adopted?: () => void | Promise<void>
	disconnected?: () => void | Promise<void>
	shadow?: ShadowRootInit
}

export default ($: Signalize): void => {
	const { signal, dispatch, vnode } = $;

	const componentAttribute = `${$.attributePrefix}component`;
	const cloakAttribute = `${$.attributePrefix}cloak`;
	$.componentAttribute = componentAttribute;

	const component = (name: string, options: ComponentOptions): typeof HTMLElement => {
		let componentName = `${$.componentPrefix}${name}`;

		if (customElements.get(componentName) !== undefined) {
			throw new Error(`Custom element "${componentName}" already defined.`);
		}

		const properties = {};

		if (Array.isArray(options?.props)) {
			for (const property of options?.props) {
				properties[property] = undefined;
			}
		} else if (typeof options?.props === 'object') {
			for (const [key, value] of Object.entries(options?.props)) {
				properties[key] = value;
			}
		}

		const attributesPropertiesMap = {}

		for (const propertyName of Object.keys(properties)) {
			attributesPropertiesMap[$.dashCase(propertyName)] = propertyName;
		}

		const observableAttributes = Object.keys(attributesPropertiesMap);

		class Component extends HTMLElement {
			#constructPromise;
			readonly #vnode;

			constructor () {
				super();
				this.#constructPromise = this.#construct();
			}

			async #construct (): Promise<void> {
				/* const originalInnerHTML = this.innerHTML; */
				let root = this;

				if (options?.shadow) {
					root = this.attachShadow({
						...options?.shadow
					});
				}

				this.#vnode = vnode(root, (node) => {
					node.$props = {};

					for (const [key, value] of Object.entries(properties)) {
						node.$props[key] = signal(value);
						node.$data[key] = node.$props[key];
					}
				});

				if (options?.construct !== undefined) {
					const data = await options?.construct?.call(undefined, this.#vnode);

					for (const [key, value] of Object.entries(data ?? {})) {
						this.#vnode.$data[key] = value;
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

				this.setAttribute(componentAttribute, name);

				await options?.constructed?.call(this, this.#vnode);
				dispatch('component:constructed', this.#vnode, { target: this.#vnode.$el, bubbles: true });
			}

			static get observedAttributes (): string[] {
				return observableAttributes;
			}

			attributeChangedCallback (name: string, oldValue: string, newValue: string): void {
				if (observableAttributes.includes(name)) {
					const currentProperty = this.#vnode.$props[attributesPropertiesMap[name]];
					currentProperty(
						Number.isNaN(parseFloat(currentProperty())) ? newValue : parseFloat(newValue)
					);
				}
			}

			async connectedCallback (): Promise<void> {
				await this.#constructPromise;
				await options?.connected?.call(undefined, this.#vnode);
				this.removeAttribute(cloakAttribute);
				dispatch('component:connected', this.#vnode, { target: this.#vnode.$el });
			}

			disconnectedCallback (): void {
				void options?.disconnected?.call(undefined, this.#vnode);
				dispatch('component:disconnected', this.#vnode, { target: this.#vnode.$el });
			}

			adoptedCallback (): void {
				void options?.adopted?.call(undefined, this.#vnode);
				dispatch('component:adopted', this.#vnode, { target: this.#vnode.$el });
			}
		}

		customElements.define(componentName, Component);
		return Component;
	}

	$.component = component;
}
