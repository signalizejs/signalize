import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		observeMutations: (
			root: Element | Document | DocumentFragment,
			listener: ObserverListener,
			options?: MutationObserverInit
		) => MutationObserver
	}
}

type ObserverListener = (evetn: string, node: Node) => void;

export default ($: Signalize): void => {
	const event = 'dom:mutation';
	const nodeEvent = `${event}:node`;

	$.observeMutations = (root, listener: ObserverListener, options?: MutationObserverInit) => {
		const observer = new MutationObserver((mutationRecords: MutationRecord[]) => {
			let removedNodes: Node[] = [];

			for (const mutation of mutationRecords) {
				listener(event, mutation);

				for (const node of mutation.addedNodes) {
					if (removedNodes.includes(node)) {
						continue;
					}
					listener(`${nodeEvent}:added`, node)
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
					)
				}
			}
		})

		observer.observe(root, {
			childList: true,
			subtree: true,
			...options ?? {}
		});

		return observer;
	}
}
