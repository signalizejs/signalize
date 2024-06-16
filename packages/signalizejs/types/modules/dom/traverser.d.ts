export type traverseRootCallback = (node: Node) => Promise<false|void>

/** Asynchronously traverses the DOM starting from a given root node and invokes a callback on each node. */
export type traverseDom = (root: Element, callback: traverseRootCallback, nodeTypes: number[]) => Promise<void>

export interface DomTraverserDomModule {
	traverseDom: traverseDom
}
