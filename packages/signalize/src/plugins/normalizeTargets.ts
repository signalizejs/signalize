import type Signalize from '..';

declare module '..' {
	interface Signalize {
		normalizeTargets: (target: EventTarget, normalizeDocument: boolean) => ElementsType
	}
}

export type EventTarget = string | NodeListOf<HTMLElement> | HTMLElement[] | HTMLElement | Window;

export type ElementsType = Array<HTMLElement | Document | Window>;

export default (signalize: Signalize): void => {
	signalize.normalizeTargets = (target: EventTarget, normalizeDocument = false): ElementsType => {
		let elements: ElementsType;

		if (typeof target === 'string') {
			elements = [...signalize.selectAll<HTMLElement>(target)];
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

}
