/** @type {import('../../../types/Signalize').Module<import('../../../types/modules/strings/cases').StringsCasesModule>} */
export default () => ({
	/** @type {import('../../../types/modules/strings/cases').dashCase} */
	dashCase: (str) => str.replace(/[A-Z]/g, (token) => '-' + token.toLowerCase())
});
