import type { Signalize } from '..';
import type { CustomEventListener } from './on';

declare module '..' {
	interface Signalize {
		Scope: Scope
		scope: (nameOrElement: string | Element | Document | DocumentFragment, init: ScopeInitFunction) => undefined | Scope
		cloakAttribute: string
		scopeAttribute: string
		scopeKey: string
	}

	interface CustomEventListeners {
		'scope:init': CustomEventListener
		'scope:defined': CustomEventListener
	}
}

type ScopeInitFunction = (Scope: Scope) => void | Promise<void>;

export interface Scope {
	element: Element | Document | DocumentFragment
	data: ProxyConstructor
	cleanup: (callback: CallableFunction) => void
	ref: <T extends Element>(id: string) => T | null
	refs: <T extends Element>(id: string) => T[]
}

export default ($: Signalize): void => {
	const { on } = $;

	const scopeKey = '__signalizeScope';
	$.cloakAttribute = `${$.attributePrefix}cloak`;
	$.scopeAttribute = `${$.attributePrefix}scope`;

	const scopeInitListeners = [];
	$.customEventListener('scope:init', ({ listener }) => {
		scopeInitListeners.push(listener);
	})

	class ElementScope implements Scope {
		readonly #cleanups = new Set<CallableFunction>();
		#localData = {};

		element: Element | Document | DocumentFragment;
		initPromise: Promise<void> | void;

		constructor({
			element,
			initializer
		}: {
			element: Element | Document | DocumentFragment,
			initializer: ScopeInitFunction
		}) {
			this.element = element;
			this.element[scopeKey] = this;
			this.initPromise = initializer(this);
		}

		set data (newValue) {
			this.#localData = newValue;
		}

		get data (): ProxyConstructor {
			const getScopedData = (element, data = {}) => {
				if (element === null) {
					return data;
				}

				return { ...data, ...scope(element)?.data ?? getScopedData(element.parentNode, data) }
			}
			const getParentData = (element, key: string): any => {
				if (element === null) {
					return;
				}

				return element[scopeKey] === undefined ? getParentData(element.parentNode, key) : scope(element).data[key];
			}

			const setParentData = (element, key: string, value: any) => {
				if (element === null) {
					return false;
				}

				if (element[scopeKey] !== undefined) {
					scope(element).data[key] = value;
				} else {
					setParentData(element.parentNode, key, value);
				}
			}
			this.#localData = {...getScopedData(this.element.parentNode), ...this.#localData};

			return new Proxy(this.#localData, {
				set: (target, key: string, newValue: any) => {
					target[key] = newValue;
					return true;
				},
				get: (target, key) => {
					return target[key];
				}
			})
		}

		cleanup = (callback: CallableFunction): void => {
			if (callback !== undefined) {
				this.#cleanups.add(callback);
				return
			}

			const cleanChildren = (element) => {
				for (const child of [...element.childNodes]) {
					const childScope = scope(child);
					if (childScope !== undefined) {
						childScope?.cleanup();
					} else if (child instanceof Element && child.childNodes.length) {
						cleanChildren(child);
					}
				}
			}

			for (const cleanup of this.#cleanups) {
				cleanup();
			}

			this.#cleanups.clear();

			cleanChildren(this.element);
		}

		ref = <T extends Element>(id: string): T | null => {
			return this.refs<T>(id)[0] ?? null;
		}

		refs = <T extends Element>(id: string): T[] => {
			return [...$.selectAll<T>(
				`[${$.attributePrefix}ref="${id}"]`,
				this.element
			)].filter((element: Element) => {
				return element.closest(
					`[${$.attributePrefix}scope]`
				) === this.element
			})
		}
	}

	const definedScopes: Record<string, ScopeInitFunction> = {};

	const scope = (nameOrElement: string | Element | Document | DocumentFragment, init?: ScopeInitFunction): undefined | Scope => {
		if (typeof nameOrElement === 'string') {
			if (nameOrElement in definedScopes) {
				throw new Error(`Scope "${nameOrElement}" is already defined.`);
			}
			definedScopes[nameOrElement] = init;
			$.dispatch('scope:defined', { name: nameOrElement });
		} else if (typeof init === 'function') {
			if (nameOrElement[scopeKey] === undefined) {
				nameOrElement[scopeKey] = new ElementScope({
					element: nameOrElement,
					initializer: init
				})
			} else {
				init(nameOrElement[scopeKey]);
			}
		}

		return nameOrElement[scopeKey];
	};

	const traverseDomTree = async (root: Element): Promise<void> => {
		await $.traverseDom(
			root,
			async (element: Element): Promise<void> => {
				let rootScope;
				let nodeScopeName = element.getAttribute($.scopeAttribute)

				if (nodeScopeName && nodeScopeName in definedScopes) {
					rootScope = scope(element, definedScopes[nodeScopeName]);
					await rootScope.initPromise;
				}

				const listenerPromises = [];
				for (const scopeInitListener of scopeInitListeners) {
					listenerPromises.push(scopeInitListener({ element, scope: rootScope }));
				}

				await Promise.all(listenerPromises);

				element.removeAttribute($.cloakAttribute);
			},
			[1]
		);
	}

	on('signalize:ready', () => {
		on('dom:ready', async (event) => {
			await traverseDomTree($.root);

			on('scope:defined', (event) => {
                let selector = `[${$.scopeAttribute}="${event.detail.name}"]`;
                for (const element of $.selectAll(selector)) {
                    if (element.parentNode.closest(selector)) {
                        continue;
                    }
                    traverseDomTree(element);
                }
            });

			on('dom:mutation:node:removed', (event) => {
				scope(event.detail)?.cleanup();
			});

			on('dom:mutation:node:added' as keyof CustomEventListener, $.root, ({ detail }: { detail: Node }): void => {
				if (!(detail instanceof Element) || scope(detail) !== undefined) {
					return;
				}
				void traverseDomTree(detail);
			});
		});
	});

	$.Scope = ElementScope;
	$.scope = scope;
}
