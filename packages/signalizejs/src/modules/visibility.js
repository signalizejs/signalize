/** @type {import('../../types/Signalize').Module<import('../../types/modules/visibility').VisibilityModule>} */
export default () => ({
	/** @type {import('../../types/modules/visibility').isVisible} */
	isVisible: (element) => {
		if (element.getClientRects().length !== 0) {
			return true;
		}

		return element.offsetWidth !== 0 || element.offsetHeight !== 0;
	}
});
