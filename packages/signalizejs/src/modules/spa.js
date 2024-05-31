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
 * @property {unknown|null} error - Error that occured during navigation
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
 * @typedef PluginOptions
 * @property {string} [cacheHeader] - The cache header option for the plugin.
 * @property {string} [appVersionHeader] - The app version header option for the plugin.
 */

/**
 * @typedef CurrentState
 * @property {string} url
 * @property {boolean} spa
 * @property {number} scrollX
 * @property {number} scrollY
 */

/**
 * @callback navigate
 * @param {NavigationData} data
 */

/** @type {import('../Signalize').SignalizeModule} */
export default async ({ params, resolve, root }, options) => {
	const { dispatch, fetch, redrawSnippet, on, customEventListener, customEvent } = await resolve('event', 'fetch', 'snippets');

	const spaAttribute = `${params.attributePrefix}spa`;
	const spaUrlAttribute = `${spaAttribute}${params.attributeSeparator}url`;
	const spaIgnoreAttribute = `${spaAttribute}${params.attributeSeparator}ignore`;
	const spaStateActionAttribute = `${spaAttribute}${params.attributeSeparator}state-action`;
	const spaMetaCacheNameAttribute = `${spaAttribute}${params.attributeSeparator}cache-control`;
	const spaHeaderPrefix = 'X-Spa-';
	const spaCacheHeader = options?.cacheHeader ?? `${spaHeaderPrefix}Cache-Control`;
	const spaAppVersionHeader = options?.appVersionHeader ?? `${spaHeaderPrefix}App-Version`;
	const spaTransitionsHeader = options?.appVersionHeader ?? `${spaHeaderPrefix}Transitions`;

	/** @type {CurrentState|undefined} */
	let currentState;
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

	customEventListener('spa:page:ready', ({
		on: ({ listener }) => {
			root.addEventListener('spa:page:ready', listener, { passive: true });

			if (!firstNavigationTriggered) {
				listener(customEvent('spa:page:ready', currentState));
			}
		},
		off: ({ listener }) => {
			root.removeEventListener('spa:page:ready', listener);
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
			error: null
		};

		if (abortNavigationController !== undefined) {
			abortNavigationController.abort();
		}

		abortNavigationController = new AbortController();

		dispatch('spa:navigation:start', { ...dispatchEventData });

		const { url, stateAction = 'push' } = data;
		const urlString = url instanceof URL ? url.toString() : url;

		/** @type {import('./fetch.js').FetchReturn} */
		let navigationResponse;
		/** @type {string|null} */
		let responseData = null;

		const urlIsCached = urlString in responseCache;

		if (urlIsCached) {
			responseData = responseCache[urlString];
		} else {
			dispatch('spa:request:start', { ...dispatchEventData });

			navigationResponse = await fetch(urlString, {
				signal: abortNavigationController.signal
			});
			const requestIsWithoutErroor = navigationResponse.error === null;

			if (requestIsWithoutErroor) {
				try {
					responseData = navigationResponse.response === null ? '' : await navigationResponse.response.text();
				} catch (error) {
					dispatchEventData.error = error;
					console.error(error);
				}
			} else {
				dispatchEventData.error = navigationResponse.error;
				dispatch('spa:request:error', { ...navigationResponse, ...dispatchEventData });
			}

			dispatch('spa:request:end', { ...navigationResponse, ...dispatchEventData });
		}

		const updateDom = async () => {
			/** @type {boolean|null} */
			let shouldCacheResponse = null;

			/** @type {Headers|undefined} */
			const headers = navigationResponse?.response?.headers;

			if (headers !== undefined) {
				const cacheHeader = headers.get(spaCacheHeader) ?? null;
				if (cacheHeader !== null) {
					shouldCacheResponse = cacheHeader !== 'no-cache';
				}

				const spaVersionFromHeader = headers.get(spaAppVersionHeader) ?? null;

				if (spaVersionFromHeader !== null && spaVersion !== null && spaVersion !== spaVersionFromHeader) {
					dispatch('spa:app-version:changed');
				}
			}

			if (!isJson(responseData)) {
				await redrawSnippet(responseData, {
					transitions: headers?.get(spaTransitionsHeader) ?? 'enabled'
				});
			}

			if (stateAction === 'replace') {
				window.history.replaceState(window.history.state, '', urlString);
			} else if (stateAction === 'push') {
				currentState = {
					url: urlString,
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

			if (shouldCacheResponse && responseData) {
				responseCache[urlString] = responseData;
			}
		};

		if (responseData !== null) {
			dispatch('spa:redraw:start', dispatchEventData);
			try {
				await updateDom();
			} catch (e) {
				dispatchEventData.error = e;
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

		const error = responseData === null;
		const navigationEndData = { ...dispatchEventData, error };
		dispatch('spa:navigation:end', navigationEndData);

		if (error === false) {
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

		if (state.url === undefined || state.url === currentState?.url) {
			return;
		}

		/** @type {NavigationData} */
		const navigationConfig = {
			url: state.url,
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
	 * @param {MouseEvent} event
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
		hrefUrl.hash = '';
		let currentLocation = getCurrentLocation();
		currentLocation.hash = '';

		if (hrefUrl === null || hrefUrl.toString() === currentLocation.toString()) {
			event.preventDefault();
			return;
		}

		const clickCanceled = dispatch('spa:click', { element }, { cancelable: true }) === false;

		if (clickCanceled) {
			return;
		}

		event.preventDefault();

		/** @type {StateAction} */
		let stateAction = 'push';
		const stateActionAttribute = element.getAttribute(spaStateActionAttribute);

		if (stateActionAttribute) {
			if (!['push', 'replace'].includes(stateActionAttribute)) {
				throw new Error(`Unknown operation on spa action attribute "${stateAction}".`);
			}

			stateAction = stateActionAttribute;
		}


		void navigate({
			url,
			stateAction
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

	return { navigate };
};
