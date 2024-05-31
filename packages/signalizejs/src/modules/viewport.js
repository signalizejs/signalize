/**
 * Information about the visibility of an element within the viewport.
 *
 * @typedef ViewportInfo
 * @property {boolean} top - Indicates if the top of the element is visible in the viewport.
 * @property {boolean} bottom - Indicates if the bottom of the element is visible in the viewport.
 * @property {boolean} whole - Indicates if the entire element is visible in the viewport.
 */

/**
 * @callback isInViewport
 * @param {Element} element
 * @returns {ViewportInfo}
 */

/** @type {import('../Signalize').SignalizeModule} */
export default async ({ resolve }) => {
	const { offset, height } = await resolve('offset', 'height');

	return {
		/** @type {isInViewport} */
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
