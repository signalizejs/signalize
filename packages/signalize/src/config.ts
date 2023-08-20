export interface Config extends Record<string, any> {
	root: HTMLElement | Document | DocumentFragment
	exposeSignalize: boolean
	typeBasedSignals: boolean
	attributesPrefix: string
	directivesSeparator: string
}

export const $config: Config = {
	root: document,
	exposeSignalize: true,
	typeBasedSignals: true,
	attributesPrefix: '',
	directivesSeparator: ':'
}
