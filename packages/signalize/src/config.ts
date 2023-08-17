interface Config extends Record<string, any> {
	attributesPrefix: string
	directivesSeparator: string
}

export const $config: Config = {
	attributesPrefix: '',
	directivesSeparator: ':'
}
