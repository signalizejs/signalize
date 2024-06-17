export type width = (element: Element|Document) => number;
export type height = (element: Element|Document) => number;

export interface SizesModule {
	height: height;
	width: width;
}
