/**
 * @returns {import('../Signalize').SignalizePlugin}
 */
export default () => ({
	/**
	 * Asynchronously traverses the DOM starting from a given root node and invokes a callback on each node.
	 *
	 * @param {Node} root - The root node from which to start the traversal.
	 * @param {(node: Node) => Promise<void>} callback - The asynchronous callback function to be invoked on each node.
	 * @param {number[]} [nodeTypes=[]] - An optional array of node types to limit the traversal to.
	 * @returns {Promise<void>} A promise that resolves when the traversal is complete.
	 */
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
