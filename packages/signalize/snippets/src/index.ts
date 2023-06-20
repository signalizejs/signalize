import { createHtml, dispatch } from 'signalizejs';

const snippetAttribute = 'data-snippet';
const snippetRedrawedAttribute = 'data-snippet-redrawed';
const snippetActionAttribute = 'data-snippet-action';

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

		const targetSnippetToSync = document.querySelector(`[${snippetAttribute}="${snippetId}"]`);

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

		element.setAttribute(snippetRedrawedAttribute, '');
	}
}
