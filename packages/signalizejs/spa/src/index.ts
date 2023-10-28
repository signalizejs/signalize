import type { Signalize, CustomEventListener } from 'signalizejs';

declare module 'signalizejs' {
	interface Signalize {
		visit: (data: VisitData) => Promise<SpaDispatchEventData>
	}

	interface CustomEventListeners {
		'spa:visit:start': CustomEventListener
		'spa:request:start': CustomEventListener
		'spa:request:end': CustomEventListener
		'spa:app-version:changed': CustomEventListener
		'spa:transition:start': CustomEventListener
		'spa:transition:end': CustomEventListener
		'spa:visit:end': CustomEventListener
		'spa:popstate': CustomEventListener
		'spa:clicked': CustomEventListener
	}
}

type StateAction = 'push' | 'replace';

interface VisitData {
	url: string | URL
	scrollX?: number
	scrollY?: number
	stateAction?: StateAction
}

interface SpaHistoryState extends Partial<VisitData> {
	spa?: true
}

interface SpaDispatchEventData extends VisitData {
	success?: boolean
}

export default (signalize: Signalize): void => {
	const { dispatch, ajax, redraw, select, on, config } = signalize;
	let spaUrlAttribute = `spa-url`;
	let spaIgnoreAttribute = `spa-ignore`;
	let spaStateActionAttribute = `spa-state-action`;
	let spaMetaCacheNameAttribute = `spa-cache-control`;
	let spaCacheHeader = `X-Spa-Cache-Control`;
	let spaAppVersionHeader = `X-Spa-App-Version`;

	let currentLocation = new URL(window.location.href);

	const spaVersion = null;

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

	const isJson = (content: any): boolean => {
		try {
			JSON.parse(content);
		} catch (e) {
			return false;
		}
		return true;
	}

	const visit = async (data: VisitData): Promise<SpaDispatchEventData> => {
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

		if (urlIsCached) {
			responseData = responseCache[urlString];
		} else {
			dispatch('spa:request:start', { ...dispatchEventData });

			request = await ajax({ url: urlString });
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

		const updateDom = (): void => {
			let shouldCacheResponse: boolean | null = null;

			const headers = request?.response?.headers ?? {};

			if (Object.keys(headers).length > 0) {
				const cacheHeader = headers[spaCacheHeader] ?? null;
				if (cacheHeader !== null) {
					shouldCacheResponse = cacheHeader !== 'no-cache';
				}

				const spaVersionFromHeader = headers[spaAppVersionHeader] ?? null;

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
				window.history.pushState(
					{
						url: data.url,
						spa: true,
						scrollX: data.scrollX ?? window.scrollX,
						scrollY: data.scrollY ?? window.scrollY
					},
					'',
					urlString
				);
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

		if (responseData !== null) {
			if (typeof document.startViewTransition === 'undefined') {
				updateDom();
			} else {
				dispatch('spa:transition:start', dispatchEventData);
				const transition = document.startViewTransition(() => updateDom());
				await transition.ready;
				dispatch('spa:transition:end', dispatchEventData)
			}
		}

		if (responseData !== null) {
			let urlHash = window.location.hash ?? null;

			const visitScrollStopped = dispatch('spa:visit:beforeScroll') === false;

			if (!visitScrollStopped) {
				if (urlHash !== null && urlHash.trim().length > 2) {
					urlHash = urlHash.slice(1);
					const element = select(`#${urlHash}`);
					if (element !== null) {
						element.scrollIntoView({
							block: 'start',
							inline: 'nearest'
						});
					}
				} else {
					window.scrollTo(data.scrollX ?? 0, data.scrollY ?? 0)
				}
			}

			currentLocation = new URL(window.location.href);
		}

		const visitEndData = { ...dispatchEventData, success: responseData !== null };
		dispatch('spa:visit:end', visitEndData);

		return visitEndData;
	}

	const onPopState = (): void => {
		const state = window.history.state as SpaHistoryState;

		if (!(state?.spa ?? false)) {
			return;
		}

		const location = new URL(window.location.href);

		if (location === currentLocation || (location.pathname === currentLocation.pathname && location.hash !== currentLocation.hash)) {
			return;
		}

		const visitConfig: VisitData = {
			url: location,
			scrollX: state.scrollX,
			scrollY: state.scrollY
		};

		dispatch('spa:popstate', visitConfig);

		void visit(visitConfig);
	}

	const onClick = async (event: CustomEvent): Promise<void> => {
		const element = event.target.closest('a') as HTMLAnchorElement;
		const targetAttribute = element.getAttribute('target');

		if (element.hasAttribute(spaIgnoreAttribute) || ![null, '_self'].includes(targetAttribute) || element.hasAttribute('download')) {
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
			window.history.replaceState(
				{
					spa: true, scrollX: window.scrollX, scrollY: window.scrollY
				},
				'',
				window.location.href
			);
		}

		event.preventDefault();

		const clickCanceled = dispatch('spa:clicked', { element }) === false;

		if (clickCanceled) {
			return;
		}

		void visit({
			url,
			stateAction: (element.getAttribute(spaStateActionAttribute) ?? 'push') as StateAction
		});
	}

	on('dom:ready', () => {
		spaUrlAttribute = `${config.attributesPrefix}${spaUrlAttribute}`;
		spaIgnoreAttribute = `${config.attributesPrefix}${spaIgnoreAttribute}`;
		spaStateActionAttribute = `${config.attributesPrefix}${spaStateActionAttribute}`;
		spaMetaCacheNameAttribute = `${config.attributesPrefix}${spaMetaCacheNameAttribute}`;

		on('click', `a[href], [${spaUrlAttribute}]`, onClick);

		window.addEventListener('popstate', onPopState);
	});

	signalize.visit = visit;
}
