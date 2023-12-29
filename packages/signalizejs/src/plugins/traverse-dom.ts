import type { Signalize, SignalizePlugin } from '..';

declare module '..' {
	interface Signalize {
		traverseDom: (root: Node, callback: (node: Node) => Promise<void>, nodeTypes?: NodeType[]) => Promise<void>
	}
}

export type NodeType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export default (): SignalizePlugin => {
	return ($: Signalize) => {
		$.traverseDom = async (root, callback, nodeTypes = []): Promise<void> => {
			const processNode = async (node: Node): Promise<void> => {
				node = node instanceof Document ? node.documentElement : node;
				if (nodeTypes.includes(node.nodeType) || nodeTypes.length === 0) {
					const processChildren = await callback(node);
					if (processChildren === false) {
						return;
					}
				}

				const childPromises = [];
				for (const child of node.childNodes) {
					childPromises.push(processNode(child));
				}

				await Promise.all(childPromises);
			}

			await processNode(root);
		}
	}
};