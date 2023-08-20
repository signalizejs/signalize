import type { CustomEventListener } from 'signalizejs';
import { $config, on, dispatch, onDomReady, select } from 'signalizejs';

let dialogAttribute = 'dialog';
let dialogModelessAttribute = `${dialogAttribute}-modeless`;
let dialogCloseButtonAttribute = `${dialogAttribute}-close`;
let dialogOpenButtonAttribute = `${dialogAttribute}-open`;

export const getDialog = (id: string): HTMLDialogElement | null => {
	return select(`[${dialogAttribute}=${id}]`);
};

export const openDialog = (dialogOrId: string | HTMLDialogElement, modelessly = false): HTMLDialogElement | null => {
	const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

	if (dialog != null) {
		modelessly = dialog.hasAttribute(dialogModelessAttribute) ?? modelessly;
		modelessly ? dialog.show() : dialog.showModal();
		window.location.hash = `#${dialog.getAttribute(dialogAttribute) as string}`;

		dispatch('dialog:opened', { dialog });
	}

	return dialog;
}

export const closeDialog = (dialogOrId: string | HTMLDialogElement): HTMLDialogElement | null => {
	const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

	if (dialog != null) {
		dialog.close();

		if (dialog.getAttribute(dialogAttribute) === window.location.hash.substring(1)) {
			window.history.replaceState(null, '', window.location.href.substring(0, window.location.href.indexOf('#')));
		}

		dispatch('dialog:closed', { dialog });
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

onDomReady(() => {
	dialogAttribute = `${$config.attributesPrefix}${dialogAttribute}`;
	dialogModelessAttribute = `${$config.attributesPrefix}${dialogModelessAttribute}`;
	dialogCloseButtonAttribute = `${$config.attributesPrefix}${dialogCloseButtonAttribute}`;
	dialogOpenButtonAttribute = `${$config.attributesPrefix}${dialogOpenButtonAttribute}-open`;

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

	on('locationchange' as keyof CustomEventListener, window, openDialogByUrlHash);

	openDialogByUrlHash();
})
