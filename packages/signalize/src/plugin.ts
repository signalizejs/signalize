import type { SignalizeWindowObject } from '.';
import { onDomReady, isDomReady } from './domReady';

type Plugin = (signalize: SignalizeWindowObject) => void;

let pluginsToInit: Plugin[] = [];

const initPlugins = (pluginsToInit: Plugin[]): void => {
	for (const plugin of pluginsToInit) {
		plugin(window.Signalize);
	}
}

export const plugin = (...plugins: Plugin[]): void => {
	if (isDomReady()) {
		initPlugins(plugins);
	} else {
		pluginsToInit = [...pluginsToInit, ...plugins];
	}
}

onDomReady(() => {
	initPlugins(pluginsToInit);
});
