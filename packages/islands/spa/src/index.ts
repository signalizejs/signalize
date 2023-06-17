import { onDomReady, on, dispatch, isJson, select } from 'islandsjs';
import { ajax } from 'islandsjs/ajax';
import { redraw } from 'islandsjs/snippets';

type StateAction = 'push' | 'replace';

interface VisitData {
	url: string | URL
	stateAction?: StateAction
}

const spaVersion = null;
const spaUrlAttribute = 'data-spa-url';
const spaIgnoreAttribute = 'data-spa-ignore';
const spaStateActionAttribute = 'data-spa-state-action';
const spaMetaCacheNameAttribute = 'spa-cache-control';
const spaCacheHeader = 'X-Spa-Cache-Control';
const spaVersionHeader = 'X-Spa-Version';

const host = window.location.host;

const responseCache: Record<string, string> = {};

const createUrl = (urlString: string): URL | null => {
	try {
		const url = new URL(urlString);
		return url;
	} catch (error) {
	}

	return null;
}

export const visit = async (data: VisitData): Promise<void> => {
	dispatch('spa:visit:start', { ...data });

	const { url, stateAction } = data;

	const urlString = url instanceof URL ? url.toString() : url;

	let request;
	let responseData = null;

	const urlIsCached = urlString in responseCache;

	if (urlIsCached) {
		responseData = responseCache[urlString];
	} else {
		dispatch('spa:request:start', { ...data });

		request = await ajax(urlString);

		if (request.error !== null) {
			dispatch('spa:request:error', { request, ...data });
		} else {
			responseData = request.response === null ? '' : await request.response.text();
			dispatch('spa:request:success', { request, ...data });
		}

		dispatch('spa:request:end', { request, ...data });
	}

	if (responseData !== null) {
		let shouldCacheResponse: boolean | null = null;

		const headers = request?.response?.headers ?? {};

		if (Object.keys(headers).length > 0) {
			const cacheHeader = headers[spaCacheHeader] ?? null;
			if (cacheHeader !== null) {
				shouldCacheResponse = cacheHeader !== 'no-cache';
			}

			const spaVersionFromHeader = headers[spaVersionHeader] ?? null;

			if (spaVersionFromHeader !== null && spaVersion !== null && spaVersion !== spaVersionFromHeader) {
				dispatch('spa:version:changed');
			}
		}

		if (!isJson(responseData)) {
			redraw(responseData);
		}

		if (stateAction === 'replace') {
			window.history.replaceState(window.history.state, '', urlString);
		} else if (stateAction === 'push') {
			window.history.pushState({ spa: true }, '', urlString);
		}

		if (shouldCacheResponse === null) {
			const metaCacheControlElement = select(`meta[name="${spaMetaCacheNameAttribute}"]`);
			shouldCacheResponse = !urlIsCached && (
				metaCacheControlElement === null || metaCacheControlElement.getAttribute('content') !== 'no-cache'
			)
		}

		if (shouldCacheResponse) {
			responseCache[urlString] = responseData;
		}
	}

	let urlHash = window.location.hash ?? null;

	if (urlHash !== null && urlHash.trim().length > 2) {
		urlHash = urlHash.slice(1);
		const element = document.querySelector(`#${urlHash}`);

		if (element !== null) {
			element.scrollIntoView({
				block: 'start',
				inline: 'nearest'
			});
		}
	}

	dispatch('spa:visit:end', { ...data });
}

onDomReady(() => {
	on('click', `a[href], [${spaUrlAttribute}]`, async (event: CustomEvent) => {
		event.preventDefault();

		const element = event.target as HTMLElement;

		const targetAttribute = element.getAttribute('target');

		if (element.hasAttribute(spaIgnoreAttribute) || ![null, '_self'].includes(targetAttribute)) {
			return;
		}

		const url = element.getAttribute('href') ?? element.getAttribute(spaUrlAttribute);

		if (url === null || url.startsWith('#')) {
			return;
		}

		const parsedOriginalUrl = createUrl(url);

		if (parsedOriginalUrl !== null && parsedOriginalUrl.host !== host) {
			return;
		}

		if (window.history.state === null) {
			window.history.replaceState({ spa: true }, '', window.location.href);
		}

		dispatch('spa:clicked', { element });

		void visit({
			url,
			stateAction: (element.getAttribute(spaStateActionAttribute) ?? 'push') as StateAction
		});
	});

	window.addEventListener('popstate', () => {
		if (typeof window.history.state.spa !== 'boolean') {
			return;
		}

		const visitConfig = {
			url: window.location.href
		}

		dispatch('spa:popstate', visitConfig);

		void visit(visitConfig);
	});
});
