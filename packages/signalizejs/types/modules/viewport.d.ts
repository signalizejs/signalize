export interface IsInViewportInfo {
	top: boolean;
	bottom: boolean;
	whole: boolean;
}

/** Information about the visibility of an element within the viewport. */
export type isInViewport = (element: Element) => IsInViewportInfo

export interface ViewportModule {
	isInViewport: isInViewport
}
