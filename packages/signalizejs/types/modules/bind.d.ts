import type { Signal } from '../../types/modules/signal';

/**  Interface defining configuration for an attribute. */
export interface AttributeConfig {
	/** Optional setter function for the attribute. */
	set?: (value: any) => void;
	/** Optional getter function for the attribute. */
	get?: () => any;
}

/** Function type to bind attributes to an element. */
export type bind = (
	element: HTMLElement,
	attributes: Record<string, AttributeConfig | Signal<any>>
) => void;

export interface BindModule {
	bind: bind
}
