interface OffsetInfo {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

/** Returns info about element offset. */
export type offset = (element: Element) => OffsetInfo

export interface OffsetModule {
	offset: offset
}
