import { bind } from './bind';
import { createHtml } from './createHtml';
import { dispatch } from './dispatch';
import { isJson } from './isJson';
import { onDomReady } from './onDomReady';
import { definedSignals, signal, Signal } from './signal';
import { on } from './on';
import { select } from './select';
import { selectAll } from './selectAll';

export * from './bind';
export * from './createHtml';
export * from './dispatch';
export * from './isJson';
//export * from './islands'
export * from './mergeObjects';
export * from './normalizeTargets';
export * from './on';
export * from './onDomReady';
export * from './select';
export * from './selectAll';
export * from './signal';

interface IslandsWindowObject {
	$config: typeof config
	$signals: typeof definedSignals
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

export const config: Record<string, any> = {}

export const configure = <T>(data: T): void => {

}

onDomReady(() => {
	new MutationObserver((mutationList): void => {
		for (const mutation of mutationList) {
			dispatch('domMutation', mutation);

			for (const node of mutation.removedNodes) {
				dispatch('domMutation:nodeRemoved', node)
			}

			for (const node of mutation.addedNodes) {
				dispatch('domMutation:nodeAdded', node)
			}
		}
	}).observe(document, { childList: true, subtree: true, attributes: true });
});

export const Islands: IslandsWindowObject = {
	$config: config,
	$signals: definedSignals,
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

if (typeof window !== 'undefined') {
	window.Islands = Islands
	window.$i = Islands
}

export default Islands;
