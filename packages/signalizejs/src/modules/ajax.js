/**
 * Represents the result of a fetch operation, containing the response and any potential error.
 *
 * @typedef FetchReturn
 * @property {Response | null} response - The response from the fetch operation (or null if an error occurred).
 * @property {Error|null} error - Any error that occurred during the fetch operation.
 */

/**
 * Options for configuring a plugin related to fetch operations.
 *
 * @typedef PluginOptions
 * @property {string} [requestedWithHeader] - The value for the 'Requested-With' header (optional).
 * @property {string} [acceptHeader] - The value for the 'Accept' header (optional).
 */

/** @type {import('../Signalize').SignalizeModule} */
export default async ({ resolve }, pluginOptions) => {
	const { dispatch } = await resolve('event');
	/**
	 * Asynchronously performs a fetch operation with the given resource and options.
	 *
	 * @function
	 * @param {RequestInfo | URL} resource - The URL or request information for the fetch operation.
	 * @param {RequestInit | undefined} [options={}] - Optional configuration for the fetch operation.
	 * @returns {Promise<FetchReturn>} A promise that resolves to the result of the fetch operation.
	 */
	const ajax = async (resource, options = {}) => {
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
				if (['string', 'number'].includes(typeof options.body)) {
					requestOptions.body = JSON.stringify(options.body);
					requestOptions.headers['Content-Type'] = 'application/json';
				}

				if (options?.headers !== undefined) {
					requestOptions.headers = { ...requestOptions.headers, ...customOptions.headers };
					delete customOptions.headers;
				}
			}

			requestOptions = { ...options, ...requestOptions, ...customOptions };

			const request = fetch(resource, requestOptions);

			dispatch('ajax:request:start', { resource, options: requestOptions, request });

			response = await request;

			if (!response.ok) {
				throw new Error('Ajax error', {
					cause: {
						response
					}
				});
			}

			dispatch('ajax:request:success', { resource, options: requestOptions, request });
		} catch (requestError) {
			response = requestError.cause?.response ?? undefined;
			error = requestError;
			console.error(error);
			dispatch('ajax:request:error', { resource, options: requestOptions, response, error });
		}

		dispatch('ajax:request:end', { resource, options: requestOptions, response, error });

		return {
			response,
			error
		};
	};

	return { ajax };
};
