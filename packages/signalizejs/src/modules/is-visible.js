/* declare module '..' {
	interface Signalize {
		isVisible: (element: Element) => boolean
	}
} */

export default () => ({
	isVisible: (element) => {
		if (element.getClientRects().length !== 0) {
			return true;
		}

		return element.offsetWidth !== 0 || element.offsetHeight !== 0;
	}
});
