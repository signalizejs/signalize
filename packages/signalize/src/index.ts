import { bind } from './bind';
import { component } from './component';
import { $config } from './config';
import { createHtml } from './createHtml';
import { directive } from './directives';
import { dispatch } from './dispatch';
import { off } from './off';
import { isJson } from './isJson';
import { isDomReady, onDomReady } from './domReady';
import { signal, Signal } from './signal';
import { on } from './on';
import { ref, refs } from './ref';
import { select, selectAll } from './select';
import { plugin } from './plugin';
import { task } from './task';
import './mutationObserver';

export * from './bind';
export * from './createHtml';
export * from './component';
export * from './config';
export * from './dispatch';
export * from './directives';
export * from './domReady';
export * from './isJson';
export * from './mergeObjects';
export * from './normalizeTargets';
export * from './off';
export * from './on';
export * from './plugin';
export * from './ref';
export * from './select';
export * from './signal';
export * from './task';

interface SignalizeWindowObject {
	$config: typeof $config
	Signal: typeof Signal
	bind: typeof bind
	createHtml: typeof createHtml
	component: typeof component
	dispatch: typeof dispatch
	directive: typeof directive
	isDomReady: typeof isDomReady
	isJson: typeof isJson
	off: typeof off
	on: typeof on
	onDomReady: typeof onDomReady
	plugin: typeof plugin
	ref: typeof ref
	refs: typeof refs
	select: typeof select
	selectAll: typeof selectAll
	signal: typeof signal
	task: typeof task
}

export const Signalize: SignalizeWindowObject = {
	$config,
	Signal,
	bind,
	component,
	createHtml,
	dispatch,
	directive,
	isDomReady,
	isJson,
	off,
	on,
	onDomReady,
	plugin,
	ref,
	refs,
	select,
	selectAll,
	signal,
	task
};

if (typeof window !== 'undefined' && typeof window.Signalize === 'undefined') {
	window.Signalize = Signalize
}

export default Signalize;
