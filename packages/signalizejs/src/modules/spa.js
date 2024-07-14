/** @type {import('../../types/Signalize').Module<import('../../types/modules/spa').SpaModule, import('../../types/modules/spa').SpaConfig>} */
export default async ({ params, resolve, root }, config) => {

	const { dispatch, ajax, redrawSnippet, on, customEventListener, customEvent } = await resolve(
		'dom/ready',
		'event',
		'ajax',
		'snippets'
	);

	const spaAttribute = `${params.attributePrefix}spa`;
	const spaUrlAttribute = `${spaAttribute}${params.attributeSeparator}url`;
	const spaIgnoreAttribute = `${spaAttribute}${params.attributeSeparator}ignore`;
	const spaStateActionAttribute = `${spaAttribute}${params.attributeSeparator}state-action`;
	const spaMetaCacheNameAttribute = `${spaAttribute}${params.attributeSeparator}cache-control`;
	const spaHeaderPrefix = 'X-Spa-';
	const spaCacheHeader = config?.cacheHeader ?? `${spaHeaderPrefix}Cache-Control`;
	const spaAppVersionHeader = config?.appVersionHeader ?? `${spaHeaderPrefix}App-Version`;
	const spaTransitionsHeader = config?.appVersionHeader ?? `${spaHeaderPrefix}Transitions`;
	const defaultStateAction = 'push';

	/** @type {import('../../types/modules/spa').HistoryState|undefined} */
	let currentState;
	/** @type {AbortController|undefined} */
	let abortNavigationRequestController;
	const spaVersion = null;
	const host = window.location.host;
	/** @type {import('../../types/modules/spa').ResponseCache} */
	const responseCache = {};

	/**
	 *
	 * @param {string} urlString
	 * @returns {URL|null}
	 */
	const createUrl = (urlString) => {
		try {
			const url = new URL(urlString, getCurrentLocation());
			return url;
		} catch (error) {
			console.error(error);
		}

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

	/** @type {import('../../types/modules/spa').navigate} */
	const navigate = async (data) => {
		updateCurrentState();

		firstNavigationTriggered = true;
		/** @type {import('../../types/modules/spa.d.ts').NavigationEventData} */
		const dispatchEventData = {
			...data,
			scrollX: data.scrollX ?? window.scrollX,
			scrollY: data.scrollY ?? window.scrollY,
			stateAction: data.stateAction ?? defaultStateAction,
			error: null
		};

		if (abortNavigationRequestController !== undefined) {
			abortNavigationRequestController.abort();
		}

		abortNavigationRequestController = new AbortController();
		const { stateAction = defaultStateAction } = data;
		const url = data.url instanceof URL ? data.url : createUrl(data.url);

		if (url === null) {
			throw new Error('Error during navigation.');
		}

		const currentLocation = getCurrentLocation();
		const onlyHashChanged = url.pathname === currentLocation.pathname && url.hash !== currentLocation.hash;
		const shouldTriggerNavigation = !onlyHashChanged;
		const urlString = url.toString();

		/** @type {import('../../types/modules/ajax.d.ts').AjaxReturn} */
		let navigationResponse;
		/** @type {string|null} */
		let responseData = null;

		const urlIsCached = urlString in responseCache;

		if (shouldTriggerNavigation) {
			dispatch('spa:navigation:start', { ...dispatchEventData });

			if (urlIsCached) {
				responseData = responseCache[urlString];
			} else {
				dispatch('spa:request:start', { ...dispatchEventData });

				navigationResponse = await ajax(urlString, {
					signal: abortNavigationRequestController.signal,
					headers: {
						Accept: 'text/html, application/xhtml+xml'
					}
				});
				abortNavigationRequestController = undefined;
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
		}

		/** @param {string} urlHash */
		const scrollElementIntoView = (urlHash) => {
			urlHash = urlHash.slice(1);
			const element = root.querySelector(`[id="${urlHash}"]`);
			if (element !== null) {
				element.scrollIntoView({
					block: 'start',
					inline: 'nearest'
				});
			}
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
					console.log()
					scrollElementIntoView(url.hash);
				} else {
					queueMicrotask(() => {
						window.scrollTo(data.scrollX ?? 0, data.scrollY ?? 0);
					});
				}
			}
		} else if (onlyHashChanged) {
			scrollElementIntoView(url.hash);
		}

		const error = responseData === null;
		const navigationEndData = { ...dispatchEventData, error };

		if (shouldTriggerNavigation) {
			dispatch('spa:navigation:end', navigationEndData);

			if (error === false) {
				dispatch('spa:page:ready', navigationEndData);
			}
		}

		return navigationEndData;
	};

	/**
	 * @returns {void}
	 */
	const onPopState = () => {
		/** @type {import('../../types/modules/spa.d.ts').HistoryState} */
		const state = window.history.state;

		if (!(state?.spa ?? false)) {
			return;
		}

		if (state.url === undefined || state.url === currentState?.url) {
			return;
		}

		/** @type {import('../../types/modules/spa.d.ts').NavigationData} */
		const navigationConfig = {
			url: state.url,
			scrollX: state.scrollX,
			scrollY: state.scrollY,
			stateAction: 'replace'
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

		if (element.hasAttribute(spaIgnoreAttribute) || element.hasAttribute('download') || ![null, '_self'].includes(targetAttribute)) {
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
		const currentLocation = getCurrentLocation();

		if (hrefUrl === null || hrefUrl.toString() === currentLocation.toString()) {
			event.preventDefault();
			return;
		}

		const clickCanceled = dispatch('spa:click', { element }, { cancelable: true }) === false;

		if (clickCanceled) {
			event.preventDefault();
			return;
		}

		event.preventDefault();

		/** @type {import('../../types/modules/spa.d.ts').StateAction} */
		let stateAction = defaultStateAction;
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

	const updateCurrentState = () => {
		currentState = {
			spa: true,
			url: window.location.pathname,
			scrollX: window.scrollX,
			scrollY: window.scrollY
		};

		window.history.replaceState(currentState, '', window.location.href);
	};

	on('dom:ready', () => {
		updateCurrentState();

		dispatch('spa:page:ready', currentState);

		on('click', `a[href], [${spaUrlAttribute}]`, onClick);

		window.addEventListener('popstate', onPopState);
	});

	return { navigate };
};
