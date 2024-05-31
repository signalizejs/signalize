/**
 * @callback isVisible
 * @param {HTMLElement} elemnent
 */

/** @type {import('../Signalize').SignalizeModule} */
export default () => ({
	/** @type {isVisible} */
	isVisible: (element) => {
		if (element.getClientRects().length !== 0) {
			return true;
		}

		return element.offsetWidth !== 0 || element.offsetHeight !== 0;
	}
});
