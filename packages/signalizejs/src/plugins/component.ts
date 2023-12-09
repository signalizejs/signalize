import type { Signalize } from '..';
import type { CustomEventListener } from './on';
import type { VnodeInterface } from './vnode';

declare module '..' {
	interface Signalize {
		component: (name: string, init: ComponentOptions) => typeof HTMLElement
	}

	interface CustomEventListeners {
		'component:init': CustomEventListener
		'component:defined': CustomEventListener
	}
}

export interface ComponentOptions {
	props?: Record<string, any> | string[]
	template?: string | DocumentFragment
	construct?: () => void | Promise<void>
	constructed?: () => void | Promise<void>
	connected?: () => void | Promise<void>
	addopted?: () => void | Promise<void>
	disconnected?: () => void | Promise<void>
	shadow?: ShadowRootInit
}

export default ($: Signalize): void => {
	const { signal, select, selectAll, dashCase } = $;

	const refAttribute = `${$.attributePrefix}ref`;
	const componentAttribute = `${$.attributePrefix}component`;
	const cloakAttribute = `${$.attributePrefix}cloak`;

	const component = (name: string, options: ComponentOptions): typeof HTMLElement => {
		let componentName = name;

		if (!componentName.includes('-')) {
			componentName = `x-${componentName}`;
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
			attributesPropertiesMap[dashCase(propertyName)] = propertyName;
		}

		const observableAttributes = Object.keys(attributesPropertiesMap);

		class Component extends HTMLElement {
			#constructPromise
			$el = this;

			constructor () {
				super();

				this.#constructPromise = this.#construct();
			}

			async #construct (): Promise<void> {
				for (const [key, value] of Object.entries(properties)) {
					this[key] = signal(value);
				}

				if (options?.construct !== undefined) {
					const data = await options.construct.call(this);

					for (const [key, value] of Object.entries(data ?? {})) {
						this[key] = value;
					}
				}

				let template = options?.template;

				if (typeof template === 'string') {
					if (template.startsWith('#')) {
						template = select(template)?.content.cloneNode(true);
					} else {
						const templateElement = document.createElement('template')
						templateElement.innerHTML = template;
						template = templateElement;
					}
				}

				let root = this;

				if (options?.shadow) {
					root = this.attachShadow({
						...options?.shadow
					});
				} else if (template !== undefined) {
					const currentTemplate = document.createElement('template');
					currentTemplate.innerHTML = this.innerHTML.trim();

					for (const slot of selectAll('[slot]', currentTemplate.content)) {
						const slotName = slot.getAttribute('slot');
						slot.removeAttribute('slot');
						select(`slot[name="${slotName}"]`, template.content)?.replaceWith(slot);
					}

					select('slot:not([name])', template.content)?.replaceWith(currentTemplate.content);
				}

				if (template !== undefined) {
					root.innerHTML = template.innerHTML;
				}

				this.setAttribute(componentAttribute, name);

				await options?.constructed?.call(this);
			}

			static get observedAttributes (): string[] {
				return observableAttributes;
			}

			attributeChangedCallback(name: string, oldValue: string, newValue: string) {
				if (observableAttributes.includes(name)) {
					const currentProperty = this[attributesPropertiesMap[name]];
					currentProperty(
						Number.isNaN(currentProperty()) ? newValue : parseFloat(newValue)
					);
				}
			}

			async connectedCallback (): void {
				await this.#constructPromise;
				await options?.connected.call(this);
				this.removeAttribute(cloakAttribute);
			}

			disconnectedCallback (): void {
				options?.disconnected.call(this);
			}

			adoptedCallback (): void {
				options?.adopted.call(this);
			}

			$parent = (name?: string): Element | null => {
				return this.closest(`[${componentAttribute}${name === undefined ? '' : `="${name}"`}]`);
			}

			$ref = (name: string): Element | null => {
				return this.$refs(name)[0] ?? null;
			}

			$refs = (name: string): Element[] => {
				return [...selectAll(`[${refAttribute}="${name}"]`, this)].filter((element) => {
					return element.closest(`[${componentAttribute}]`) === this;
				});
			}
		}

		customElements.define(componentName, Component);
		return Component;
	}

	$.component = component;
}
