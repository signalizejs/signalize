/* declare module '..' {
	interface Signalize {
		height: (element: Node) => number
	}
}
 */

export default () => ({
	height: (element) => {
		if (element === document) {
			return window.innerHeight;
		}

		return element instanceof Element ? parseFloat(window.getComputedStyle(element).height) : 0;
	}
});
