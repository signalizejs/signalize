/** Represents the result of a fetch operation. */
export interface AjaxReturn {
	/** The response from the fetch operation (or null if an error occurred). */
	response: Response | null;
	/** Any error that occurred during the fetch operation. */
	error: Error | null;
}

/** Options for configuring a fetch-related plugin. */
export interface AjaxModuleConfig {
	/** The value for the 'Requested-With' header. */
	requestedWithHeader?: string;
	/** The value for the 'Accept' header. */
	acceptHeader?: string;
}

/**
 * Performs a fetch operation with the given resource and options.
 * Args are the same line in Native Fetch.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
export type ajax = (resource: RequestInfo | URL, options?: RequestInit) => Promise<AjaxReturn>;

export interface AjaxModule {
	ajax: ajax
}
