import Signalize from './Signalize';

if (window?.Signalize === undefined) {
	if (document.currentScript?.hasAttribute('noinit') === false
		&& document.currentScript?.hasAttribute('data-noinit') === false
	) {
		window.Signalize = new Signalize();
	} else {
		window.Signalize = Signalize;
	}
}
