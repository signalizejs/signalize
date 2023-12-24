import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		vnode: (node: Node, init?: VnodeInitFunction) => VnodeInterface
	}
}

export interface VnodeInterface {
	$el: Element
	$cleanup: (callback?: CallableFunction) => void
}

export type VnodeInitFunction = (vnode: VnodeInterface) => void

export default ($: Signalize): void => {
	const { selectAll } = $;
	const vnodeKey = '__signalizeVnode';
	const refAttribute = `${$.attributePrefix}ref`;
	const componentAttribute = $.componentAttribute;

	class Vnode implements VnodeInterface {
		readonly #cleanups = new Set<CallableFunction>();
		readonly #data = {};
		readonly $ = $;
		readonly $el;

		constructor ({ node }: { node: Node }) {
			this.$el = node;
			node[vnodeKey] = this;
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
					vnode(child)?.$cleanup();

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

		$parent = (name?: string): Element | null => {
			return this.$el.closest(`[${componentAttribute}${name === undefined ? '' : `="${name}"`}]`);
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

	const vnode = (node: Node, init?: VnodeInitFunction): Vnode | undefined => {
		if (typeof init === 'function') {
			init(node[vnodeKey] ?? new Vnode({ node }));
		}

		return node[vnodeKey] ?? undefined;
	}

	$.on('dom:mutation:node:removed', (event) => {
		vnode(event.detail)?.$cleanup();
	});

	$.vnode = vnode;
}
