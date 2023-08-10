import { dispatch } from 'signalizejs';

interface AjaxReturn {
	response: Response | null
	error: any
}

export const ajax = async (input: RequestInfo | URL, init?: RequestInit | undefined): Promise<AjaxReturn> => {
	let response: Response | null = null;
	let error: Error | null = null

	try {
		const request = fetch(input, init);

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
