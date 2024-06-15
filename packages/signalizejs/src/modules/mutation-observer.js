/** @type {import('../../types/Signalize').Module<import('../../types/index').MutationObserverModule>} */
export default ($) => {
	/** @type {MutationObserver} */
	let rootObserver;
	const rootObserverListeners = new Set();

	/**
	 * @param {MutationRecord[]} mutationRecords
	 * @param {number[]} allowedNodeTypes
	 * @returns {import('../../types/index').MutationNodes}
	 */
	const processMutationObserverRecords = (mutationRecords, allowedNodeTypes = []) => {
		/** @type {Node[]} */
		const addedNodes = [];
		/** @type {Node[]} */
		const removedNodes = [];
		/** @type {Node[]} */
		const movedNodes = [];

		/**
		 * @param {number} nodeType
		 * @returns {boolean}
		 */
		const isAllowedNode = (nodeType) => allowedNodeTypes.includes(nodeType);

		for (const mutation of mutationRecords) {
			for (const removedNode of removedNodes) {
				if (isAllowedNode(removedNode.nodeType)) {
					removedNodes.push(removedNode);
				}
			}

			for (const addedNode of mutation.addedNodes) {
				if (!isAllowedNode(addedNode.nodeType)) {
					continue;
				}

				if (removedNodes.includes(addedNode)) {
					movedNodes.push(addedNode);
				} else {
					addedNodes.push(addedNode);
				}
			}
		}

		return {
			addedNodes,
			removedNodes,
			movedNodes
		};
	};

	/** @type {import('../../types/index').createMutationObserver} */
	const createMutationObserver = (root, listener, options)  => {
		const observer = new MutationObserver((mutationRecords) => {
			const nodes = processMutationObserverRecords(mutationRecords);
			listener(nodes);
		});

		observer.observe(root, {
			childList: true,
			subtree: true,
			...options ?? {}
		});

		return observer;
	};

	/** @type {import('../../types/index').observeMutations} */
	const observeMutations = (listener) => {
		if (rootObserver === undefined) {
			rootObserver = new MutationObserver((mutationRecords) => {
				const nodes = processMutationObserverRecords(mutationRecords, [1]);

				for (const listener of rootObserverListeners) {
					listener(nodes);
				}
			});

			rootObserver.observe($.root, {
				childList: true,
				subtree: true,
			});
		}

		if (!rootObserverListeners.has(listener)) {
			rootObserverListeners.add(listener);
		}

		return () => rootObserverListeners.delete(listener);
	};

	return {
		observeMutations,
		createMutationObserver
	};
};
