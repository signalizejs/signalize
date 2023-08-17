import { dispatch } from 'signalizejs';

export interface AjaxReturn {
	response: Response | null
	error: any
}

export interface AjaxOptions extends RequestInit {
	url: string
	data?: Record<string, any>
}

export const ajax = async (options: AjaxOptions): Promise<AjaxReturn> => {
	let response: Response | null = null;
	let error: Error | null = null

	try {
		const dataType = typeof options.data;

		if (dataType !== 'undefined') {
			if (typeof options.body === 'undefined') {
				options.body = ['string', 'number'].includes(dataType) ? options.data : JSON.parse(options.data);
			}

			delete options.data;
		}

		if (typeof options.method === 'undefined' && typeof options.body !== 'undefined') {
			options.method = 'POST';
		}

		const url = options.url;

		delete options.url;

		const request = fetch(url, options);

		dispatch('ajax:request:start', { input, init, request });

		response = await request;

		if (!response.ok) {
			throw new Error('Ajax error', {
				cause: {
					response
				}
			})
		}

		dispatch('ajax:request:success', { input, init, request });
	} catch (requestError: any) {
		response = requestError.cause.response ?? undefined;
		error = requestError
		dispatch('ajax:request:error', { input, init, response, error });
	}

	dispatch('ajax:request:end', { input, init, response, error });

	return {
		response,
		error
	}
}
