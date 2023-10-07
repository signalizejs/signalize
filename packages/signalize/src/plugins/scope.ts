import type Signalize from '..';
import type { CustomEventListener } from './on';

declare module '..' {
	interface Signalize {
		scope: (nameOrElement: string | HTMLElement | Document | DocumentFragment, init: ScopeInitFunction) => void | ScopeInstance
	}

	interface CustomEventListeners {
		'scopes:inited': CustomEventListener
	}
}

type ScopeInitFunction = (Scope: Scope) => void;

export class Scope {
	#signalize: Signalize;
	#scopeAttribute: string;
	#cleanups = new Set<CallableFunction>();

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
		console.log('created');
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

		const callableData = new CallableData();
		this.data = callableData;
		this.element.__signalizeScope = this;

		if (init !== undefined) {
			init(this);
		}
	}

	cleanup (callback: CallableFunction): void {
		if (callback === undefined) {
			for (const cleanup of this.#cleanups) {
				cleanup();
			}

			this.#cleanups.clear();
			return;
		}

		this.#cleanups.add(callback);
	}

	ref<T extends HTMLElement>(id: string): T | null {
		const refEl = this.#signalize.ref<T>(id, this.element);
		return refEl !== null && this.#parentScopeIsEl(refEl) ? refEl : null
	}

	refs (id: string): HTMLElement[] {
		return [...this.#signalize.refs(id, this.element)].filter(this.#parentScopeIsEl)
	}

	#parentScopeIsEl (refElement: HTMLElement): boolean {
		return refElement.closest(`[${this.#scopeAttribute}]`) === el;
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

	const scope = (nameOrElement: string | HTMLElement | Document | DocumentFragment, init: ScopeInitFunction): void | undefined | Scope => {
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

			if (isDomReady()) {
				initScopes(document.documentElement, name);
				return;
			}
		} else if (typeof init !== 'undefined') {
			initScope(element, init);
		}

		return element[scopeKey];
	};

	const scopesInitedListeners: CallableFunction[] = [];

	on('dom:ready', () => {
		scopeAttribute = `${config.attributesPrefix}${scopeAttribute}`;

		initScopes(config.root);
		inited = true;
		dispatch('scopes:inited');

		for (const listener of scopesInitedListeners) {
			listener();
		}

		const cleanScope = (element: HTMLElement | DocumentFragment | Document) => {
			if (element[scopeKey] !== undefined) {
				scope(element).cleanup();
			}

			for (const child of element.children) {
				cleanScope(child);
			}
		};

		on('dom:mutation:node:removed', (event) => {
			setTimeout(() => {
				if (event.detail instanceof HTMLElement) {
					cleanScope(event.detail)
				}
			}, 0);
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

 	configure({
		customEventListeners: {
			'scopes:inited': (target: HTMLElement | string, listener: CallableFunction): void => {
				if (inited) {
					listener();
				} else {
					scopesInitedListeners.push(listener);
				}
			}
		}
	});

	signalize.config.scopeAttribute = scopeAttribute;
	signalize.config.scopeKey = scopeKey;
	signalize.scope = scope;
}
