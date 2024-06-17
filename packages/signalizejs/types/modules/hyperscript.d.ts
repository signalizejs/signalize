import type { Signal } from "./signal";

export type HyperscriptChild = string | number | Element | Node | Signal<any>;

export interface HyperscriptChildAttrs {
	[key: string]: string | number | Signal<any>;
}

/** Create element, bind Signals and Attributes. */
export type h = <T extends HTMLElement>(
	tagName: string,
	...children: (HyperscriptChildAttrs | HyperscriptChild | HyperscriptChild[])[]
) => T;

export interface HyperscriptModule {
	h: h
}
