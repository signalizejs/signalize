/** @type {import('../../types/Signalize').Module<import('../../types/modules/sizes').SizesModule>} */
export default () => ({
	height: (element) => {
		if (element === document) {
			return window.innerHeight;
		}

		return element instanceof Element ? element.getBoundingClientRect().height : 0;
	},
	width: (element) => {
		if (element === document) {
			return window.innerWidth;
		}

		return element instanceof Element ? element.getBoundingClientRect().width : 0;
	}
});
