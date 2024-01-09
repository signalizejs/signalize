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
		const { dispatch, attributePrefix, attributeSeparator, on, root } = $;
		const dialogAttribute = `${attributePrefix}dialog`;
		const dialogModelessAttribute = `${dialogAttribute}${attributeSeparator}modeless`;
		const dialogCloseButtonAttribute = `${dialogAttribute}${attributeSeparator}close`;
		const dialogOpenButtonAttribute = `${dialogAttribute}${attributeSeparator}open`;

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
		const openDialog = (dialogOrId, modelessly = false) => {
			const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

			if (dialog != null) {
				modelessly = dialog.hasAttribute(dialogModelessAttribute) ?? modelessly;
				modelessly ? dialog.show() : dialog.showModal();
				window.location.hash = `#${dialog.getAttribute(dialogAttribute)}`;

				dispatch('dialog:opened', dialog);
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

				dispatch('dialog:closed', dialog);
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
			on('click', `[${dialogCloseButtonAttribute}]`, ({ target }) => {
				const dialog = target.getAttribute[`${dialogCloseButtonAttribute}`] ?? target.closest(`[${dialogAttribute}]`);

				if (dialog !== null) {
					closeDialog(dialog);
				}
			});

			on('click', `[${dialogOpenButtonAttribute}]`, ({ target }) => {
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
