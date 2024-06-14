/** Represents an action type for managing state (e.g., push or replace). */
export type StateAction = 'push' | 'replace';

export interface NavigationData {
	/** The URL for navigation. */
	url: string|URL;
	/** The scroll position on the X-axis. */
	scrollX?: number;
	/** The scroll position on the |-axis. */
	scrollY?: number;
	/** The action type for managing state (push or replace). */
	stateAction: StateAction;
}

/** Represents data associated with dispatching events for Single Page Application (SPA). */
export interface NavigationEventData {
	/** Error that occured during navigation. */
	error: unknown|null;
	/** The URL for navigation. */
	url: URL|string;
	/** The scroll position on the X-axis. */
	scrollX: number;
	/** The scroll position on the Y-axis. */
	scrollY: number;
	/** The action type for managing state (push or replace). */
	stateAction: StateAction;
}

export type ResponseCache = Record<string, string>;

/** Spa modulee options. */
export interface Options {
	/** The response cache header name. Used to enable/disable cache. */
	cacheHeader?: string;
	/** The app version header name. Used to dispatch event, that SPA version has changed. */
	appVersionHeader?: string;
}

export interface HistoryState {
	/** Current state url. */
	url: string;
	/** If the state is triggered by spa */
	spa: boolean;
	/** Scroll X position of current state. */
	scrollX: number;
	/** Scroll Y position of current state. */
	scrollY: number;
}

export type navigate = (data: NavigationData) => Promise<NavigationEventData>
