import type signalize from '.';

declare global {
	interface Window {
		Signalize: typeof signalize
		$i: typeof signalize
	}
}