import type Signalize from '..';

declare module '..' {
	interface Signalize {
		observe: (root: HTMLElement | Document | DocumentFragment, callback?: ObserveCallback) => void
	}
}

type ObserveCallback = (mutationRecords: MutationRecord[]) => void;

export default (signalize: Signalize): void => {
	const { dispatch } = signalize;
	signalize.observe = (root: HTMLElement | Document | DocumentFragment = document, callback?: ObserveCallback): void => {
		const domMutationEvent = 'dom-mutation';
		const domMutationNodeAddedEvent = 'dom-mutation:node:added';
		const domMutationNodeRemovedEvent = 'dom-mutation:node:removed';

		if (callback === undefined) {
			callback = (mutationRecords: MutationRecord[]) => {
				for (const mutation of mutationRecords) {
					dispatch(domMutationEvent, mutation);

					for (const node of mutation.addedNodes) {
						dispatch(domMutationNodeAddedEvent, node)
					}

					for (const node of mutation.removedNodes) {
						dispatch(domMutationNodeRemovedEvent, node)
					}
				}
			}
		}

		new MutationObserver(callback).observe(root, { childList: true, subtree: true, attributes: true });
	}
}