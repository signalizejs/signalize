/** @type {import('../../types/Signalize').Module<import('../../types/index').IsVisibleModule>} */
export default () => ({
	/** @type {import('../../types/modules/is-visible').isVisible} */
	isVisible: (element) => {
		if (element.getClientRects().length !== 0) {
			return true;
		}

		return element.offsetWidth !== 0 || element.offsetHeight !== 0;
	}
});
