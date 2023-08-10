import type { CustomEventListener } from 'signalizejs';
import { $config, on, onDomReady, dispatch, selectAll } from 'signalizejs';

type AttributeAssetConfig = Record<string, string | string[] | HTMLScriptElement | HTMLLinkElement>
const assetLoaderEventName = 'asset-loader';
let assetLoaderAttribute: string;
let assetLoaderInitedAttribute: string;
let assetLoaderAssetEventAttribute: string;
const customEventTriggers = {};

export const load = async (assets: Array<HTMLLinkElement | HTMLScriptElement>): Promise<void> => {
	const assetsPromises: Promise<any>[] = [];

	for (const asset of assets) {
		const isAsset = 'src' in asset;
		const tagName = isAsset ? 'script' : 'link';
		const attributeName = isAsset ? 'src' : 'href';

		if (document.querySelector(`${tagName}[${attributeName}="${asset[attributeName]}"]`) !== null) {
			continue;
		}

		const assetElement = document.createElement(tagName);

		for (const [key, value] of Object.entries(asset)) {
			assetElement.setAttribute(key, value)
		}

		assetsPromises.push(new Promise((resolve, reject) => {
			assetElement.onload = () => {
				resolve({ asset, assetElement });
			}

			assetElement.onerror = (error) => {
				reject(error);
				assetElement.remove();
			}
		}))

		document.head.appendChild(assetElement);
	}
	await Promise.all(assetsPromises);
}

const attachListeners = (element: HTMLElement): void => {
	if (element.hasAttribute(assetLoaderInitedAttribute)) {
		return;
	}

	const config = element.getAttribute(`${assetLoaderAttribute}`) ?? '';
	// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
	const configData = new Function(`return {${config}}`)() as AttributeAssetConfig;

	const prepareAssets = (triggerEvent: string, assets: string | string[] | HTMLScriptElement | HTMLScriptElement[] | HTMLLinkElement | HTMLLinkElement[]): Array<HTMLScriptElement | HTMLLinkElement> => {
		return (Array.isArray(assets) ? assets : [assets]).map((item): HTMLLinkElement | HTMLScriptElement => {
			let asset = item;

			if (typeof item === 'string') {
				const assetPath = item.replace(/\?\S+/, '').replace(/#\S+/, '');
				const isJs = assetPath.endsWith('.js');
				asset = {
					[isJs ? 'src' : 'href']: item
				}

				if (!isJs) {
					asset['rel'] = 'stylesheet';
				}
			}

			asset[assetLoaderAssetEventAttribute] = triggerEvent;
			return asset;
		});
	}

	for (const [triggerEvent, assets] of Object.entries(configData)) {
		const triggerEventToArray = triggerEvent.split(',');

		for (const eventName of triggerEventToArray) {
			if (eventName in customEventTriggers) {
				const preparedAssets = prepareAssets(eventName, assets).filter((asset) => {
					return !isAssetLoaded(asset.url);
				})

				if (preparedAssets.length === 0) {
					continue;
				}

				customEventTriggers[eventName]({
					assets: preparedAssets
				});
			} else {
				const assetsToLoad = prepareAssets(eventName, assets);
				const handler = (): void => {
					load(assetsToLoad)
						.then(() => {
							dispatch(`${assetLoaderEventName}:success`, { assets: assetsToLoad });
							element.removeEventListener(eventName, handler);
						})
						.catch((error) => {
							dispatch(`${assetLoaderEventName}:error`, { error, assets: assetsToLoad })
						})
				};

				on(eventName as CustomEventListener, element, handler);
				element.setAttribute(assetLoaderInitedAttribute, 'true');
			}
		}
	}
}

onDomReady(() => {
	assetLoaderAttribute = `${$config.attributePrefix}asset-loader`;
	assetLoaderInitedAttribute = `${assetLoaderAttribute}-inited`;
	assetLoaderAssetEventAttribute = `${assetLoaderAttribute}-trigger-event`;

	const init = (): void => {
		for (const element of selectAll<HTMLElement>(`[${assetLoaderAttribute}]:not([${assetLoaderInitedAttribute}])`)) {
			attachListeners(element);
		}
	}

	init();

	on('dom-mutation', document, ({ detail }) => {
		if (!['childList', 'subtree', 'attributes'].includes(detail.type)) {
			return
		}

		init();
	})
});
