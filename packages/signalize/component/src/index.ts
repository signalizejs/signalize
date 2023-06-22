import type { CustomEventListener } from 'signalizejs';
import { on, onDomReady, selectAll } from 'signalizejs';

interface OnComponentEmitListenerArguments {
	component: string
	event: string
	data: any
}

type OnComponentEmitListener = (options: OnComponentEmitListenerArguments) => void;

interface InitializedComponent {
	setProp: CallableFunction
	onEmit: OnComponentEmitListener
}

interface ComponentInitFunctionArguments {
	el: HTMLElement
	parentComponentEl: HTMLElement | undefined
	parentComponentId: string | undefined
	id: string
	ref: <T extends HTMLElement>(id: string) => T
	refs: <T extends HTMLElement>(id: string) => T[]
	onRemove: (listener: CallableFunction) => void
}

type ComponentInitFunction = (data: ComponentInitFunctionArguments) => void;
const definedComponents: Record<string, ComponentInitFunction> = {};
const componentAttribute = 'data-component';
const componentIdAttribute = 'data-component-id';
const refAttribute = 'data-ref';

const initializedComponents: Record<string, InitializedComponent> = {};

const createComponent = (el: HTMLElement): void => {
	const componentName = el.getAttribute(componentAttribute) as string;
	const initFn = definedComponents[componentName] ?? undefined;

	if (initFn === undefined) {
		return;
	}

	const componentId = String(Object.keys(initializedComponents).length);
	const onRemoveListeners = new Set<CallableFunction>();
	const parentComponentEl = el.parentElement?.closest<HTMLElement>(`[${componentAttribute}]`) ?? undefined;

	el.setAttribute(componentIdAttribute, componentId);

	on('remove', el, () => {
		for (const listener of onRemoveListeners) {
			listener();
		}
	});

	initFn({
		el,
		parentComponentEl,
		parentComponentId: parentComponentEl?.dataset.componentId ?? undefined,
		id: componentId,
		ref: <T>(id: string) => (refs(id, el, componentId)[0] ?? null) as T,
		refs: <T>(id: string) => refs(id, el, componentId) as T,
		onRemove: (listener: CallableFunction) => { onRemoveListeners.add(listener) }
	});
}

const refs = <T extends HTMLElement>(
	id: string,
	root: HTMLElement,
	componentId: string
): T[] => {
	const items = selectAll<T>(`[${refAttribute}="${id}"]`, root ?? document.documentElement);

	return [...items].filter((ref) => {
		const closestComponent = ref.closest(`[${componentAttribute}]`);

		if (closestComponent !== null) {
			const closestComponentName = closestComponent.getAttribute(componentAttribute) as string;

			if (componentId === undefined) {
				throw new Error(`You are trying to access ref "${id}" of component "${closestComponentName}" from global scope.`)
			} else {
				const closestComponentIsParent = closestComponent.getAttribute(componentIdAttribute) === String(componentId);
				if (!closestComponentIsParent) {
					throw new Error(`You are trying to access ref "${id}" it's parent is "${closestComponentName}".`)
				}
			}
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