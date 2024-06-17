/**
 * @type {import('../../types/Signalize').Module<
 *  import('../../types/modules/ajax').AjaxModule,
 *  import('../../types/modules/ajax').AjaxModuleConfig
 * >}
 */
export default async ({ resolve }, config) => {
	const { dispatch } = await resolve('event');

	/** @type {import('../../types/modules/ajax').ajax} */
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
				'X-Requested-With': config?.requestedWithHeader ?? 'XMLHttpRequest',
				Accept: config?.acceptHeader ?? '*'
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
