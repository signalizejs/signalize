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
		const requestOptions = { ...options };
		/** @type {Response|null} */
		let response = null;
		/** @type {Error | null} */
		let error = null;
		const isBodyDefined = options?.body !== undefined;

		try {
			requestOptions.headers = {
				'X-Requested-With': config?.requestedWithHeader ?? 'XMLHttpRequest',
				'X-Current-Url': window.location.href,
				Accept: config?.acceptHeader ?? '*',
				...options.headers ?? {}
			}

			if (isBodyDefined) {
				requestOptions.method = 'POST';

				if (!['string', 'number'].includes(typeof requestOptions.body) && !(requestOptions.body instanceof FormData)) {
					requestOptions.body = JSON.stringify(options.body);
					requestOptions.headers['Content-Type'] = 'application/json';
				}
			}

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
