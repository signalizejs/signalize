import type { Signalize } from '..';
import type { CustomEventListener } from './on';

declare module '..' {
	interface Signalize {
		scope: (nameOrElement: string | HTMLElement | Document | DocumentFragment, init: ScopeInitFunction) => undefined | Scope
	}

	interface CustomEventListeners {
		'scope:inited': CustomEventListener
	}
}

type ScopeInitFunction = (Scope: Scope) => void;

export class Scope {
	readonly #signalize: Signalize;
	readonly #scopeAttribute: string;
	readonly #cleanups = new Set<CallableFunction>();

	element: HTMLElement | Document | DocumentFragment;
	data;

	constructor ({
		signalize,
		element,
		init,
		scopeAttribute,
		data = {}
	}: {
		signalize: Signalize
		element: HTMLElement | Document | DocumentFragment
		init: CallableFunction
		scopeAttribute: string
		data?: Record<string, any>
	}) {
		const { merge } = signalize;
		this.element = element;
		this.#signalize = signalize;
		this.#scopeAttribute = scopeAttribute;

		const getElementData = (element, data = {}): Scope => {
			if (element === null) {
				return data;
			}

			const elementScope = element.__signalizeScope;

			if (elementScope !== undefined) {
				data = merge(data, elementScope.data());
			}

			return getElementData(element.parentNode, data);
		}

		class CallableData extends Function {
			constructor () {
				super();

				return new Proxy(this, {
					set: (target, key: string, newValue: any) => {
						data[key] = newValue;
						return true;
					},
					apply: () => {
						return merge(data, getElementData(element.parentNode))
					}
				})
			}
		}

		this.data = new CallableData();
		this.element.__signalizeScope = this;

		if (init !== undefined) {
			init(this);
		}
	}

	cleanup = (callback: CallableFunction): void => {
		if (callback === undefined) {
			for (const cleanup of this.#cleanups) {
				cleanup();
			}

			this.#cleanups.clear();
			return;
		}

		this.#cleanups.add(callback);
	}

	ref = <T extends HTMLElement>(id: string): T | null => {
		const refEl = this.#signalize.ref<T>(id, this.element);
		return refEl !== null && this.#parentScopeIsEl(refEl) ? refEl : null
	}

	refs = (id: string): HTMLElement[] => {
		return [...this.#signalize.refs(id, this.element)].filter(this.#parentScopeIsEl)
	}

	readonly #parentScopeIsEl = (refElement: HTMLElement): boolean => {
		return refElement.closest(`[${this.#scopeAttribute}]`) === this.element;
	}
}

export default (signalize: Signalize): void => {
	const { isDomReady, on, config, selectAll, configure, dispatch } = signalize;

	let inited = false;
	const scopeKey = '__signalizeScope';
	let scopeAttribute = `${config.attributesPrefix}scope`;
	const definedScopes: Record<string, ScopeInitFunction> = signalize.config.scopes ?? {};
	const initScope = (element: HTMLElement, init?): void => {
		const scopeName = typeof element.getAttribute === 'function' ? element.getAttribute(scopeAttribute) : undefined;
		if (init === undefined) {
			init = definedScopes[scopeName];
		}

		if (element[scopeKey] !== undefined) {
			init(element[scopeKey]);
		} else {
			new Scope({ signalize, init, element, scopeAttribute });
		}

		dispatch('scope:inited', {
			element,
			scope: scopeName
		})
	}

	const initScopes = (root: HTMLElement, name?: string): void => {
		const nameIsDefined = name !== undefined;
		const selector = nameIsDefined ? `[${scopeAttribute}="${name}"]` : `[${scopeAttribute}]`;
		for (const element of selectAll<HTMLElement>(selector, root)) {
			if (element[scopeKey] !== undefined || !(element.getAttribute(scopeAttribute) in definedScopes)) {
				continue;
			}

			initScope(element);
		}
	}

	const scope = (nameOrElement: string | HTMLElement | Document | DocumentFragment, init?: ScopeInitFunction): undefined | Scope => {
		const nameOrElementIsString = typeof nameOrElement === 'string';
		const name = nameOrElementIsString ? nameOrElement : undefined;
		const nameIsDefined = name !== undefined;
		const element = !nameOrElementIsString ? nameOrElement : undefined;

		if (element !== undefined && init === undefined && element[scopeKey] !== undefined) {
			return element[scopeKey];
		}

		if (nameIsDefined) {
			if (name in definedScopes) {
				throw new Error(`Scope "${name}" is already defined.`);
			}
			definedScopes[name] = init;

			if (isDomReady() && inited) {
				initScopes(document.documentElement, name);
				return;
			}
		} else if (typeof init !== 'undefined') {
			initScope(element, init);
		}

		return element[scopeKey];
	};

	on('dom:ready', () => {
		scopeAttribute = `${config.attributesPrefix}${scopeAttribute}`;

		initScopes(config.root);
		inited = true;

		const cleanScope = (element: HTMLElement | DocumentFragment | Document) => {
			if (element[scopeKey] !== undefined) {
				scope(element).cleanup();
			}

			for (const child of element.children) {
				cleanScope(child);
			}
		};

		on('dom:mutation:node:removed', (event) => {
			if (event.detail instanceof Element) {
				cleanScope(event.detail)
			}
		});

		on('dom:mutation:node:added' as keyof CustomEventListener, document, ({ detail }: { detail: Node }): void => {
			if (!(detail instanceof HTMLElement)) {
				return;
			}

			if (scope(detail)) {
				return;
			}

			initScopes(detail);
		});
	});

	signalize.config.scopeAttribute = scopeAttribute;
	signalize.config.scopeKey = scopeKey;
	signalize.scope = scope;
}
