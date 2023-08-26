import type Signalize from '..'

declare module '..' {
	interface Signalize {
		AsyncFunction: () => Promise<void>
	}
}

export default (signalize: Signalize): void => {
	signalize.AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
}
