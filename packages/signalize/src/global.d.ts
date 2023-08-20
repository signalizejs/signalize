import type { Signalize } from '.';

declare global {
	interface Window {
		Signalize: Signalize
	}
}
