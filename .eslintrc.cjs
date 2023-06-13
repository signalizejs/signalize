module.exports = {
	env: {
		browser: true,
		es2021: true
	},
	ignorePatterns: [
		'**/dist'
	],
	extends: [
		'standard-with-typescript'
	],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		project: './tsconfig.json'
	},
	rules: {
		'no-tabs': ['error', { allowIndentationTabs: true }],
		'@typescript-eslint/indent': ['error', 'tab'],
		indent: ['error', 'tab'],
		'no-extra-semi': 'error',
		semi: 'off',
		'@typescript-eslint/semi': ['off'],
		'@typescript-eslint/no-extra-semi': ['error']
	}
}
