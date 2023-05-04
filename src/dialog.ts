import { onDomReady, on, dispatch } from ".";

const dialogAttribute = 'data-dialog';
const dialogModelessAttribute = `${dialogAttribute}-modeless`;
const dialogCloseButtonAttribute = `${dialogAttribute}-close`;
const dialogOpenButtonAttribute = `${dialogAttribute}-open`;

export const getDialog = (id: string): HTMLDialogElement|null => {
	return document.querySelector(`[${dialogAttribute}=${id}]`);
};

export const openDialog = (dialogOrId: string|HTMLDialogElement, modelessly = false): HTMLDialogElement|null => {
	const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

	if (dialog) {
		modelessly = dialog.hasAttribute(dialogModelessAttribute) ?? modelessly;
		modelessly ? dialog.show() : dialog.showModal();
		window.location.hash = `#${dialog.getAttribute(dialogAttribute)}`;

		dispatch('dialog:opened', { dialog });
	}

	return dialog;
}

export const closeDialog = (dialogOrId: string|HTMLDialogElement): HTMLDialogElement|null => {
	const dialog = typeof dialogOrId === 'string' ? getDialog(dialogOrId) : dialogOrId;

	if (dialog) {
		dialog.close();
		console.log(window.location.hash.substring(1), dialog.getAttribute(dialogAttribute));

		if (dialog.getAttribute(dialogAttribute) === window.location.hash.substring(1)) {
			window.history.replaceState(null, '', window.location.href.substring(0, window.location.href.indexOf('#')));
		}

		dispatch('dialog:closed', { dialog });
	}

	return dialog;
}

const openDialogByUrlHash = () => {
	const id = window.location.hash.substring(1);

	if (id.length === 0 || !/^#[-\w.:]+$/.test(id)) {
		return;
	}

	openDialog(id);
}

onDomReady(() => {
	on('click', `[${dialogCloseButtonAttribute}]`, ({ target }) => {
		const dialog = target.getAttribute[`${dialogCloseButtonAttribute}`] ?? target.closest(`[${dialogAttribute}]`);

		if (dialog) {
			closeDialog(dialog);
		}
	});

	on('click', `[${dialogOpenButtonAttribute}]`, ({ target }) => {
		const dialog = getDialog(target.getAttribute(dialogOpenButtonAttribute));

		if (dialog) {
			openDialog(dialog);
		}
	});

	openDialogByUrlHash();

	window.addEventListener('locationchange', openDialogByUrlHash);
});
