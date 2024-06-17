/** @type {import('../../../types/Signalize').Module<import('../../../types/modules/dom/traverser').DomTraverserDomModule>} */
export default () => ({
	/** @type {import('../../../types/modules/dom/traverser').traverseDom} */
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
