/**
 * @callback height
 * @param {Element|Document} element
 * @returns {number}
 */

/** @type {import('../Signalize').SignalizeModule} */
export default () => ({
	/** @type {height} */
	height: (element) => {
		if (element === document) {
			return window.innerHeight;
		}

		return element instanceof Element ? element.getBoundingClientRect().height : 0;
	}
});
