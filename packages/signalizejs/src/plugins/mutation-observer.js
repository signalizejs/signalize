/* declare module '..' {
	interface Signalize {
		observeMutations: (
			root: Element | Document | DocumentFragment,
			listener: ObserverListener,
			options?: MutationObserverInit
		) => MutationObserver
	}
} */

/**
 * Represents a function that serves as an observer listener.
 *
 * @typedef {function} ObserverListener
 * @param {string} event - The name of the event.
 * @param {Node} node - The Node associated with the event.
 * @returns {void}
 */

/**
 * @param {import('../Signalize').Signalize} $
 * @returns {void}
 */
export default ($) => {
	const event = 'dom:mutation';
	const nodeEvent = `${event}:node`;

	/**
	 *
	 * @param {Element|Document|DocumentFragment} root
	 * @param {ObserverListener} listener
	 * @param {MutationObserverInit} [options]
	 * @returns
	 */
	$.observeMutations = (root, listener, options) => {
		/**
		 * Mutation observer for tracking changes in the DOM.
		 *
		 * @type {MutationObserver}
		 * @param {MutationRecord[]} mutationRecords - An array of MutationRecord objects representing the changes in the DOM.
		 */
		const observer = new MutationObserver((mutationRecords) => {
			/** @type {Node[]} */
			let removedNodes = [];

			for (const mutation of mutationRecords) {
				listener(event, mutation);

				for (const node of mutation.addedNodes) {
					if (removedNodes.includes(node)) {
						continue;
					}
					listener(`${nodeEvent}:added`, node);
				}

				if (mutation.removedNodes.length) {
					removedNodes = [...mutation.removedNodes];
				}

				for (const node of mutation.removedNodes) {
					listener(
						($.root instanceof Document ? $.root.contains(node) : $.root.ownerDocument.contains(node))
							? `${nodeEvent}:moved`
							: `${nodeEvent}:removed`
						,
						node
					);
				}
			}
		});

		observer.observe(root, {
			childList: true,
			subtree: true,
			...options ?? {}
		});

		return observer;
	};
};
