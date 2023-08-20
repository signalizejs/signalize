import { dispatch } from './dispatch';

type ObserveCallback = (mutationRecords: MutationRecord[]) => void;

export const observe = (root: HTMLElement | Document | DocumentFragment = document, callback?: ObserveCallback): void => {
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

	new MutationObserver(callback).observe(document, { childList: true, subtree: true, attributes: true });
}
