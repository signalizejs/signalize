import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		scope: (node: Node, init?: ScopeInitFunction) => ScopeInterface
	}
}

export interface ScopeInterface {
	$el: Element
	$cleanup: (callback?: CallableFunction) => void
}

export type ScopeInitFunction = (scope: ScopeInterface) => void

export default ($: Signalize): void => {
	const { selectAll } = $;
	const scopeKey = '__signalizeScope';
	const refAttribute = `${$.attributePrefix}ref`;
	const componentAttribute = $.componentAttribute;

	class Scope implements ScopeInterface {
		readonly #cleanups = new Set<CallableFunction>();
		readonly #data = {};
		readonly $ = $;
		readonly $el;

		constructor ({ node }: { node: Node }) {
			this.$el = node;
			node[scopeKey] = this;
		}

		get $data() {
			return new Proxy(this.#data, {
				get: (target, key) => target[key],
				set: (target, key, val) => {
					target[key] = val;
					this[key] = val;
					return true;
				},
				deleteProperty: (target, key) => {
					delete target[key];
					delete this[key];
					return true;
				}
			});
		}

		set $data (data) {
			for (const key in this.$data) {
				delete this.$data[key];
			}

			for (const key in data) {
				this.$data[key] = data[key];
			}
		}

		$cleanup = (callback?: CallableFunction): void => {
			if (callback !== undefined) {
				this.#cleanups.add(callback);
				return
			}

			const cleanChildren = (element: Element): void => {
				for (const child of [...element.childNodes]) {
					scope(child)?.$cleanup();

					if (child instanceof Element && child.childNodes.length > 0) {
						cleanChildren(child);
					}
				}
			}

			for (const cleanup of this.#cleanups) {
				cleanup();
			}

			this.#cleanups.clear();

			cleanChildren(this.$el);
		}

		$ref = (name: string): Element | null => {
			return this.$refs(name)[0] ?? null;
		}

		$refs = (name: string): Element[] => {
			return [...selectAll(`[${refAttribute}=${name}]`, this.$el)].filter((element) => {
				return element.closest(`[${componentAttribute}]`) !== this.$el;
			});
		}
	}

	const scope = (node: Node, init?: ScopeInitFunction): Scope | undefined => {
		if (typeof init === 'function') {
			init(node[scopeKey] ?? new Scope({ node }));
		}

		return node[scopeKey] ?? undefined;
	}

	$.on('dom:mutation:node:removed', (event) => {
		scope(event.detail)?.$cleanup();
	});

	$.scope = scope;
}
