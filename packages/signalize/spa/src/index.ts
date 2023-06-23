import { onDomReady, on, dispatch, isJson, select } from 'signalizejs';
import { ajax } from 'signalizejs/ajax';
import { redraw } from 'signalizejs/snippets';

type StateAction = 'push' | 'replace';

interface VisitData {
	url: string | URL
	stateAction?: StateAction
}

interface SpaDispatchEventData extends VisitData {
	success?: boolean
}

let currentLocation = window.location;
const spaVersion = null;
const spaUrlAttribute = 'data-spa-url';
const spaIgnoreAttribute = 'data-spa-ignore';
const spaStateActionAttribute = 'data-spa-state-action';
const spaMetaCacheNameAttribute = 'spa-cache-control';
const spaCacheHeader = 'X-Spa-Cache-Control';
const spaAppVersion = 'X-Spa-App-Version';

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

export const visit = async (data: VisitData): Promise<SpaDispatchEventData> => {
	const dispatchEventData: SpaDispatchEventData = {
		...data,
		success: undefined
	}

	dispatch('spa:visit:start', { ...dispatchEventData });

	const { url, stateAction } = data;

	const urlString = url instanceof URL ? url.toString() : url;

	let request;
	let responseData = null;

	const urlIsCached = urlString in responseCache;

	console.log(urlIsCached);
	if (urlIsCached) {
		responseData = responseCache[urlString];
	} else {
		dispatch('spa:request:start', { ...dispatchEventData });

		request = await ajax(urlString);
		const requestIsWithoutErroor = request.error === null;

		if (requestIsWithoutErroor) {
			try {
				responseData = request.response === null ? '' : await request.response.text();
			} catch (error) {
				console.error(error);
			}
		}

		dispatch('spa:request:end', { request, ...dispatchEventData, success: responseData !== null });
	}

	if (responseData !== null) {
		let shouldCacheResponse: boolean | null = null;

		const headers = request?.response?.headers ?? {};

		if (Object.keys(headers).length > 0) {
			const cacheHeader = headers[spaCacheHeader] ?? null;
			if (cacheHeader !== null) {
				shouldCacheResponse = cacheHeader !== 'no-cache';
			}

			const spaVersionFromHeader = headers[spaAppVersion] ?? null;

			if (spaVersionFromHeader !== null && spaVersion !== null && spaVersion !== spaVersionFromHeader) {
				dispatch('spa:app-version:changed');
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

		let urlHash = window.location.hash ?? null;

		const canScrollAfterVisitStopped = dispatch('spa:visit:beforeScroll');

		if (canScrollAfterVisitStopped === false) {
			if (urlHash !== null && urlHash.trim().length > 2) {
				urlHash = urlHash.slice(1);
				const element = document.querySelector(`#${urlHash}`);
				if (element !== null) {
					element.scrollIntoView({
						block: 'start',
						inline: 'nearest'
					});
				}
			} else {
				window.scrollTo(0, 0)
			}
		}

		currentLocation = window.location
	}

	const visitEndData = { ...dispatchEventData, success: responseData !== null };
	dispatch('spa:visit:end', visitEndData);

	return visitEndData;
}

onDomReady(() => {
	on('click', `a[href], [${spaUrlAttribute}]`, async (event: CustomEvent) => {
		const element = event.target as HTMLElement;
		const targetAttribute = element.getAttribute('target');

		if (element.hasAttribute(spaIgnoreAttribute) || ![null, '_self'].includes(targetAttribute)) {
			return;
		}

		const url = element.getAttribute('href') ??
			element.getAttribute(spaUrlAttribute) ??
			element.closest('[href]')?.getAttribute('href') ??
			element.closest(`[${spaUrlAttribute}]`)?.getAttribute(spaUrlAttribute);

		if (url === null || url === undefined || url.startsWith('#')) {
			return;
		}

		const parsedOriginalUrl = createUrl(url);

		if (parsedOriginalUrl !== null && parsedOriginalUrl.host !== host) {
			return;
		}

		const hrefUrl = createUrl(`${window.location.origin}${url}`);

		if (hrefUrl === null || (hrefUrl.pathname === window.location.pathname && hrefUrl.hash !== currentLocation.hash)) {
			return;
		}

		if (window.history.state === null) {
			window.history.replaceState({ spa: true }, '', window.location.href);
		}

		event.preventDefault();

		dispatch('spa:clicked', { element });

		void visit({
			url,
			stateAction: (element.getAttribute(spaStateActionAttribute) ?? 'push') as StateAction
		});
	});

	window.addEventListener('popstate', () => {
		if (typeof window.history.state?.spa !== 'boolean') {
			return;
		}

		const location = window.location;

		if (location === currentLocation || (location.pathname === currentLocation.pathname && location.hash !== currentLocation.hash)) {
			return;
		}

		const visitConfig = {
			url: location
		};

		dispatch('spa:popstate', visitConfig);

		void visit(visitConfig);
	});
});
