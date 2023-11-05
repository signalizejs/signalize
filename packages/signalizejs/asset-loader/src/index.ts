import type { Signalize, CustomEventListener } from 'signalizejs';

declare module 'signalizejs' {
	interface Signalize {
		loadAssets: (assets: Array<HTMLLinkElement | HTMLScriptElement>) => Promise<void>
	}
}

export default ($: Signalize): void => {
	$.loadAssets = async (assets: Array<HTMLLinkElement | HTMLScriptElement>): Promise<void> => {
		const assetsPromises: Array<Promise<void>> = [];

		for (const asset of assets) {
			const isAsset = 'src' in asset;
			const tagName = isAsset ? 'script' : 'link';
			const attributeName = isAsset ? 'src' : 'href';

			if ($.select(`${tagName}[${attributeName}="${asset[attributeName]}"]`) !== null) {
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
}
