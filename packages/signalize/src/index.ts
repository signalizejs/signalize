import { bind } from './bind';
import { createHtml } from './createHtml';
import { dispatch } from './dispatch';
import { isJson } from './isJson';
import { onDomReady } from './onDomReady';
import { signal, Signal } from './signal';
import { on } from './on';
import { select } from './select';
import { selectAll } from './selectAll';

export * from './bind';
export * from './createHtml';
export * from './dispatch';
export * from './isJson';
export * from './mergeObjects';
export * from './normalizeTargets';
export * from './on';
export * from './onDomReady';
export * from './select';
export * from './selectAll';
export * from './signal';

interface SignalizeWindowObject {
	$config: typeof config
	Signal: typeof Signal
	bind: typeof bind
	configure: typeof configure
	createHtml: typeof createHtml
	dispatch: typeof dispatch
	isJson: typeof isJson
	on: typeof on
	onDomReady: typeof onDomReady
	select: typeof select
	selectAll: typeof selectAll
	signal: typeof signal
}

export const config: Record<string, any> = {
	attributesPrefix: 'data-',
	libPrefix: ''
}

export const configure = <T>(data: T): void => {

}

onDomReady(() => {
	new MutationObserver((mutationList): void => {
		for (const mutation of mutationList) {
			dispatch('dom-mutation', mutation);

			for (const node of mutation.removedNodes) {
				dispatch('dom-mutation:node:removed', node)
			}

			for (const node of mutation.addedNodes) {
				dispatch('dom-mutation:node:added', node)
			}
		}
	}).observe(document, { childList: true, subtree: true, attributes: true });
});

export const Signalize: SignalizeWindowObject = {
	$config: config,
	Signal,
	bind,
	configure,
	createHtml,
	dispatch,
	isJson,
	on,
	onDomReady,
	select,
	selectAll,
	signal
};

if (typeof window !== 'undefined' && typeof window.Signalize === 'undefined') {
	window.Signalize = Signalize
}

export default Signalize;
