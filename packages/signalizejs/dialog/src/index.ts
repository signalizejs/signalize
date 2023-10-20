import type { Signalize, CustomEventListener } from 'signalizejs';

declare module 'signalizejs' {

	interface Signalize {
		dialog: (dialogOrId: string | HTMLDialogElement) => HTMLDialogElement | null
		closeDialog:  (dialogOrId: string | HTMLDialogElement) => HTMLDialogElement | null
		openDialog:  (dialogOrId: string | HTMLDialogElement, modelessly?: boolean) => HTMLDialogElement | null
	}

	interface CustomEventListeners {
		'dialog:open': CustomEventListener
		'dialog:close': CustomEventListener
	}
}

export default (signalize: Signalize): void => {
	const { dispatch, select, on, config } = signalize;
	let dialogAttribute = 'dialog';
	let dialogModelessAttribute = `${dialogAttribute}-modeless`;
	let dialogCloseButtonAttribute = `${dialogAttribute}-close`;
	let dialogOpenButtonAttribute = `${dialogAttribute}-open`;

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
		dialogAttribute = `${config.attributesPrefix}${dialogAttribute}`;
		dialogModelessAttribute = `${config.attributesPrefix}${dialogModelessAttribute}`;
		dialogCloseButtonAttribute = `${config.attributesPrefix}${dialogCloseButtonAttribute}`;
		dialogOpenButtonAttribute = `${config.attributesPrefix}${dialogOpenButtonAttribute}-open`;

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

	signalize.openDialog = openDialog;
	signalize.closeDialog = closeDialog;
	signalize.dialog = getDialog;
}
