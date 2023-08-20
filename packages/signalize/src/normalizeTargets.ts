import { selectAll } from './select';

export type EventTarget = string | NodeListOf<HTMLElement> | HTMLElement[] | HTMLElement | Window;

export type ElementsType = Array<HTMLElement | Document | Window>;

export const normalizeTargets = (target: EventTarget, normalizeDocument = false): ElementsType => {
	let elements: ElementsType;

	if (typeof target === 'string') {
		elements = [...selectAll<HTMLElement>(target)];
	} else {
		const targetIsDocument = target instanceof Document;
		if (target instanceof HTMLElement || targetIsDocument || target instanceof Window) {
			elements = [targetIsDocument && normalizeDocument ? target.documentElement : target]
		} else {
			elements = target instanceof Array || target instanceof NodeList ? [...target] : [target];
		}
	}

	return elements;
}
