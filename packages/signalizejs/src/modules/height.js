/** @type {import('../../types/Signalize').Module} */
export default () => ({
	/** @type {import('../../types/modules/height').height} */
	height: (element) => {
		if (element === document) {
			return window.innerHeight;
		}

		return element instanceof Element ? element.getBoundingClientRect().height : 0;
	}
});
