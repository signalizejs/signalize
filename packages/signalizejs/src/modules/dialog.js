/** @type {import('../../types/Signalize').Module<import('../../types/modules/dialog').DialogModule>} */
export default async ({ resolve, root, params }) => {
	const { attributePrefix, attributeSeparator } = params;

	const { dispatch, on, off } = await resolve('event', 'dom/ready');

	const dialogAttribute = `${attributePrefix}dialog`;
	const dialogModelessAttribute = `${dialogAttribute}${attributeSeparator}modeless`;
	const dialogClosableAttribute = `${dialogAttribute}${attributeSeparator}closable`;
	const dialogCloseButtonAttribute = `${dialogAttribute}${attributeSeparator}close`;
	const dialogOpenButtonAttribute = `${dialogAttribute}${attributeSeparator}open`;

	/**
	 * @param {MouseEvent} event
	 */
	const closeOnBackDropClickListener = (event) => {
		const { target, clientX, clientY } = event;
		const rect = target?.getBoundingClientRect();

		if (target && (rect.left > clientX ||
			rect.right < clientX ||
			rect.top > clientY ||
			rect.bottom < clientY) &&
			target.tagName.toLowerCase() === 'dialog'
		) {
			closeDialog(target);
			off('click', target, closeOnBackDropClickListener);
		}
	};

	/** @type {import('../../types/modules/dialog').getDialog} */
	const getDialog = (id) => root.querySelector(`[${dialogAttribute}=${id}]`);

	/** @type {import('../../types/modules/dialog').openDialog} */
	const openDialog = (dialogOrId, options = {}) => {
		const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

		if (dialog === null) {
			throw new Error(`Dialog "${dialogOrId}" not found.`);
		}

		// eslint-disable-next-line prefer-const
		let { modelessly = false, closable = true } = options;

		if (dialog.hasAttribute(dialogModelessAttribute)) {
			modelessly = dialog.getAttribute(dialogModelessAttribute) === 'true';
		}

		dialog.setAttribute(dialogClosableAttribute, String(closable));

		modelessly ? dialog.show() : dialog.showModal();
		const dialogId = dialog.getAttribute(dialogAttribute);
		if (dialogId) {
			window.location.hash = `#${dialogId}`;
		}

		dispatch('dialog:opened', dialog);


		if (closable && !modelessly && dialog.getAttribute(dialogClosableAttribute) !== 'false') {
			on('click', dialog, closeOnBackDropClickListener);
		}

		return dialog;
	};

	/** @type {import('../../types/modules/dialog').closeDialog} */
	const closeDialog = (dialogOrId) => {
		const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

		if (dialog != null) {
			dialog.close();

			if (dialog.getAttribute(dialogAttribute) === window.location.hash.substring(1)) {
				window.history.replaceState(
					null, '', window.location.href.substring(0, window.location.href.indexOf('#'))
				);
			}

			off('click', dialog, closeOnBackDropClickListener);
			dispatch('dialog:closed', dialog);
			document.body.style = 'overflow:initial!important';
		}

		return dialog;
	};


	const openDialogByUrlHash = () => {
		const id = window.location.hash.substring(1);

		if (id.length === 0 || !/^#[-\w.:]+$/.test(id)) {
			return;
		}

		openDialog(id);
	};


	on('click', `[${dialogCloseButtonAttribute}]`, (/** @type {MouseEvent} */ event) => {
		event.preventDefault();
		const { target } = event;
		const dialogId = target.getAttribute(dialogCloseButtonAttribute);
		const dialog = dialogId.trim().length === 0 ? target.closest('dialog') : dialogId;

		if (dialog !== null) {
			closeDialog(dialog);
		}
	});

	on('click', `[${dialogOpenButtonAttribute}]`, (/** @type {MouseEvent} */ event) => {
		event.preventDefault();
		const { target } = event;
		const dialog = getDialog(target.getAttribute(dialogOpenButtonAttribute));

		if (dialog != null) {
			openDialog(dialog);
		}
	});

	on('keydown', (event) => {
		if (event.key.toLowerCase() === 'escape'
			&& document.querySelector(`dialog[open][${dialogClosableAttribute}="false"]`)
		) {
			event.preventDefault();
		}
	});

	on('dom:ready', () => {
		on('locationchange', window, openDialogByUrlHash);
		openDialogByUrlHash();
	});

	return {
		closeDialog,
		getDialog,
		openDialog,
	};

};
