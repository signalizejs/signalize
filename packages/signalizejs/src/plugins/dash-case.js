/* declare module '..' {

	interface Signalize {
		dashCase: (str: string) => string
	}
} */

/**
 * @param {import('../Signalize').Signalize} $
 * @returns {void}
 */
export default ($) => {
	/**
	 * Converts a camelCase or PascalCase string to dash-case.
	 *
	 * @function
	 * @param {string} str - The input string in camelCase.
	 * @returns {string} The string converted to dash-case.
	 */
	$.dashCase = (str) => {
		return str.replace(/[A-Z]/g, (token) => '-' + token.toLowerCase());
	};
};
