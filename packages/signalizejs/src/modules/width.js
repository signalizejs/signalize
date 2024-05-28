export default () => {
	const width = (element) => {
		if (element === document) {
			return window.innerWidth;
		}

		return element instanceof Element ? parseFloat(element.getBoundingClientRect().width) : 0;
	};
	return { width };
};
