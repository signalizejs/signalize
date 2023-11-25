import type { Signalize, SignalizePlugin } from '..';
import type { CustomEventListener } from './on';

declare module '..' {
	interface Signalize {
		fetch: <T>(rresource: RequestInfo | URL, options?: RequestInit | undefined) => Promise<FetchReturn<T>>
	}

	interface CustomEventListeners {
		'fetch:request:start': CustomEventListener
		'fetch:request:success': CustomEventListener
		'fetch:request:error': CustomEventListener
		'fetch:request:end': CustomEventListener
	}
}

export interface FetchReturn {
	response: Response | null
	error: any
}

export interface PluginOptions {
	requestedWithHeader?: string
	acceptHeader?: string
	forceMultipartFormData?: boolean
}

export default (pluginOptions?: PluginOptions): SignalizePlugin => {
	return ($: Signalize) => {
		const { dispatch } = $;
		$.fetch = async (resource: RequestInfo | URL, options: RequestInit | undefined = {}): Promise<FetchReturn> => {
			const customOptions = {...options };
			let response: Response | null = null;
			let error: Error | null = null
			const isBodyDefined = options?.body !== undefined
			let requestOptions: RequestInit = {
				headers: {
					'X-Requested-With': pluginOptions?.requestedWithHeader ?? 'XMLHttpRequest',
					Accept: pluginOptions?.acceptHeader ?? '*'
				}
			}

			try {

				if (isBodyDefined) {
					requestOptions.method = 'POST';
					if (options.body instanceof FormData) {
						requestOptions.headers['Content-Type'] = pluginOptions?.forceMultipartFormData === true ||
							Array.from(options.body.values()).some((value) => {
								return value instanceof Blob || value instanceof File
							})
							? 'multipart/form-data'
							: 'application/x-www-form-urlencoded';
					} else if (['string', 'number'].includes(typeof options.body)) {
						requestOptions.body = JSON.stringify(options.body);
						requestOptions.headers['Content-Type'] = 'application/json'
					}

					if (options?.headers !== undefined) {
						requestOptions.headers = { ...requestOptions.headers, ...customOptions.headers }
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
					})
				}

				dispatch('fetch:request:success', { resource, options: requestOptions, request });
			} catch (requestError: any) {
				response = requestError.cause?.response ?? undefined;
				error = requestError
				console.error(error);
				dispatch('fetch:request:error', { resource, options: requestOptions, response, error });
			}

			dispatch('fetch:request:end', { resource, options: requestOptions, response, error });

			return {
				response,
				error
			}
		}
	}
}
