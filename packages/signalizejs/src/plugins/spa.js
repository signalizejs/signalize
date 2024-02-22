/* import { FetchReturn } from './fetch'; */

/* declare module '..' {
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
} */

/**
 * Represents an action type for managing state (e.g., push or replace).
 *
 * @typedef {'push' | 'replace'} StateAction
 */

/**
 * Represents data associated with navigation.
 *
 * @typedef {Object} NavigationData
 * @property {string | URL} url - The URL for navigation.
 * @property {number} [scrollX] - The scroll position on the X-axis.
 * @property {number} [scrollY] - The scroll position on the Y-axis.
 * @property {StateAction} [stateAction] - The action type for managing state (push or replace).
 */

/**
 * Represents the state object for Single Page Application (SPA) history.
 *
 * @typedef {Object} SpaHistoryState
 * @property {string | URL} [url] - The URL for navigation.
 * @property {number} [scrollX] - The scroll position on the X-axis.
 * @property {number} [scrollY] - The scroll position on the Y-axis.
 * @property {StateAction} [stateAction] - The action type for managing state (push or replace).
 * @property {boolean} [spa] - Indicates that the history state is related to a Single Page Application (SPA).
 */

/**
 * Represents data associated with dispatching events for Single Page Application (SPA).
 *
 * @typedef {Object} SpaDispatchEventData
 * @property {string | URL} url - The URL for navigation.
 * @property {number} [scrollX] - The scroll position on the X-axis.
 * @property {number} [scrollY] - The scroll position on the Y-axis.
 * @property {StateAction} [stateAction] - The action type for managing state (push or replace).
 * @property {boolean} [success] - Indicates the success of the dispatch event.
 */

/**
 * Represents a cache for responses with keys as strings and values as strings.
 *
 * @typedef {Record<string, string>} ResponseCache
 */

/**
 * Options for configuring a plugin.
 *
 * @interface PluginOptions
 * @property {string} [cacheHeader] - The cache header option for the plugin.
 * @property {string} [appVersionHeader] - The app version header option for the plugin.
 */

/**
 * Factory function for creating a Signalize plugin.
 *
 * @function
 * @param {PluginOptions} [options] - Options to configure the plugin.
 * @returns {import('../Signalize').SignalizePlugin} A Signalize plugin instance.
 */
export default (options) => {
	/**
	 * @param {import('../Signalize').Signalize} $
	 * @returns {void}
	 */
	return ($) => {
		const { dispatch, fetch, redrawSnippet, on, root } = $;

		const spaAttribute = `${$.attributePrefix}spa`;
		const spaUrlAttribute = `${spaAttribute}${$.attributeSeparator}url`;
		const spaIgnoreAttribute = `${spaAttribute}${$.attributeSeparator}ignore`;
		const spaStateActionAttribute = `${spaAttribute}${$.attributeSeparator}state-action`;
		const spaMetaCacheNameAttribute = `${spaAttribute}${$.attributeSeparator}cache-control`;
		const spaCacheHeader = options?.cacheHeader ?? 'X-Spa-Cache-Control';
		const spaAppVersionHeader = options?.appVersionHeader ?? 'X-Spa-App-Version';

		let currentState = null;
		/** @type {AbortController} */
		let abortNavigationController;
		const spaVersion = null;
		const host = window.location.host;
		/** @type {ResponseCache} */
		const responseCache = {};

		/**
		 *
		 * @param {string} urlString
		 * @returns {URL|null}
		 */
		const createUrl = (urlString) => {
			try {
				const url = new URL(urlString);
				return url;
			} catch (error) { /* empty */ }

			return null;
		};

		/**
		 *
		 * @param {any} content
		 * @returns {boolean}
		 */
		const isJson = (content) => {
			try {
				JSON.parse(content);
			} catch (e) {
				return false;
			}
			return true;
		};

		let firstNavigationTriggered = false;

		$.customEventListener('spa:page:ready', ({
			on: ({ listener }) => {
				$.root.addEventListener('spa:page:ready', listener, { passive: true });

				if (!firstNavigationTriggered) {
					listener($.customEvent('spa:page:ready', currentState));
				}
			},
			off: ({ listener }) => {
				$.root.removeEventListener('spa:page:ready', listener);
			}
		}));

		/**
		 * @param {NavigationData} data
		 * @returns {Promise<SpaDispatchEventData>}
		 */
		const navigate = async (data) => {
			firstNavigationTriggered = true;
			/**
			 * @type {SpaDispatchEventData}
			 */
			const dispatchEventData = {
				...data,
				success: undefined
			};

			if (abortNavigationController !== undefined) {
				abortNavigationController.abort();
			}

			abortNavigationController = new AbortController();

			dispatch('spa:navigation:start', { ...dispatchEventData });

			const { url, stateAction } = data;

			const urlString = url instanceof URL ? url.toString() : url;

			/** @type {Promise<import('./fetch.js').FetchReturn} */
			let request;
			/** @type {string|null} */
			let responseData = null;

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

			/**
			 * @returns {void}
			 */
			const updateDom = async () => {
				/** @type {boolean|null} */
				let shouldCacheResponse = null;

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
					await redrawSnippet(responseData);
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
					const metaCacheControlElement = root.querySelector(`meta[name="${spaMetaCacheNameAttribute}"]`);
					shouldCacheResponse = !urlIsCached && (
						metaCacheControlElement === null || metaCacheControlElement.getAttribute('content') !== 'no-cache'
					);
				}

				if (shouldCacheResponse) {
					responseCache[urlString] = responseData;
				}
			};

			if (responseData !== null) {
				dispatch('spa:redraw:start', dispatchEventData);
				try {
					await updateDom();
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
						const element = root.querySelector(`#${urlHash}`);
						if (element !== null) {
							element.scrollIntoView({
								block: 'start',
								inline: 'nearest'
							});
						}
					} else {
						window.scrollTo(data.scrollX ?? 0, data.scrollY ?? 0);
					}
				}
			}

			const success = responseData !== null;
			const navigationEndData = { ...dispatchEventData, success };
			dispatch('spa:navigation:end', navigationEndData);

			if (success) {
				dispatch('spa:page:ready', navigationEndData);
			}

			return navigationEndData;
		};

		/**
		 * @returns {void}
		 */
		const onPopState = () => {
			/** @type {SpaHistoryState} */
			const state = window.history.state;

			if (!(state?.spa ?? false)) {
				return;
			}

			const location = new URL(window.location.href);
			const currentLocation = getCurrentLocation();
			if (location === currentLocation || (location.pathname === currentLocation.pathname && location.hash !== currentLocation.hash)) {
				return;
			}

			/** @type {NavigationData} */
			const navigationConfig = {
				url: location,
				scrollX: state.scrollX,
				scrollY: state.scrollY
			};

			dispatch('spa:popstate', navigationConfig);

			void navigate(navigationConfig);
		};

		const getCurrentLocation = () => {
			return new URL(window.location.href);
		};

		/**
		 * @param {CustomEvent} event
		 * @returns {Promise<void>}
		 */
		const onClick = async (event) => {
			if (event.ctrlKey === true || event.metaKey === true) {
				return;
			}

			/** @type {HTMLAnchorElement} */
			const element = event.target.closest('a');
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

			if (hrefUrl === null || hrefUrl.pathname === getCurrentLocation().pathname) {
				event.preventDefault();
				return;
			}

			const clickCanceled = dispatch('spa:click', { element }, { cancelable: true }) === false;

			if (clickCanceled) {
				return;
			}

			event.preventDefault();

			void navigate({
				url,
				/** @type {StateAction} */
				stateAction: (element.getAttribute(spaStateActionAttribute) ?? 'push')
			});
		};

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

			dispatch('spa:page:ready', currentState);

			on('click', `a[href], [${spaUrlAttribute}]`, onClick);

			window.addEventListener('popstate', onPopState);
		});

		$.navigate = navigate;
	};
};
