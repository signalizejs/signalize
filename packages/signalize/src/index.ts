import { bind } from './bind';
import { scope } from './scope';
import type { Config } from './config';
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
import { observe } from './mutationObserver';
import { AsyncFunction } from './asyncFunction';
import { mergeObjects } from './mergeObjects';

export * from './asyncFunction';
export * from './bind';
export * from './createHtml';
export * from './scope';
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

interface SignalizeOptions {
	$config?: Partial<Config>
}

export class Signalize {
	constructor (options?: SignalizeOptions) {
		this.$config = mergeObjects($config, options?.$config ?? {});

		observe(this.$config.root);
	}

	$config;
	AsyncFunction = AsyncFunction;
	Signal = Signal;
	bind = bind;
	scope = scope;
	createHtml = createHtml
	directive = directive;
	dispatch = dispatch;
	isDomReady = isDomReady;
	isJson = isJson;
	off = off;
	on = on;
	onDomReady = onDomReady;
	plugin = plugin;
	ref = ref;
	refs = refs;
	select = select;
	selectAll = selectAll;
	signal = signal;
	task = task
}

if ($config.exposeSignalize && typeof window !== 'undefined' && typeof window.Signalize === 'undefined') {
	window.Signalize = new Signalize();
}

export default Signalize;
