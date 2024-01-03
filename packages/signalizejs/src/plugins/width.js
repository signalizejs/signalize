/**
 * @returns {import('../Signalize').SignalizePlugin}
 */
export default () => {
	/**
	 * @param {import('../Signalize').Signalize} $
	 * @returns { void }
	 */
	return ($) => {
		$.width = (element) => {
			if (element === document) {
				return window.innerWidth;
			}

			return element instanceof Element ? parseFloat(window.getComputedStyle(element).width) : 0;
		};
	};
};
