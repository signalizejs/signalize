import { dispatch } from './dispatch';
import { $config, onDomReady } from '.';

let domMutationEvent = 'dom-mutation';
let domMutationNodeAddedEvent = 'dom-mutation:node:added';
let domMutationNodeRemovedEvent = 'dom-mutation:node:removed';

onDomReady(() => {
	domMutationEvent = `${$config.attributesPrefix}${domMutationEvent}`;
	domMutationNodeAddedEvent = `${$config.attributesPrefix}${domMutationNodeAddedEvent}`;
	domMutationNodeRemovedEvent = `${$config.attributesPrefix}${domMutationNodeRemovedEvent}`;

	new MutationObserver((mutationList): void => {
		for (const mutation of mutationList) {
			dispatch($config.domMutationEvent, mutation);

			for (const node of mutation.addedNodes) {
				dispatch($config.domMutationNodeAddedEvent, node)
			}

			for (const node of mutation.removedNodes) {
				dispatch($config.domMutationNodeRemovedEvent, node)
			}
		}
	}).observe(document, { childList: true, subtree: true, attributes: true });
})
