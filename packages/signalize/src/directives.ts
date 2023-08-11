import { bind } from './bind';
import { $config } from './config';
import { isDomReady, onDomReady } from './domReady';
import { mergeObjects } from './mergeObjects';
import { on } from './on';
import { signal } from './signal';

type DirectiveMatcher = string | RegExp

type DirectiveCallback = (data: DirectiveCallbackData) => void;

interface DirectiveCallbackData {
	el: HTMLElement
}

interface Directive {
	matcher: DirectiveMatcher
	callback: DirectiveCallback
}

interface ScopeData {
	// TODO change to signal
	signals: Record<string, CallableFunction>
	methods: Record<string, CallableFunction>
}

interface Scope extends ScopeData {
	el: HTMLElement
}

let scopeAttribute = 'scope';
const directives: Record<string, Directive> = {};
const scopes: Record<number, Scope> = {};

const processDirectives = (matcherId?: string): void => {
	const elements = document.getElementsByTagName('*');
	const directivesToProcess = matcherId === undefined ? Object.values(directives) : [directives[matcherId]];

	const getParentScopeData = (el: HTMLElement, scopeData: ScopeData = { methods: {}, signals: {} }): ScopeData => {
		const parentScopeElement = el.parentElement?.closest<HTMLElement>(`[${scopeAttribute}]`);

		if (parentScopeElement === null) {
			return scopeData;
		}

		scopeData = mergeObjects(scopeData, scopes[parentScopeElement.getAttribute(scopeAttribute)]);
		return getParentScopeData(parentScopeElement, scopeData);
	}

	const createElementScope = (el: HTMLElement): Scope => {
		const scopeId = Object.keys(scopes).length.toString();
		el.setAttribute(scopeAttribute, scopeId);
		scopes[scopeId] = getParentScopeData(el);
		scopes[scopeId].el = el;
		return scopes[scopeId];
	}

	for (const element of elements) {
		/* if (element.hasAttribute(scopeAttribute)) {
			continue;
		} */

		let elementScope = null;
		for (const directive of directivesToProcess) {
			if (directive.matcher instanceof RegExp) {
				console.log(directive, element);
				for (const attribute of element.attributes) {
					const matches = attribute.name.match(directive.matcher);

					if (matches === null) {
						continue;
					}

					if (elementScope === null) {
						elementScope = createElementScope(element);
					}

					directive.callback({ ...elementScope, matches, attribute });
				}
			} else if (directive.matcher in element.attributes) {
				if (elementScope === null) {
					elementScope = createElementScope(element);
				}

				directive.callback({ ...elementScope, attribute: element.attributes[directive.matcher]});
			}
		}
	}
}

export const directive = (matcher: DirectiveMatcher, callback: DirectiveCallback): void => {
	const matcherName = matcher.toString();

	directives[matcherName] = {
		matcher,
		callback
	}

	if (isDomReady()) {
		processDirectives(matcherName)
	}
}

onDomReady(() => {
	scopeAttribute = `${$config.attributePrefix}${scopeAttribute}`;

	on('dom-mutation:node:added', () => {
		processDirectives();
	})

	directive(/(?:\$|signal:)(\S+)/, ({ matches, el, signals, attribute }) => {
		signals[matches[1]] = signal(isNaN(attribute.value) ? attribute.value : parseFloat(attribute.value));
	});

	directive(/(?::|bind:)(\S+)/, ({ matches, el, signals, attribute }) => {
		const fn = new Function(...Object.keys(signals), `const data = ${attribute.value}; console.log(typeof data, data); return data;`);
		const fnCaller = () =>  fn.call(null, ...Object.values(signals));
		let signalsToWatch = [];
		let usedSignalsCleanup = []

		for (const [signalName, signal] of Object.entries(signals)) {
			usedSignalsCleanup.push(
				signal.watch(() => {
					signalsToWatch.push(signal);
				}, { execution: 'onGet'})
			)
		}

		const bindAttribute = () => {
			const fnReturn = fnCaller();
			// TODO only signal should be called
			let data = typeof fnReturn === 'function' ? fnReturn() : fnReturn;

			bind(el, { [matches[1]]: [...signalsToWatch, () => {
				return fnCaller()
			} ]})
		}

		bindAttribute();

		for (const watchCleanup of usedSignalsCleanup) {
			watchCleanup();
		}

		usedSignalsCleanup = {};
	});

	directive(/(?:\@|on:)(\S+)/, ({ matches, el, signals, methods, attribute }) => {
		const fn = new Function(
			'event',
			...Object.keys(signals),
			...Object.keys(methods),
			attribute.value
		);

		on(matches[1], el, (event) => {
			fn.call(null, event, ...Object.values(signals), ...Object.values(methods));
		});

		console.log(matches);
	})
})
