/** Mutation observer listener type */
export type mutationObserverListener = (mutationNodes: MutationNodes) => void;

/** Optimized MutationRecords object */
export interface MutationNodes {
  addedNodes: Node[];
  movedNodes: Node[];
  removedNodes: Node[];
}

/** Custom mutation observer creation function */
export type createMutationObserver = (root: Element, listener: mutationObserverListener, options?: MutationObserverInit) => MutationObserver;

/**
 * Observe dom mutations.
 * This function returns a callback that will remove the listener.
 */
export type observeMutations = (listener: mutationObserverListener, options?: MutationObserverInit) => () => void;

export interface MutationObserverModule {
	observeMutations: observeMutations;
	createMutationObserver: createMutationObserver;
}
