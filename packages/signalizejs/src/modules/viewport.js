/** @type {import('../../types/Signalize').Module<import('../../types/modules/viewport').ViewportModule>} */
export default async ({ resolve }) => {

	const { offset, height } = await resolve('offset', 'sizes');

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
