/** @type {import('../../types/Signalize').Module} */
export default () => ({
	/** @type {import('../../types/modules/dash-case').dashCase} */
	dashCase: (str) => str.replace(/[A-Z]/g, (token) => '-' + token.toLowerCase())
});
