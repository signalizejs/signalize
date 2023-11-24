import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		traverseDom: <T>(options: TraverseDomOptions) => Promise<T>
	}
}

export type TraverseDomCallback = (node: Node) => Promise<void>

export type NodeType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface TraverseDomOptions {
	root: Node
	callback: TraverseDomCallback
	nodeTypes?: NodeType[]
}

export default ($: Signalize): void => {
	$.traverseDom = async <T>(options: TraverseDomOptions): Promise<T> => {
		const { root, callback, nodeTypes = [] } = options
		const canProcess = (node) => nodeTypes.includes(node.nodeType) || nodeTypes.length === 0;
		const processNode = async (node: Node): Promise<void> => {
			node = node instanceof Document ? node.documentElement : node;
			if (canProcess(node)) {
				await callback(node);
			}

			const childPromises = [];
			for (const child of node.childNodes) {
				childPromises.push(processNode(child));
			}

			await Promise.all(childPromises);
		}

		await processNode(root);

		return root as T;
	}
};
