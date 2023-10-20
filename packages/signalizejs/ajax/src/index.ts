import type { Signalize, CustomEventListener } from 'signalizejs';

declare module 'signalizejs' {
	interface Signalize {
		ajax: (options: AjaxOptions) => Promise<AjaxReturn>
	}

	interface CustomEventListeners {
		'ajax:request:start': CustomEventListener
		'ajax:request:success': CustomEventListener
		'ajax:request:error': CustomEventListener
		'ajax:request:end': CustomEventListener
	}
}

export interface AjaxReturn {
	response: Response | null
	error: any
}

export interface AjaxOptions extends RequestInit {
	url: string
	data?: Record<string, any>
}

export default (signalize: Signalize): void => {
	const { dispatch } = signalize;

	signalize.ajax = async (options: AjaxOptions): Promise<AjaxReturn> => {
		let response: Response | null = null;
		let error: Error | null = null

		try {
			const dataType = typeof options.data;

			if (dataType !== 'undefined') {
				if (typeof options.body === 'undefined') {
					options.body = ['string', 'number'].includes(dataType)
						? options.data
						: JSON.stringify(options.data);
				}

				delete options.data;
			}

			if (typeof options.method === 'undefined' && typeof options.body !== 'undefined') {
				options.method = 'POST';
			}

			const url = options.url;

			const requestInit = { ...options };
			requestInit.headers = { ...{ 'X-Requested-With': 'XMLHttpRequest' }, ...requestInit.headers ?? {} }

			delete requestInit.url;

			const request = fetch(url, requestInit);

			dispatch('ajax:request:start', { options, request });

			response = await request;

			if (!response.ok) {
				throw new Error('Ajax error', {
					cause: {
						response
					}
				})
			}

			dispatch('ajax:request:success', { options, request });
		} catch (requestError: any) {
			response = requestError.cause?.response ?? undefined;
			error = requestError
			console.error(error);
			dispatch('ajax:request:error', { options, response, error });
		}

		dispatch('ajax:request:end', { options, response, error });

		return {
			response,
			error
		}
	}
}
