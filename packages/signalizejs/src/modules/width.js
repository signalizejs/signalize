/** @type {import('../../types/Signalize').Module} */
export default () => ({
	/** @type {import('../../types/modules/width').width} */
	width: (element) => {
		if (element === document) {
			return window.innerWidth;
		}

		return element instanceof Element ? element.getBoundingClientRect().width : 0;
	}
});
