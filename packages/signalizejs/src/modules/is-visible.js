/* declare module '..' {
	interface Signalize {
		isVisible: (element: Element) => boolean
	}
} */

/**
 * @returns {import('../Signalize').SignalizePlugin}
 */
export default () => ({
	/**
	 * @param {Element} element
	 * @returns {boolean}
	 */
	isVisible: (element) => {
		if (element.getClientRects().length !== 0) {
			return true;
		}

		return element.offsetWidth !== 0 || element.offsetHeight !== 0;
	}
});
