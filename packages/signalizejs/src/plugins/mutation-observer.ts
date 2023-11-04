import type Signalize from '..';
import type { CustomEventListener } from './on';

declare module '..' {
	interface Signalize {
		observeMutations: (root: HTMLElement | Document | DocumentFragment, options: ObserverOptions) => void
	}

	interface CustomEventListeners {
		'dom:mutation': CustomEventListener
		'dom:mutation:node:added': CustomEventListener
		'dom:mutation:node:removed': CustomEventListener
	}
}

type ObserveCallback = (mutationRecords: MutationRecord[]) => void;

interface ObserverOptions {
	callback?: ObserveCallback
	initOptions: MutationObserverInit
}

export default (signalize: Signalize): void => {
	const { dispatch } = signalize;
	signalize.observeMutations = (root: HTMLElement | Document | DocumentFragment = document, options?: ObserverOptions): MutationObserver => {
		const domMutationEvent = 'dom:mutation';
		const domMutationNodeAddedEvent = 'dom:mutation:node:added';
		const domMutationNodeRemovedEvent = 'dom:mutation:node:removed';
		let callback = options?.callback ?? undefined;
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

		const observer = new MutationObserver(callback)
		observer.observe(root, { childList: true, subtree: true, attributes: true, ...options?.initOptions ?? {} });
		return observer;
	}
}
