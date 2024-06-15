/** @type {import('../../types/Signalize').Module<import('../../types/index').WidthModule>} */
export default () => ({
	/** @type {import('../../types/modules/width').width} */
	width: (element) => {
		if (element === document) {
			return window.innerWidth;
		}

		return element instanceof Element ? element.getBoundingClientRect().width : 0;
	}
});
