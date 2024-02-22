/* declare module '..' {

	interface Signalize {
		dialog: (dialogOrId: string | HTMLDialogElement) => HTMLDialogElement | null
		closeDialog: (dialogOrId: string | HTMLDialogElement) => HTMLDialogElement | null
		openDialog: (dialogOrId: string | HTMLDialogElement, modelessly?: boolean) => HTMLDialogElement | null
	}

	interface CustomEventListeners {
		'dialog:open': CustomEventListener
		'dialog:close': CustomEventListener
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
		const { dispatch, attributePrefix, attributeSeparator, on, off, root } = $;
		const dialogAttribute = `${attributePrefix}dialog`;
		const dialogModelessAttribute = `${dialogAttribute}${attributeSeparator}modeless`;
		const dialogClosableAttribute = `${dialogAttribute}${attributeSeparator}closable`;
		const dialogCloseButtonAttribute = `${dialogAttribute}${attributeSeparator}close`;
		const dialogOpenButtonAttribute = `${dialogAttribute}${attributeSeparator}open`;

		const closeOnBackDropClickListener = (event) => {
			let rect = event.target.getBoundingClientRect();

			if ((rect.left > event.clientX ||
				rect.right < event.clientX ||
				rect.top > event.clientY ||
				rect.bottom < event.clientY) &&
				event.target.tagName.toLowerCase() === 'dialog'
			) {
				closeDialog(event.target);
				off('click', event.target, closeOnBackDropClickListener);
			}
		};

		/**
		 * Retrieves a dialog element with the specified ID.
		 *
		 * @function
		 * @param {string} id - The ID of the dialog element to retrieve.
		 * @returns {HTMLDialogElement | null} The dialog element with the specified ID, or null if not found.
		 */
		const getDialog = (id) => root.querySelector(`[${dialogAttribute}=${id}]`);

		/**
		 * Opens a dialog identified by either its ID or the dialog element itself.
		 *
		 * @function
		 * @param {string | HTMLDialogElement} dialogOrId - The ID or HTMLDialogElement of the dialog to open.
		 * @param {boolean} [modelessly=false] - Indicates whether to open the dialog modelessly (optional, default is false).
		 * @returns {HTMLDialogElement | null} The opened dialog element or null if not found or not opened.
		 */
		const openDialog = (dialogOrId, options = {}) => {
			const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;
			let { modelessly = false, closable = true } = options;

			if (dialog != null) {
				modelessly = dialog.hasAttribute(dialogModelessAttribute) ?? modelessly;
				modelessly ? dialog.show() : dialog.showModal();
				const dialogId = dialog.getAttribute(dialogAttribute);
				if (dialogId) {
					window.location.hash = `#${dialogId}`;
				}

				dispatch('dialog:opened', dialog);
			}

			if (closable && !modelessly && dialog.getAttribute(dialogClosableAttribute) != false) {
				on('click', dialog, closeOnBackDropClickListener);
			}

			return dialog;
		};

		/**
		 * Closes a dialog identified by either its ID or the dialog element itself.
		 *
		 * @function
		 * @param {string | HTMLDialogElement} dialogOrId - The ID or HTMLDialogElement of the dialog to close.
		 * @returns {HTMLDialogElement | null} The closed dialog element or null if not found or not closed.
		 */
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

		on('dom:ready', () => {
			on('click', `[${dialogCloseButtonAttribute}]`, (event) => {
				event.preventDefault();
				const { target } = event;
				const dialogId = target.getAttribute(dialogCloseButtonAttribute);
				let dialog = dialogId.trim().length === 0 ? target.closest('dialog') : dialogId;

				if (dialog !== null) {
					closeDialog(dialog);
				}
			});

			on('click', `[${dialogOpenButtonAttribute}]`, (event) => {
				event.preventDefault();
				const { target } = event;
				const dialog = getDialog(target.getAttribute(dialogOpenButtonAttribute));

				if (dialog != null) {
					openDialog(dialog);
				}
			});

			on('locationchange', window, openDialogByUrlHash);

			openDialogByUrlHash();
		});

		$.openDialog = openDialog;
		$.closeDialog = closeDialog;
		$.dialog = getDialog;
	};
};
