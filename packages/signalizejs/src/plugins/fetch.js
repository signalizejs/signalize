/* declare module '..' {
	interface Signalize {
		fetch: <T>(rresource: RequestInfo | URL, options?: RequestInit | undefined) => Promise<FetchReturn<T>>
	}

	interface CustomEventListeners {
		'fetch:request:start': CustomEventListener
		'fetch:request:success': CustomEventListener
		'fetch:request:error': CustomEventListener
		'fetch:request:end': CustomEventListener
	}
} */

/**
 * Represents the result of a fetch operation, containing the response and any potential error.
 *
 * @interface FetchReturn
 * @property {Response | null} response - The response from the fetch operation (or null if an error occurred).
 * @property {any} error - Any error that occurred during the fetch operation.
 */

/**
 * Options for configuring a plugin related to fetch operations.
 *
 * @interface PluginOptions
 * @property {string} [requestedWithHeader] - The value for the 'Requested-With' header (optional).
 * @property {string} [acceptHeader] - The value for the 'Accept' header (optional).
 * @property {boolean} [forceMultipartFormData] - Indicates whether to force using multipart/form-data (optional).
 */

/**
 * @param {Pluginoptions} [options]
 * @returns {import('../Signalize').SignalizePlugin}
 */
export default (pluginOptions) => {
	/**
	 * @param {import('../Signalize').Signalize} $
	 * @returns {void}
	 */
	return ($) => {
		const { dispatch } = $;
		/**
		 * Asynchronously performs a fetch operation with the given resource and options.
		 *
		 * @function
		 * @param {RequestInfo | URL} resource - The URL or request information for the fetch operation.
		 * @param {RequestInit | undefined} [options={}] - Optional configuration for the fetch operation.
		 * @returns {Promise<FetchReturn>} A promise that resolves to the result of the fetch operation.
		 */
		$.fetch = async (resource, options = {}) => {
			const customOptions = {...options };
			/** @type {Response|null} */
			let response = null;
			/** @type {Error | null} */
			let error = null;
			const isBodyDefined = options?.body !== undefined;
			/** @type {RequestInit} */
			let requestOptions = {
				headers: {
					'X-Requested-With': pluginOptions?.requestedWithHeader ?? 'XMLHttpRequest',
					Accept: pluginOptions?.acceptHeader ?? '*'
				}
			};

			try {

				if (isBodyDefined) {
					requestOptions.method = 'POST';
					if (options.body instanceof FormData) {
						requestOptions.headers['Content-Type'] = pluginOptions?.forceMultipartFormData === true ||
							Array.from(options.body.values()).some((value) => {
								return value instanceof Blob || value instanceof File;
							})
							? 'multipart/form-data'
							: 'application/x-www-form-urlencoded';
					} else if (['string', 'number'].includes(typeof options.body)) {
						requestOptions.body = JSON.stringify(options.body);
						requestOptions.headers['Content-Type'] = 'application/json';
					}

					if (options?.headers !== undefined) {
						requestOptions.headers = { ...requestOptions.headers, ...customOptions.headers };
						delete customOptions.headers;
					}
				}

				requestOptions = { ...requestOptions, ...customOptions };
				const request = fetch(resource, requestOptions);

				dispatch('fetch:request:start', { resource, options: requestOptions, request });

				response = await request;

				if (!response.ok) {
					throw new Error('Ajax error', {
						cause: {
							response
						}
					});
				}

				dispatch('fetch:request:success', { resource, options: requestOptions, request });
			} catch (requestError) {
				response = requestError.cause?.response ?? undefined;
				error = requestError;
				console.error(error);
				dispatch('fetch:request:error', { resource, options: requestOptions, response, error });
			}

			dispatch('fetch:request:end', { resource, options: requestOptions, response, error });

			return {
				response,
				error
			};
		};
	};
};
