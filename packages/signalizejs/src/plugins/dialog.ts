import type { Signalize, SignalizePlugin, CustomEventListener } from '..';

declare module '..' {

	interface Signalize {
		dialog: (dialogOrId: string | HTMLDialogElement) => HTMLDialogElement | null
		closeDialog: (dialogOrId: string | HTMLDialogElement) => HTMLDialogElement | null
		openDialog: (dialogOrId: string | HTMLDialogElement, modelessly?: boolean) => HTMLDialogElement | null
	}

	interface CustomEventListeners {
		'dialog:open': CustomEventListener
		'dialog:close': CustomEventListener
	}
}

export default (): SignalizePlugin => {
	return ($: Signalize): void => {
		const { dispatch, attributePrefix, attributeSeparator, select, on } = $
		const dialogAttribute = `${attributePrefix}dialog`;
		const dialogModelessAttribute = `${dialogAttribute}${attributeSeparator}modeless`;
		const dialogCloseButtonAttribute = `${dialogAttribute}${attributeSeparator}close`;
		const dialogOpenButtonAttribute = `${dialogAttribute}${attributeSeparator}open`;

		const getDialog = (id: string): HTMLDialogElement | null => select<HTMLDialogElement>(`[${dialogAttribute}=${id}]`);

		const openDialog = (dialogOrId: string | HTMLDialogElement, modelessly = false): HTMLDialogElement | null => {
			const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

			if (dialog != null) {
				modelessly = dialog.hasAttribute(dialogModelessAttribute) ?? modelessly;
				modelessly ? dialog.show() : dialog.showModal();
				window.location.hash = `#${dialog.getAttribute(dialogAttribute) as string}`;

				dispatch('dialog:opened', dialog);
			}

			return dialog;
		}

		const closeDialog = (dialogOrId: string | HTMLDialogElement): HTMLDialogElement | null => {
			const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

			if (dialog != null) {
				dialog.close();

				if (dialog.getAttribute(dialogAttribute) === window.location.hash.substring(1)) {
					window.history.replaceState(null, '', window.location.href.substring(0, window.location.href.indexOf('#')));
				}

				dispatch('dialog:closed', dialog);
			}

			return dialog;
		}

		const openDialogByUrlHash = (): void => {
			const id = window.location.hash.substring(1);

			if (id.length === 0 || !/^#[-\w.:]+$/.test(id)) {
				return;
			}

			openDialog(id);
		}

		on('dom:ready', () => {
			console.log(dialogCloseButtonAttribute);
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
	}
}
