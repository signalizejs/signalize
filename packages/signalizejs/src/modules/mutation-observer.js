/**
 * Ads listener that will be triggered when the dom changes within the Signalize instance root dom tree.
 *
 * @callback observeMutations
 * @param {mutationObserverListener} listener
 * @param {MutationObserverInit} [options]
 */

/**
 * Represents optimized object of MutationRecords.
 *
 * @typedef MutationNodes
 * @property {Node[]} addedNodes
 * @property {Node[]} movedNodes
 * @property {Node[]} removedNodes
 */

/**
 * @callback mutationObserverListener
 * @param {MutationNodes} mutationNodes
 */

/**
 * This method creates custom mutation observer.
 *
 * @callback createMutationObserver
 * @param {Element} root
 * @param {mutationObserverListener} listener
 * @param {MutationObserverInit} [options]
 */

/** @type {import('../../types/Signalize').Module} */
export default ($) => {
	/** @type {MutationObserver} */
	let rootObserver;
	const rootObserverListeners = new Set();

	/**
	 * @param {MutationRecord[]} mutationRecords
	 * @param {number[]} allowedNodeTypes
	 * @returns {MutationNodes}
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

	/** @type {createMutationObserver} */
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

	/** @type {observeMutations} */
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
