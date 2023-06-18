import type { CustomEventListener } from 'islandsjs';
import { onDomReady, dispatch, selectAll, on } from 'islandsjs';

interface ScriptToLoad extends Partial<HTMLScriptElement> {
	src: string
}

type AttributeScriptConfig = Record<string, string | string[] | ScriptToLoad | ScriptToLoad>
const scriptLoaderAttribute = 'data-script-loader';
const scriptLoaderInitedAttribute = `${scriptLoaderAttribute}-inited`;
const scriptLoaderScriptEventAttribute = `${scriptLoaderAttribute}-trigger-event`;
const customEventTriggers = {};

const findScript = (src: string): HTMLScriptElement | null => document.querySelector(`script[src="${src}"]`);

const isScriptLoaded = (src: string): boolean => findScript(src) !== null;

export const load = async (scripts: ScriptToLoad[]): Promise<void> => {
	const scriptsPromises: Promise<any>[] = [];

	for (const script of scripts) {
		if (isScriptLoaded(script.src)) {
			continue;
		}

		const scriptElement = document.createElement('script');

		for (const [key, value] of Object.entries(script)) {
			scriptElement.setAttribute(key, value)
		}

		scriptsPromises.push(new Promise((resolve, reject) => {
			scriptElement.onload = () => {
				resolve({ script, scriptElement });
			}

			scriptElement.onerror = (error) => {
				reject(error);
				scriptElement.remove();
			}
		}))

		document.head.appendChild(scriptElement);
	}

	await Promise.all(scriptsPromises);
}

const attachListeners = (element: HTMLElement): void => {
	if (element.hasAttribute(scriptLoaderInitedAttribute)) {
		return;
	}

	const config = element.getAttribute(`${scriptLoaderAttribute}`) ?? '';
	// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
	const configData = new Function(`return {${config}}`)() as AttributeScriptConfig;

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
					return !isScriptLoaded(script.src);
				})

				if (preparedScripts.length === 0) {
					continue;
				}

				customEventTriggers[eventName]({
					scripts: preparedScripts
				});
			} else {
				const scriptsToLoad = prepareScripts(eventName, scripts);
				const handler = (): void => {
					load(scriptsToLoad)
						.then(() => {
							dispatch('script-loader:success', { scripts: scriptsToLoad })
							element.removeEventListener(eventName, handler);
						})
						.catch((error) => {
							dispatch('script-loader:error', { error, scripts: scriptsToLoad })
						})
				};

				on(eventName as CustomEventListener, element, handler);
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

	document.addEventListener('dom-mutation', ({ detail }) => {
		if (!['childList', 'subtree', 'attributes'].includes(detail.type)) {
			return
		}

		init();
	})
});
