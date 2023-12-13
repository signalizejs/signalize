import type { Signalize } from '..';
import type { CustomEventListener } from './on';

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
	adopted?: () => void | Promise<void>
	disconnected?: () => void | Promise<void>
	shadow?: ShadowRootInit
}

export default ($: Signalize): void => {
	const { signal, select, selectAll, dispatch } = $;

	const refAttribute = `${$.attributePrefix}ref`;
	const componentAttribute = `${$.attributePrefix}component`;
	const cloakAttribute = `${$.attributePrefix}cloak`;

	const component = (name: string, options: ComponentOptions): typeof HTMLElement => {
		let componentName = name;

		if (!componentName.includes('-')) {
			componentName = `x-${componentName}`;
		}

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
					const data = await options?.construct?.call(this);

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

				const convertInnerHtmlToFragment = () => {
					const template = document.createElement('template');
					template.innerHTML = this.innerHTML.trim();
					return template;
				}

				let root = this;

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
				}

				if (template !== undefined) {
					root.innerHTML = '';
					$.vnode(root, (vnode) => {
						vnode.context = this;
					});
					root.append(template.content);
				}

				this.setAttribute(componentAttribute, name);

				await options?.constructed?.call(this);
				dispatch('component:constructed', root);
			}

			static get observedAttributes (): string[] {
				return observableAttributes;
			}

			attributeChangedCallback (name: string, oldValue: string, newValue: string): void {
				if (observableAttributes.includes(name)) {
					const currentProperty = this[attributesPropertiesMap[name]];
					currentProperty(
						Number.isNaN(currentProperty()) ? newValue : parseFloat(newValue)
					);
				}
			}

			async connectedCallback (): Promise<void> {
				await this.#constructPromise;
				await options?.connected?.call(this);
				this.removeAttribute(cloakAttribute);
			}

			disconnectedCallback (): void {
				void options?.disconnected?.call(this);
			}

			adoptedCallback (): void {
				void options?.adopted?.call(this);
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
