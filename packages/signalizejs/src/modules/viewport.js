/** @type {import('../../types/Signalize').Module} */
export default async ({ resolve }) => {
	/** @type {{ offset: import('../../types/modules/offset').offset, height: import('../../types/modules/height').height }}} */
	const { offset, height } = await resolve('offset', 'height');

	return {
		/** @type {import('../../types/modules/viewport').isInViewport} */
		isInViewport: (element) => {
			const windowTop = window.scrollY;
			const windowBottom = windowTop + window.innerHeight;
			const elementTop = offset(element).top;
			const elementBottom = elementTop + height(element);

			return {
				top: windowTop < elementTop && elementTop < windowBottom,
				bottom: windowTop < elementBottom && elementBottom < windowBottom,
				whole: windowBottom >= elementBottom && windowTop <= elementTop
			};
		}
	};
};
