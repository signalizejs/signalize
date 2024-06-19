/** @type {import('../../types/Signalize').Module<import('../../types/modules/snippets').SnippetsModule>} */
export default async ({ params, resolve, root }) => {

	const { dispatch } = await resolve('event');
	const snippetAttribute = `${params.attributePrefix}snippet`;
	const snippetAttributeDirective = `${snippetAttribute}${params.attributeSeparator}`;
	const snippetStateAttribute = `${snippetAttributeDirective}state`;
	const snippetActionAttribute = `${snippetAttributeDirective}action`;

	/**
	 * @param {string} html
	 * @param {DOMParserSupportedType} type
	 * @returns {Document}
	 */
	const parseHtml = (html, type = 'text/html') => (new DOMParser()).parseFromString(html, type);

	/** @type {import('../../types/modules/snippets').redrawSnippet} */
	const redrawSnippet = async (content, options = {}) => {
		const fragment = parseHtml(content);
		let snippets = [...fragment.querySelectorAll(`[${snippetAttribute}]`)];
		/** @type {Promise<void>[]} */
		const redrawPromisses = [];
		/** @type {Promise<void>[]} */
		const stylePromises = [];

		const redrawSnippet = async (newSnippet) => {
			const snippetId = newSnippet.getAttribute(snippetAttribute);
			let existingSnippet = root.querySelector(`[${snippetAttribute}="${snippetId}"]`);

			const snippetConfig = {
				snippetId,
				snippetActions: newSnippet.getAttribute(`${snippetActionAttribute}`)?.split(' ') ?? ['replace'],
				newSnippet,
				existingSnippet,
				...snippetId  ? (options?.snippets?.[snippetId] ?? {}) : {}
			};

			const { snippetActions } = snippetConfig;

			existingSnippet.setAttribute(snippetStateAttribute, 'redrawing');
			dispatch('snippets:redraw:start', snippetConfig);

			while(snippetActions.length) {
				const snippetAction = snippetActions.shift();

				if (snippetAction === 'replace') {
					newSnippet.setAttribute(snippetStateAttribute, 'redrawing');
					existingSnippet.replaceWith(newSnippet);
					existingSnippet = newSnippet;
				} else if (snippetAction === 'replace-children') {
					existingSnippet.setAttribute(snippetStateAttribute, 'redrawing');
					existingSnippet.innerHTML = newSnippet.innerHTML;

				} else if (snippetAction === 'append-children') {
					const childrenFragment = new DocumentFragment();
					while (newSnippet.firstChild != null) {
						childrenFragment.append(newSnippet.firstChild);
					}

					existingSnippet.append(childrenFragment);
				} else if (snippetAction === 'prepend-children') {
					const childrenFragment = new DocumentFragment();
					while (newSnippet.lastChild != null) {
						childrenFragment.append(newSnippet.lastChild);
					}

					existingSnippet.prepend(childrenFragment);
				} else if (snippetAction === 'sync-attributes') {
					for (const attribute of newSnippet.attributes) {
						existingSnippet.setAttribute(attribute.name, attribute.value);
					}
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

			await Promise.all(redrawPromisses);

			dispatch('snippets:redraw:end', snippetConfig);

			existingSnippet.setAttribute(snippetStateAttribute, 'redrawed');
		}

		const redraw = async () => {
			snippets = snippets.filter((newSnippet) => {
				const snippetId = newSnippet.getAttribute(snippetAttribute);
				const existingSnippet = root.querySelector(`[${snippetAttribute}="${snippetId}"]`);

				if (existingSnippet === null) {
					return false;
				}

				for (const styleLink of newSnippet.querySelectorAll('link[rel="stylesheet"]')) {
					stylePromises.push(new Promise((resolve, reject) => {
						/** @type {HTMLLinkElement} */
						const stylePreload = styleLink.cloneNode();
						stylePreload.setAttribute('rel', 'preload');
						stylePreload.setAttribute('as', 'style');
						stylePreload.onload = () => {
							stylePreload.remove();
							resolve(true);
						}
						stylePreload.onerror = () => {
							stylePreload.remove();
							reject(false);
						}
						document.body.appendChild(stylePreload);
					}));
				}

				return true;
			})

			await Promise.all(stylePromises);

			while (snippets.length > 0) {
				const newSnippet = snippets.shift();

				if (newSnippet?.parentNode?.closest(`[${snippetAttribute}]`) !== null) {
					continue;
				}

				redrawPromisses.push(redrawSnippet(newSnippet));
			}
		};

		if (document?.startViewTransition === undefined || options?.transitionsEnabled === false) {
			await redraw();
		} else {
			const transition = document.startViewTransition(redraw);
			dispatch('snippets:redraw:transition:start', transition);
			await transition.finished;
			dispatch('snippets:redraw:transition:end');
		}

	};

	return { redrawSnippet };
};
