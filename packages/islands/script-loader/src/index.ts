import { onDomReady, dispatch, selectAll } from 'islandsjs';

interface ScriptToLoad extends Partial<HTMLScriptElement> {
	src: string
}

const scriptLoaderAttribute = 'data-script-loader';
const scriptLoaderInitedAttribute = `${scriptLoaderAttribute}-inited`;
const scriptLoaderScriptEventAttribute = `${scriptLoaderAttribute}-trigger-event`;
const loadedScripts: Record<string, ScriptToLoad> = {};
const customEventTriggers = {};

const injectScripts = async (
	scripts: ScriptToLoad[],
	onLoadCallback?: CallableFunction,
	onErrorCallback?: CallableFunction
) => {
	const scriptsToLoad: string[] = [];

	for (const script of scripts) {
		if (script.src in loadedScripts) {
			continue;
		}

		const scriptElement = document.createElement('script');

		for (const [key, value] of Object.entries(script)) {
			scriptElement.setAttribute(key, value)
		}

		scriptElement.onload = () => {
			scriptsToLoad.push(script.src);

			if (scriptsToLoad.length === scripts.length && onLoadCallback !== undefined) {
				onLoadCallback();
			}
		}

		scriptElement.onerror = () => {
			if (onErrorCallback !== undefined) {
				onErrorCallback();
			}
		}

		document.head.appendChild(scriptElement);
	}
}

const attachListeners = (element: HTMLElement): void => {
	if (element.hasAttribute(scriptLoaderInitedAttribute)) {
		return;
	}

	const config = element.getAttribute(`${scriptLoaderAttribute}`) ?? '';
	// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
	const configData = new Function(`return {${config}}`)() as Record<string, string | string[]>

	const prepareScripts = (triggerEvent: string, scripts: string | string[] | ScriptToLoad | ScriptToLoad[]): ScriptToLoad[] => {
		return (Array.isArray(scripts) ? scripts : [scripts]).map((item) => {
			item = typeof item === 'string' ? { src: item } : item;
			item[scriptLoaderScriptEventAttribute] = triggerEvent;
			return item;
		});
	}

	for (const [triggerEvent, scripts] of Object.entries(configData)) {
		const triggerEventToArray = triggerEvent.split(',');

		for (const eventName of triggerEventToArray) {
			if (eventName in customEventTriggers) {
				const preparedScripts = prepareScripts(eventName, scripts).filter((script) => {
					return !(script.src in loadedScripts);
				})

				if (preparedScripts.length === 0) {
					continue;
				}

				customEventTriggers[eventName]({
					injectScripts,
					scripts: preparedScripts
				});
			} else {
				const handler = (): void => {
					injectScripts(
						prepareScripts(eventName, scripts),
						() => {
							dispatch('scriptLoader:scriptLoaded', {});
							element.removeEventListener(eventName, handler);
						},
						() => dispatch('scriptLoader:scriptNotLoaded', {})
					)
				};

				element.addEventListener(eventName, handler);
				element.setAttribute(scriptLoaderInitedAttribute, 'true');
			}
		}
	}
}

onDomReady(() => {
	const init = (): void => {
		for (const element of selectAll<HTMLElement>(`[${scriptLoaderAttribute}]:not([${scriptLoaderInitedAttribute}])`)) {
			attachListeners(element);
		}
	}

	init();

	document.addEventListener('domMutation', ({ detail }) => {
		if (!['childList', 'subtree', 'attributes'].includes(detail.type)) {
			return
		};

		init();
	})
});
