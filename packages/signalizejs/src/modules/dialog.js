/**
 * Retrieves a dialog element with the specified ID.
 *
 * @callback getDialog
 * @param {string} id - The ID of the dialog element to retrieve.
 * @returns {HTMLDialogElement|null} The dialog element with the specified ID, or null if not found.
 */

/**
 * @typedef OpenDialogOptions
 * @property {boolean} [modelessly=false]
 * @property {boolean} [closable=true]
 */

/**
 * Opens a dialog identified by either its ID or the dialog element itself.
 *
 * @callback openDialog
 * @param {string|HTMLDialogElement} dialogOrId - The ID or HTMLDialogElement of the dialog to open.
 * @param {OpenDialogOptions} [options] - Indicates whether to open the dialog modelessly (optional, default is false).
 * @returns {HTMLDialogElement|null} The opened dialog element or null if not found or not opened.
 */

/**
 * Closes a dialog identified by either its ID or the dialog element itself.
 *
 * @callback closeDialog
 * @param {string | HTMLDialogElement} dialogOrId - The ID or HTMLDialogElement of the dialog to close.
 * @returns {HTMLDialogElement | null} The closed dialog element or null if not found or not closed.
 */

/** @type {import('../Signalize').SignalizeModule} */
export default async ({ resolve, root, params }) => {
	const { attributePrefix, attributeSeparator } = params;
	const { dispatch, on, off } = await resolve('event', 'dom-ready');

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
		let rect = target?.getBoundingClientRect();

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

	/** @type {getDialog} */
	const getDialog = (id) => root.querySelector(`[${dialogAttribute}=${id}]`);

	/** @type {openDialog} */
	const openDialog = (dialogOrId, options = {}) => {
		const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

		if (dialog === null) {
			throw new Error(`Dialog "${dialogOrId}" not found.`);
		}

		let { modelessly = false, closable = true } = options;

		if (dialog.hasAttribute(dialogModelessAttribute)) {
			modelessly = dialog.getAttribute(dialogModelessAttribute) === 'true';
		}
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

	/** @type {closeDialog} */
	const closeDialog = (dialogOrId) => {
		const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

		if (dialog != null) {
			dialog.close();

			if (dialog.getAttribute(dialogAttribute) === window.location.hash.substring(1)) {
				window.history.replaceState(null, '', window.location.href.substring(0, window.location.href.indexOf('#')));
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
		let dialog = dialogId.trim().length === 0 ? target.closest('dialog') : dialogId;

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

	on('dom:ready', () => {
		on('locationchange', window, openDialogByUrlHash);
		openDialogByUrlHash();
	});

	return {
		openDialog,
		closeDialog,
		getDialog
	};

};
