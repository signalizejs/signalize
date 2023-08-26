import Signalize, { createHtml, dispatch, select } from 'signalizejs';

export default (signalize: Signalize) => {

}

const snippetAttribute = 'snippet';
const snippetRedrawedAttribute = 'snippet-redrawed';
const snippetActionAttribute = 'snippet-action';

export const redraw = (content: string | DocumentFragment | HTMLElement | HTMLElement): void => {
	const fragment = createHtml(content);

	while (true) {
		const element = fragment.querySelector(`[${snippetAttribute}]:not([${snippetRedrawedAttribute}])`);

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

Signalize.redraw = redraw;
