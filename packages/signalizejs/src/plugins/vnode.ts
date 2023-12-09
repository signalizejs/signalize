import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		Vnode: Vnode
		vnode: (node: Node) => VnodeInterface
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
		}

		cleanup = (callback?: CallableFunction): void => {
			if (callback !== undefined) {
				this.#cleanups.add(callback);
				return
			}

			const cleanChildren = (node: Node): void => {
				for (const child of [...node.childNodes]) {
					const childVnode = vnode(child);
					if (childVnode !== undefined) {
						childVnode?.cleanup();
					} else if (child instanceof Element && child.childNodes.length > 0) {
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

	const vnode = (node: Node): Vnode => {
		return node?.__signalizeVnode ?? new Vnode({ node });
	}

	$.Vnode = Vnode;
	$.vnode = vnode;
}
