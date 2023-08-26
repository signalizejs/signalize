import type Signalize from '..';

declare module '..' {
	interface Signalize {
		parseHTML: (html: string, type: DOMParserSupportedType) => Document
	}
}

export default (signalize: Signalize): void => {
	signalize.parseHTML = (html: string, type: DOMParserSupportedType = 'text/html'): Document =>
		(new DOMParser()).parseFromString(html, type);
}
