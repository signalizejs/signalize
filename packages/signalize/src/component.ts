import type { CustomEventListener } from './on';
import { $config } from './config';
import { on } from './on';
import { isDomReady, onDomReady } from './domReady';
import { ref, refs } from './ref';

interface ComponentInitFunctionArguments {
	$el: HTMLElement
	ref: typeof ref
	refs: typeof refs
}

type ComponentInitFunction = (data: ComponentInitFunctionArguments) => void;

let componentAttribute = 'component';
const definedComponents: Record<string, ComponentInitFunction> = {};

const createComponent = (el: HTMLElement): void => {
	const componentName = el.getAttribute(componentAttribute) as string;
	const initFn = definedComponents[componentName] ?? undefined;

	if (initFn === undefined) {
		return;
	}

	const parentComponentIsEl = (refElement: HTMLElement): boolean => refElement.closest(`[${componentAttribute}]`) === el;

	initFn({
		$el: el,
		ref: <T extends HTMLElement>(id: string): T | null => {
			const refEl = ref<T>(id, el);
			return refEl !== null && parentComponentIsEl(refEl) ? refEl : null
		},
		refs: (id: string) => [...refs(id, el)].filter(parentComponentIsEl)
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

	if (isDomReady()) {
		initComponents(document.documentElement, name);
	}
};

onDomReady(() => {
	componentAttribute = `${$config.attributesPrefix}${componentAttribute}`;

	initComponents(document.documentElement);

	on('dom-mutation:node:added' as keyof CustomEventListener, document, ({ detail }: { detail: Node }): void => {
		if (!(detail instanceof HTMLElement)) {
			return;
		}

		initComponents(detail);
	});
})
