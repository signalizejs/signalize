import type Signalize from '..';

declare module '..' {
	interface Signalize {
		traverseDom: <T>(options: TraverseDomOptions) => Promise<T>
	}
}

export type TraverseDomCallback = <T>(node: Node) => Promise<void>

export interface TraverseDomOptions {
	root: Node,
	callback: TraverseDomCallback,
	nodeTypes?: number[]
}

export default ($: Signalize): void => {
	$.traverseDom = async <T>(options: TraverseDomOptions): Promise<T> => {
		const { root, callback, nodeTypes = [] } = options
		const processNode = async (node: Node): Promise<void> => {
			if (nodeTypes.includes(node.nodeType) || nodeTypes.length === 0) {
				await callback(node);
			}

			for (const child of [...node.childNodes]) {
				await processNode(child);
			}
		}

		await processNode(root);

		return root as T;
	}
};
