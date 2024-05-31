/**
 * @callback width
 * @param {Element|Document} element
 * @returns {number}
 */

/** @type {import('../Signalize').SignalizeModule} */
export default () => ({
	/** @type {width} */
	width: (element) => {
		if (element === document) {
			return window.innerWidth;
		}

		return element instanceof Element ? element.getBoundingClientRect().width : 0;
	}
});
