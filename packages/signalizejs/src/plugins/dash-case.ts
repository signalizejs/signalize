import type { Signalize } from '..';

declare module '..' {

	interface Signalize {
		dashCase: (str: string) => string
	}
}

export default ($: Signalize): void => {
	$.dashCase = (str: string) => {
		return str.replace(/[A-Z]/g, (token: string) => '-' + token.toLowerCase())
	}
}
