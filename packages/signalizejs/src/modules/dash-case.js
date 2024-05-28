/* declare module '..' {

	interface Signalize {
		dashCase: (str: string) => string
	}
} */

export default () => ({
	dashCase: (str) => {
		return str.replace(/[A-Z]/g, (token) => '-' + token.toLowerCase());
	}
});
