import type { CustomEventListener } from 'signalizejs';
import { on, onDomReady, selectAll } from 'signalizejs';

interface ComponentInitFunctionArguments {
	el: HTMLElement
	ref: <T extends HTMLElement>(id: string) => T
	refs: <T extends HTMLElement>(id: string) => T[]
}

type ComponentInitFunction = (data: ComponentInitFunctionArguments) => void;
const definedComponents: Record<string, ComponentInitFunction> = {};
const componentAttribute = 'data-component';
const refAttribute = 'data-ref';

const createComponent = (el: HTMLElement): void => {
	const componentName = el.getAttribute(componentAttribute) as string;
	const initFn = definedComponents[componentName] ?? undefined;

	if (initFn === undefined) {
		return;
	}

	initFn({
		el,
		ref: <T>(id: string) => (refs(id, el)[0] ?? null) as T,
		refs: <T>(id: string) => refs(id, el) as T
	});
}

const refs = <T extends HTMLElement>(
	id: string,
	root: HTMLElement
): T[] => {
	const items = selectAll<T>(`[${refAttribute}="${id}"]`, root);

	return [...items].filter((ref) => {
		const closestComponent = ref.closest(`[${componentAttribute}]`) as HTMLElement

		if (closestComponent !== root) {
			throw new Error(`You are trying to access ref "${id}" it's parent is "${closestComponent.getAttribute(componentAttribute) as string}".`)
		}

		return true;
	});
}

const initComponents = (root: HTMLElement, name?: string): void => {
	const selector = name !== undefined ? `[${componentAttribute}="${name}"]` : `[${componentAttribute}]`;
	for (const el of root.querySelectorAll<HTMLElement>(selector)) {
		createComponent(el);
	}
}

export const component = (name: string, init: ComponentInitFunction): void => {
	if (name in definedComponents) {
		throw new Error(`Component "${name}" already defined.`);
	}

	definedComponents[name] = init;
	initComponents(document.documentElement, name);
}

onDomReady(() => {
	on('dom-mutation:node:added' as keyof CustomEventListener, document, ({ detail }: { detail: Node }): void => {
		if (!(detail instanceof HTMLElement)) {
			return;
		}

		initComponents(detail);
	})
});
