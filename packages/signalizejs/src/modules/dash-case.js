/**
 * @callback dashCase
 * @param {string} str
 */

/** @type {import('../Signalize').SignalizeModule} */
export default () => ({
	/** @type {dashCase} */
	dashCase: (str) => str.replace(/[A-Z]/g, (token) => '-' + token.toLowerCase())
});
