const scriptLoaderAttribute = 'data-script-loader';
const loadedScripts = [];

const customEventTriggers = {};

const injectScript = (attributes = {}, onLoadCallback = undefined) => {
	const scriptElement = document.createElement('script');

	for (const [key, value] of Object.entries(attributes)) scriptElement.setAttribute(key, value);

	if (typeof onLoadCallback === 'function') scriptElement.onload = onLoadCallback;

	document.head.appendChild(scriptElement);
}

const attachListeners = (element) => {
	const config = element.getAttribute(`${scriptLoaderAttribute}`);
	const configFn = new Function(`return {${config}}`);

	for (const [triggerEvent, script] of Object.entries(configFn)) {
		const triggerEventToArray = triggerEvent.split(',');
		for (const eventName of triggerEventToArray) {
			if (eventName in customEventTriggers) {
				customEventTriggers[eventName](script);
				continue;
			}

			element.addEventListener(eventName, () => {
				injectScript(script, () => dispatchEvent('scriptLoader:scriptLoaded', {}))
			})
		}
	}
}

onDomReady(() => {
	for (const element of document.querySelectorAll(`[${scriptLoaderAttribute}]`)) {
		attachListeners(element);
	}

	/* document.addEventListener('domMutation', ({detail}) => {
		if (!['childList', 'subtree'].includes(detail.type)) return;

		console.log(detail);
	}) */
});
