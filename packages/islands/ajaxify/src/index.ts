import type { CustomEventListener } from 'islandsjs';
import { dispatch, on, onDomReady, selectAll, isJson, createHtml } from 'islandsjs';

type StateAction = 'push' | 'replace';

interface FetchConfig {
	info: RequestInfo | URL | string
	init?: RequestInit
	stateAction?: StateAction
	element?: HTMLElement
	indicator?: string | HTMLElement
	id?: string
	onSuccessCallback?: CallableFunction
	onErrorCallback?: CallableFunction
}

type ConfigFromAttribute = Record<string, FetchConfig>;

const ajaxifyAttribute = 'data-ajaxify';
const ajaxifyUrlAttribute = 'data-ajaxify-url';
const ajaxifyIdAttribute = 'data-ajaxify-id';
const ajaxifyOnceAttribute = 'data-ajaxify-once';
const ajaxifyStateAttribute = 'data-ajaxify-state';
const ajaxifyBlockAttribute = 'data-ajaxify-block';
const ajaxifyBlockActionAttribute = 'data-ajaxify-block-action';

export const sendRequest = async (fetchConfig: FetchConfig): void => {
	const id = fetchConfig.id ??
		fetchConfig.element?.getAttribute('id') ??
		fetchConfig.element?.getAttribute(ajaxifyIdAttribute);

	let indicatorElement: HTMLElement | null = fetchConfig.element ?? null;

	if (indicatorElement === undefined && typeof fetchConfig.indicator !== 'undefined') {
		indicatorElement = fetchConfig.indicator instanceof HTMLElement
			? fetchConfig.indicator
			: document.querySelector(fetchConfig.indicator)
	}

	const setIndicatorElementStateClass = (className: 's-ajaxify-processing' | 's-ajaxify-error' | 's-ajaxify-success') => {
		if (indicatorElement == null) {
			return;
		}

		indicatorElement.classList.remove('s-ajaxify-processing', 's-ajaxify-error', 's-ajaxify-success');
		indicatorElement.classList.add(className);
	}

	const dispatchEvent = (name: string, data: any) => {
		dispatch(name, data);

		if (id) {
			dispatch(`${name}:${id}`, data);
		}
	}

	setIndicatorElementStateClass('s-ajaxify-processing');
	dispatchEvent('ajaxify:processing', {
		config: fetchConfig
	});

	if (typeof fetchConfig.init === 'undefined') {
		fetchConfig.init = {};
	}

	if (typeof fetchConfig.init.method === 'undefined') {
		fetchConfig.init.method = 'GET';
	}

	try {
		const response = await fetch(fetchConfig.info, fetchConfig.init)
		let responseData = await response.text();
		const responseDataAreJson = isJson(responseData);

		if (responseDataAreJson) {
			responseData = JSON.parse(responseData);
		}

		if (!response.ok) {
			throw new Error(`Islands - ajaxify: Request error: "${response.statusText}".`);
		}

		const eventData = {
			response,
			responseData,
			config: fetchConfig
		}

		if (fetchConfig.stateAction !== undefined) {
			if (window.history.state === null) {
				window.history.replaceState({ ajaxify: true }, '', window.location.href);
			}

			if (fetchConfig.stateAction === 'replace') {
				window.history.replaceState(window.history.state, '', fetchConfig.info.toString());
			} else {
				window.history.pushState({ ajaxify: true }, '', fetchConfig.info.toString());
			}
		}

		if (!responseDataAreJson) {
			const responseToHtml = createHtml(responseData);
			for (const element of responseToHtml.querySelectorAll(`[${ajaxifyBlockAttribute}]`)) {
				const blockId = element.getAttribute(ajaxifyBlockAttribute);
				const targetBlockToSync = document.querySelector(`[${ajaxifyBlockAttribute}="${blockId}"]`);

				if (targetBlockToSync == null) {
					continue;
				}

				const blockAction = element.getAttribute(`[${ajaxifyBlockActionAttribute}]`) ?? 'replace';

				if (blockAction === 'replace') {
					targetBlockToSync.replaceWith(element);
				} else if (blockAction === 'append-children') {
					while (element.firstChild != null) {
						const child = element.firstChild;
						targetBlockToSync.appendChild(child);
					}
				} else if (blockAction === 'prepend-children') {
					while (element.lastChild != null) {
						const child = element.lastChild;
						targetBlockToSync.insertBefore(child, targetBlockToSync.firstChild);
					}
				}
			}
		}

		setIndicatorElementStateClass('s-ajaxify-success');
		dispatchEvent('ajaxify:success', eventData);

		if (fetchConfig.onSuccessCallback !== undefined) {
			fetchConfig.onSuccessCallback(eventData)
		}
	} catch (error) {
		const eventData = {
			error,
			config: fetchConfig
		};

		dispatchEvent('ajaxify:error', eventData);
		setIndicatorElementStateClass('s-ajaxify-error');

		if (fetchConfig.onErrorCallback !== undefined) {
			fetchConfig.onErrorCallback(eventData)
		}
	}
}

const processConfig = (element: HTMLElement, config: ConfigFromAttribute): void => {
	for (const [triggerEvent, fetchConfig] of Object.entries(config)) {
		fetchConfig.element = element;
		const domEvents = triggerEvent.split(',');

		for (const domEvent of domEvents) {
			on(domEvent as keyof CustomEventListener, element, async () => { await sendRequest(fetchConfig); })
		}
	}
}

const processOther = (element: HTMLAnchorElement): void => {
	const handler = (event: Event): void => {
		event.preventDefault();

		const url = element.getAttribute('href') ?? element.getAttribute(ajaxifyUrlAttribute);

		if (url === null) {
			throw new Error('Islands - ajaxify: Element doesn\' have href or data-href attribute.');
		}

		sendRequest({
			info: url,
			element,
			stateAction: element.getAttribute(`${ajaxifyStateAttribute}`) as StateAction ?? undefined,
			onSuccessCallback: () => {
				if (element.hasAttribute(ajaxifyOnceAttribute)) {
					element.removeEventListener('click', handler);
				}
			}
		})
	};

	on('click', element, handler);
}

const processForm = (element: HTMLFormElement): void => {
	const handler = (event: SubmitEvent): void => {
		event.preventDefault();

		const action = element.getAttribute('action') ?? element.getAttribute(ajaxifyUrlAttribute);

		if (action === null) {
			throw new Error('Islands - ajaxify: Form element doesn\' have action or data-action attribute.');
		}

		sendRequest({
			info: action,
			init: {
				headers: {
					'Content-Type': 'multipart/form-data'
				},
				method: element.method ?? 'post',
				body: new FormData(element)
			},
			element,
			onSuccessCallback: () => {
				if (element.hasAttribute(ajaxifyOnceAttribute)) {
					element.removeEventListener('submit', handler);
				}
			}
		});
	};

	on('submit', element, handler)
}

window.addEventListener('popstate', function (event) {
	if (typeof window.history.state.ajaxify === 'boolean') {
		sendRequest({
			info: window.location.href
		});
	}
});

onDomReady(() => {
	selectAll(`[${ajaxifyAttribute}]`).forEach((element) => {
		const configAttributeData = element.getAttribute(ajaxifyAttribute);
		const parsedConfigData = new Function(`return {${configAttributeData}}`)() as ConfigFromAttribute

		if (Object.keys(parsedConfigData).length > 0) {
			processConfig(element, parsedConfigData)
			return;
		}

		const elementTagName = element.tagName.toLowerCase();

		if (elementTagName === 'form') {
			processForm(element as HTMLFormElement);
		} else {
			processOther(element as HTMLAnchorElement);
		}
	});
});
