import type Signalize from '..';

declare module '..' {
	interface Signalize {
		scope: (nameOrElement: string | HTMLElement | Document | DocumentFragment, init: ScopeInitFunction) => void | ScopeInstance
	}
}

type ScopeInitFunction = (Scope: Scope) => void;

export class Scope {
	element: HTMLElement | Document | DocumentFragment;
	data;
	#cleanups = new Set<CallableFunction>();

	constructor ({
		signalize,
		element,
		init,
		data = {}
	}: {
		signalize: Signalize
		element: HTMLElement | Document | DocumentFragment
		init: CallableFunction
		data?: Record<string, any>
	}) {
		const { merge, CallableClass } = signalize;
		this.element = element;

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

		class CallableData extends CallableClass {
			set(target, key, newValue) {
				data[key] = newValue;
				return true;
			}
			apply() {
				return merge(data, getElementData(element.parentNode))
			}
		}

		this.data = new CallableData();
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
		const refEl = ref<T>(id, this.element);
		return refEl !== null && this.#parentScopeIsEl(refEl) ? refEl : null
	}

	refs (id: string): HTMLElement[] {
		return [...refs(id, this.element)].filter(this.#parentScopeIsEl)
	}

	#parentScopeIsEl (): boolean {
		return (refElement: HTMLElement): boolean => refElement.closest(`[${scopeAttribute}]`) === el;
	}
}

export default (signalize: Signalize): void => {
	const { isDomReady, onDomReady, on, config, selectAll, isVisible } = signalize;

	const scopeKey = '__signalizeScope';
	let scopeAttribute = 'scope'
	const definedScopes: Record<string, ScopeInitFunction> = {};
	const initScope = (element: HTMLElement, init?): void => {
		if (init === undefined) {
			init = definedScopes[element.getAttribute(scopeAttribute)];
		}

		if (element[scopeKey] !== undefined) {
			init(element[scopeKey]);
			return;
		}

		new Scope({ signalize, init, element });
	}

	const initScopes = (root: HTMLElement, name?: string): void => {
		const nameIsDefined = name !== undefined;
		const selector = nameIsDefined ? `[${scopeAttribute}="${name}"]` : `[${scopeAttribute}]`;
		for (const element of selectAll<HTMLElement>(selector, root)) {
			if (element[scopeKey] !== undefined) {
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
		}

		if (!isDomReady()) {
			return;
		}

		if (nameIsDefined) {
			initScopes(document.documentElement, name);
			return;
		}

		initScope(element, init);
		return element[scopeKey];
	};

	onDomReady(() => {
		scopeAttribute = `${config.attributesPrefix}${scopeAttribute}`;

		initScopes(config.root);

		const cleanScope = (element: HTMLElement | DocumentFragment | Document) => {
			if (element[scopeKey] !== undefined) {
				scope(element).cleanup();
			}

			for (const child of element.children) {
				cleanScope(child);
			}
		};

		on('dom-mutation:node:removed', (event) => {
			setTimeout(() => {
				if (event.detail instanceof HTMLElement) {
					cleanScope(event.detail)
				}
			}, 0);
		});

		on('dom-mutation:node:added' as keyof CustomEventListener, document, ({ detail }: { detail: Node }): void => {
			if (!(detail instanceof HTMLElement)) {
				return;
			}

			if (scope(detail)) {
				return;
			}

			initScopes(detail);
		});
	});

	signalize.scope = scope;
	signalize.initScope = initScope;
}
