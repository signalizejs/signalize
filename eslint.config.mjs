import globals from 'globals';
import pluginJs from '@eslint/js';
import compat from 'eslint-plugin-compat'

export default [
	{ languageOptions: { globals: globals.browser } },
	pluginJs.configs.recommended,
	compat.configs['flat/recommended'],
	{
		rules: {
			'quotes': ['error', 'single'],
			'prefer-const': ['error'],
			'indent': ['error', 'tab'],
			'key-spacing': [
				'error',
				{
					'beforeColon': false,
					'afterColon': true,
					'mode': 'strict',
				},
			]
		}
	}

];
