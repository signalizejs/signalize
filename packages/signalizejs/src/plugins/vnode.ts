import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		vnode: (node: Node, init?: VnodeInitFunction) => VnodeInterface
	}
}

export interface VnodeInterface {
	node: Node
	cleanup: (callback?: CallableFunction) => void
}

export type VnodeInitFunction = (vnode: VnodeInterface) => void

export default ($: Signalize): void => {
	class Vnode implements VnodeInterface {
		readonly #cleanups = new Set<CallableFunction>();
		node!: Node;

		constructor ({ node }: { node: Node }) {
			this.node = node;
			node.__signalizeVnode = this;
		}

		cleanup = (callback?: CallableFunction): void => {
			if (callback !== undefined) {
				this.#cleanups.add(callback);
				return
			}

			const cleanChildren = (node: Node): void => {
				for (const child of [...node.childNodes]) {
					vnode(child)?.cleanup();

					if (child instanceof Element && child.childNodes.length > 0) {
						cleanChildren(child);
					}
				}
			}

			for (const cleanup of this.#cleanups) {
				cleanup();
			}

			this.#cleanups.clear();

			cleanChildren(this.node);
		}
	}

	const vnode = (node: Node, init?: VnodeInitFunction): Vnode | undefined => {
		if (typeof init === 'function') {
			init(node?.__signalizeVnode ?? new Vnode({ node }));
		}

		return node?.__signalizeVnode;
	}

	$.on('dom:mutation:node:removed', (event) => {
		vnode(event.detail)?.cleanup();
	});

	$.vnode = vnode;
}
