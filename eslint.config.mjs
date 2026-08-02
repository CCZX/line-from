import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
	js.configs.recommended,
	prettier,
	{
		files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts', 'vitest.config.ts'],
		languageOptions: {
			parser: tseslint.parser,
			globals: {
				document: 'readonly',
				window: 'readonly',
				console: 'readonly',
				HTMLElement: 'readonly',
				HTMLDivElement: 'readonly',
				PointerEvent: 'readonly',
				KeyboardEvent: 'readonly',
				MouseEvent: 'readonly',
				requestAnimationFrame: 'readonly',
				cancelAnimationFrame: 'readonly',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			curly: ['error', 'all'],
			'no-redeclare': 'off',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'no-undef': 'off',
			'@typescript-eslint/explicit-member-accessibility': [
				'error',
				{
					accessibility: 'explicit',
					overrides: {
						constructors: 'no-public',
					},
				},
			],
		},
	}
);
