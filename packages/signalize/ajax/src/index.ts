interface AjaxReturn {
	response: Response | null
	error: any
}

export const ajax = async (input: RequestInfo | URL, init?: RequestInit | undefined): Promise<AjaxReturn> => {
	let response: Response | null = null;
	let error: Error | null = null

	try {
		response = await fetch(input, init);

		if (!response.ok) {
			throw new Error('Ajax error', {
				cause: {
					response
				}
			})
		}
	} catch (requestError: any) {
		response = requestError.cause.response ?? undefined;
		error = requestError
	}

	return {
		response,
		error
	}
}
