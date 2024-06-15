export type observeIntersection = (eleemnt: Element, callback: IntersectionObserverCallback, options?: IntersectionObserverInit) => IntersectionObserver

export interface IntersectionObserverModuleEports {
	observeIntersection: observeIntersection
}
