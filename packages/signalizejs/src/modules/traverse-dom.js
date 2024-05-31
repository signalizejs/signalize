/**
 * Asynchronously traverses the DOM starting from a given root node and invokes a callback on each node.
 *
 * @callback traverseDom
 * @param {Element} root
 * @param {(node: Node) => Promise<false|void>} callback
 * @param {number[]} [nodeTypes=[]]
 * @returns {Promise<void>}
 */

/** @type {import('../Signalize').SignalizeModule} */
export default () => ({
	/** @type {traverseDom} */
	traverseDom: async (root, callback, nodeTypes = []) => {
		/**
		 * @param {Node} node
		 * @returns {Promise<void>}
		 */
		const processNode = async (node) => {
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
		};

		await processNode(root);
	}
});
