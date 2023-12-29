import type { Signalize, SignalizePlugin, CustomEventListener } from '..';
import type { FetchReturn } from './fetch';

declare module '..' {
	interface Signalize {
		navigate: (data: NavigationData) => Promise<SpaDispatchEventData>
	}

	interface CustomEventListeners {
		'spa:navigation:start': CustomEventListener
		'spa:request:start': CustomEventListener
		'spa:request:end': CustomEventListener
		'spa:app-version:changed': CustomEventListener
		'spa:redraw:start': CustomEventListener
		'spa:transition:start': CustomEventListener
		'spa:transition:end': CustomEventListener
		'spa:redraw:end': CustomEventListener
		'spa:navigation:end': CustomEventListener
		'spa:page:ready': CustomEventListener
		'spa:popstate': CustomEventListener
		'spa:click': CustomEventListener
	}
}

type StateAction = 'push' | 'replace';

interface NavigationData {
	url: string | URL
	scrollX?: number
	scrollY?: number
	stateAction?: StateAction
}

interface SpaHistoryState extends Partial<NavigationData> {
	spa?: true
}

interface SpaDispatchEventData extends NavigationData {
	success?: boolean
}

type ResponseCache = Record<string, string>;

export interface PluginOptions {
	cacheHeader?: string
	appVersionHeader?: string
}

export default (options?: PluginOptions): SignalizePlugin => {
	return ($: Signalize): void => {
		const { dispatch, fetch, redrawSnippet, select, on } = $;

		const spaAttribute = `${$.attributePrefix}spa`;
		const spaUrlAttribute = `${spaAttribute}${$.attributeSeparator}url`;
		const spaIgnoreAttribute = `${spaAttribute}${$.attributeSeparator}ignore`;
		const spaStateActionAttribute = `${spaAttribute}${$.attributeSeparator}state-action`;
		const spaMetaCacheNameAttribute = `${spaAttribute}${$.attributeSeparator}cache-control`;
		const spaCacheHeader = options?.cacheHeader ?? 'X-Spa-Cache-Control';
		const spaAppVersionHeader = options?.appVersionHeader ?? 'X-Spa-App-Version';

		let currentState = null;
		let currentLocation = new URL(window.location.href);
		let abortNavigationController: AbortController;
		const spaVersion = null;
		const host = window.location.host;
		const responseCache: ResponseCache = {};

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

		let firstNavigationTriggered = false;

		$.customEventListener('spa:page:ready', ({
			on: ({ listener }) => {
				$.root.addEventListener('spa:page:ready', listener, { passive: true });

				if (!firstNavigationTriggered) {
					listener($.customEvent('spa:page:ready', currentState));
				}
			},
			off: ({ listener }) => {
				$.root.removeEventListener('spa:page:ready', listener)
			}
		}));

		const navigate = async (data: NavigationData): Promise<SpaDispatchEventData> => {
			firstNavigationTriggered = true;
			const dispatchEventData: SpaDispatchEventData = {
				...data,
				success: undefined
			}

			if (abortNavigationController !== undefined) {
				abortNavigationController.abort();
			}

			abortNavigationController = new AbortController();

			dispatch('spa:navigation:start', { ...dispatchEventData });

			const { url, stateAction } = data;

			const urlString = url instanceof URL ? url.toString() : url;

			let request: Promise<FetchReturn>;
			let responseData: string | null = null;

			const urlIsCached = urlString in responseCache;

			if (urlIsCached) {
				responseData = responseCache[urlString];
			} else {
				dispatch('spa:request:start', { ...dispatchEventData });

				request = await fetch(urlString, {
					signal: abortNavigationController.signal
				});
				const requestIsWithoutErroor = request.error === null;

				if (requestIsWithoutErroor) {
					try {
						responseData = request.response === null ? '' : await request.response.text();
					} catch (error) {
						console.error(error);
					}
				} else {
					dispatch('spa:request:error', { request, ...dispatchEventData });
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
					redrawSnippet(responseData);
				}

				if (stateAction === 'replace') {
					window.history.replaceState(window.history.state, '', urlString);
				} else if (stateAction === 'push') {
					currentState = {
						url: data.url,
						spa: true,
						scrollX: data.scrollX ?? window.scrollX,
						scrollY: data.scrollY ?? window.scrollY
					};
					window.history.pushState(currentState, '', urlString);
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
				dispatch('spa:redraw:start', dispatchEventData);
				try {
					if (typeof document.startViewTransition === 'undefined') {
						updateDom();
					} else {
						dispatch('spa:transition:start', dispatchEventData);
						const transition = document.startViewTransition(() => updateDom());
						await transition.ready;
						dispatch('spa:transition:end', dispatchEventData)
					}
				} catch (e) {
					console.log(e);
				}
				dispatch('spa:redraw:end', dispatchEventData);

				let urlHash = window.location.hash ?? null;

				const navigationScrollStopped = dispatch(
					'spa:navigation:beforeScroll',
					undefined,
					{ cancelable: true }
				) === false;

				if (!navigationScrollStopped) {
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

			const success = responseData !== null;
			const navigationEndData = { ...dispatchEventData, success };
			dispatch('spa:navigation:end', navigationEndData);
			if (success) {
				dispatch('spa:page:ready', navigationEndData);
			}
			return navigationEndData;
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

			const navigationConfig: NavigationData = {
				url: location,
				scrollX: state.scrollX,
				scrollY: state.scrollY
			};

			dispatch('spa:popstate', navigationConfig);

			void navigate(navigationConfig);
		}

		const onClick = async (event: CustomEvent): Promise<void> => {
			if (event.ctrlKey === true || event.metaKey === true) {
				return;
			}

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

			if (hrefUrl === null || hrefUrl.pathname === currentLocation.pathname) {
				return;
			}

			event.preventDefault();

			const clickCanceled = dispatch('spa:click', { element }, { cancelable: true }) === false;

			if (clickCanceled) {
				return;
			}

			void navigate({
				url,
				stateAction: (element.getAttribute(spaStateActionAttribute) ?? 'push') as StateAction
			});
		}

		on('dom:ready', () => {
			currentState = {
				spa: true,
				url: window.location.pathname,
				scrollX: window.scrollX,
				scrollY: window.scrollY
			};

			if (window.history.state === null) {
				window.history.replaceState(currentState, '', window.location.href);
			}

			dispatch('spa:page:ready', currentState)

			on('click', `a[href], [${spaUrlAttribute}]`, onClick);

			window.addEventListener('popstate', onPopState);
		});

		$.navigate = navigate;
	}
}
