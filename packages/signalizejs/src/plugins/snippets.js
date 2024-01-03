/* declare module '..' {
	interface Signalize {
		redrawSnippet: (content: string) => void
	}

	interface CustomEventListeners {
		'snippets:redraw:start': CustomEventListener
		'snippets:redraw:end': CustomEventListener
	}
} */

/**
 * @returns {import('../Signalize').SignalizePlugin}
 */
export default () => {
	/**
	 * @param {import('../Signalize').Signalize} $
	 * @returns {void}
	 */
	return ($) => {
		const { select, dispatch } = $;
		const snippetAttribute = `${$.attributePrefix}snippet`;
		const snippetStateAttribute = `${snippetAttribute}${$.attributeSeparator}state`;
		const snippetActionAttribute = `${snippetAttribute}${$.attributeSeparator}action`;

		/**
		 * @param {string} html
		 * @param {DOMParserSupportedType} type
		 * @returns {Document}
		 */
		const parseHtml = (html, type = 'text/html') =>
			(new DOMParser()).parseFromString(html, type);

		/**
		 * @param {string} content
		 * @returns {void}
		 */
		$.redrawSnippet = (content) => {
			const fragment = parseHtml(content);
			const snippets = [...fragment.querySelectorAll(`[${snippetAttribute}]`)];

			while (snippets.length > 0) {
				const newSnippet = snippets.shift();

				if (newSnippet?.parentNode?.closest(`[${snippetAttribute}]`) !== null) {
					continue;
				}

				const snippetId = newSnippet.getAttribute(snippetAttribute);
				let existingSnippet = select(`[${snippetAttribute}="${snippetId}"]`);

				if (existingSnippet === null) {
					continue;
				}

				const snippetAction = newSnippet.getAttribute(`${snippetActionAttribute}`) ?? 'replace';
				const eventDispatcherData = {
					snippetId,
					snippetAction,
					newSnippet,
					existingSnippet
				};

				existingSnippet.setAttribute(snippetStateAttribute, 'redrawing');
				dispatch('snippets:redraw:start', eventDispatcherData);

				if (snippetAction === 'replace') {
					newSnippet.setAttribute(snippetStateAttribute, 'redrawing');
					existingSnippet.replaceWith(newSnippet);
					existingSnippet = newSnippet;
				} else if (snippetAction === 'append-children') {
					const childrenFragment = new DocumentFragment();
					while (newSnippet.lastChild != null) {
						childrenFragment.append(newSnippet.lastChild);
					}

					existingSnippet.append(childrenFragment);
				} else if (snippetAction === 'prepend-children') {
					const childrenFragment = new DocumentFragment();
					while (newSnippet.lastChild != null) {
						childrenFragment.append(newSnippet.lastChild);
					}

					existingSnippet.prepend(childrenFragment);
				} else if (snippetAction === 'attributes') {
					for (const attribute of newSnippet.attributes) {
						existingSnippet.setAttribute(attribute.name, attribute.value);
					}
				}

				for (const script of existingSnippet.querySelectorAll('script')) {
					const scriptElement = document.createElement('script');
					scriptElement.innerHTML = script.innerHTML;
					scriptElement.async = false;

					for (const { name, value } of [...script.attributes]) {
						scriptElement.setAttribute(name, value);
					}

					script.replaceWith(scriptElement);
				}

				dispatch('snippets:redraw:end', eventDispatcherData);

				existingSnippet.setAttribute(snippetStateAttribute, 'redrawed');
			}
		};
	};
};
