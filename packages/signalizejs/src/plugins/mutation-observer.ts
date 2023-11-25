import type { Signalize } from '..';
import type { CustomEventListener } from './on';

declare module '..' {
	interface Signalize {
		observeMutations: (root: Element | Document | DocumentFragment, options?: ObserverOptions) => void
	}

	interface CustomEventListeners {
		'dom:mutation': CustomEventListener
		'dom:mutation:node:added': CustomEventListener
		'dom:mutation:node:moved': CustomEventListener
		'dom:mutation:node:removed': CustomEventListener
	}
}

type ObserveCallback = (mutationRecords: MutationRecord[]) => void;

interface ObserverOptions {
	callback?: ObserveCallback
	initOptions: MutationObserverInit
}

export default ($: Signalize): void => {
	$.observeMutations = (root = $.root, options?) => {
		const event = 'dom:mutation';
		const nodeEvent = `${event}:node`;
		const nodeAddedEvent = `${nodeEvent}:added`;
		const nodeRemovedEvent = `${nodeEvent}:removed`;
		const nodeMovedEvent = `${nodeEvent}:moved`;
		let callback = options?.callback ?? undefined;

		const dispatch = (event: string, data: Node): void => {
			if (callback !== undefined) {
				return;
			}

			$.dispatch(event, data);
		}

		if (callback === undefined) {
			callback = (mutationRecords: MutationRecord[]) => {
				let removedNodes: Node[] = [];
				for (const mutation of mutationRecords) {
					dispatch(event, mutation);

					for (const node of mutation.addedNodes) {
						if (removedNodes.includes(node)) {
							continue;
						}
						dispatch(nodeAddedEvent, node)
					}

					if (mutation.removedNodes.length) {
						removedNodes = [...mutation.removedNodes];
					}

					for (const node of mutation.removedNodes) {
						dispatch(
							($.root instanceof Document ? $.root.contains(node) : $.root.ownerDocument.contains(node))
								? nodeMovedEvent
								: nodeRemovedEvent
							,
							node
						)
					}
				}
			}
		}

		const observer = new MutationObserver(callback)
		observer.observe(root, { childList: true, subtree: true, attributes: true, ...options?.initOptions ?? {} });
		return observer;
	}
}
