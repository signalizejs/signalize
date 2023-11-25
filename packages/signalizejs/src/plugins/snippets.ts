import type { Signalize, SignalizePlugin, CustomEventListener } from '..';

declare module '..' {
	interface Signalize {
		redrawSnippet: (content: string) => void
	}

	interface CustomEventListeners {
		'snippets:redraw:start': CustomEventListener
		'snippets:redraw:end': CustomEventListener
	}
}

export default (): SignalizePlugin => {
	return ($: Signalize): void => {
		const { select, dispatch } = $;
		const snippetAttribute = `${$.attributePrefix}snippet`;
		const snippetRedrawedAttribute = `${snippetAttribute}${$.attributeSeparator}redrawed`;
		const snippetActionAttribute = `${snippetAttribute}${$.attributeSeparator}action`;

		const parseHtml = (html: string, type: DOMParserSupportedType = 'text/html'): Document =>
			(new DOMParser()).parseFromString(html, type);

		$.redrawSnippet = (content: string): void => {
			const fragment = parseHtml(content);

			while (true) {
				const element = select(`[${snippetAttribute}]:not([${snippetRedrawedAttribute}])`, fragment);

				if (element === null) {
					break;
				}

				const snippetId = element.getAttribute(snippetAttribute);

				if (snippetId === null) {
					throw new Error(`Signalize/Snippets: Snippet attribute "${snippetAttribute}" cannot be empty.`);
				}

				const targetSnippetToSync = select(`[${snippetAttribute}="${snippetId}"]`);

				if (targetSnippetToSync == null) {
					element.setAttribute(snippetRedrawedAttribute, '');
					continue;
				}

				const snippetAction = element.getAttribute(`[${snippetActionAttribute}]`) ?? 'replace';

				const eventDispatcherData = {
					snippetId,
					snippetAction,
					newSnippet: element,
					oldSnippet: targetSnippetToSync
				};

				dispatch('snippets:redraw:start', eventDispatcherData);

				if (snippetAction === 'replace') {
					targetSnippetToSync.replaceWith(element);
				} else if (snippetAction === 'append-children') {
					while (element.firstChild != null) {
						const child = element.firstChild;
						targetSnippetToSync.appendChild(child);
					}
				} else if (snippetAction === 'prepend-children') {
					while (element.lastChild != null) {
						const child = element.lastChild;
						targetSnippetToSync.insertBefore(child, targetSnippetToSync.firstChild);
					}
				} else if (snippetAction === 'attributes') {
					for (const attribute of element.attributes) {
						targetSnippetToSync.setAttribute(attribute.name, attribute.value);
					}
				}

				dispatch('snippets:redraw:end', eventDispatcherData);

				for (const script of element.querySelectorAll('script')) {
					const scriptElement = document.createElement('script');
					scriptElement.innerHTML = script.innerHTML;
					scriptElement.async = false;

					for (const { name, value } of [...script.attributes]) {
						scriptElement.setAttribute(name, value);
					}

					script.replaceWith(scriptElement);
				}

				element.setAttribute(snippetRedrawedAttribute, '');
			}
		}
	}
}
