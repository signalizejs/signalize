/** Function type to retrieve a dialog element by ID. */
export type getDialog = (id: string) => HTMLDialogElement | null;

/**
 * Options for opening a dialog.
 */
export interface OpenDialogOptions {
  /** Whether to open the dialog modelessly (default: false). */
  modelessly?: boolean;
  /** Whether the dialog is closable (default: true). */
  closable?: boolean;
}

/** Function type to open a dialog. */
export type openDialog = (
  dialogOrId: string | HTMLDialogElement,
  options?: OpenDialogOptions
) => HTMLDialogElement | null;

/** Function type to close a dialog. */
export type closeDialog = (dialogOrId: string | HTMLDialogElement) => HTMLDialogElement | null;

export interface DialogModule {
	openDialog: openDialog;
	getDialog: getDialog;
	closeDialog: closeDialog;
}
