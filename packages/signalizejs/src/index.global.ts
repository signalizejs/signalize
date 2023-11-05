import Signalize from './Signalize';

declare global {
	interface Window {
		Signalize: typeof Signalize
	}
}

window.Signalize = Signalize;
