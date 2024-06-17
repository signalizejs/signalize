export type observeIntersection = (eleemnt: Element, callback: IntersectionObserverCallback, options?: IntersectionObserverInit) => IntersectionObserver

export interface IntersectionObserverModule {
	observeIntersection: observeIntersection
}
