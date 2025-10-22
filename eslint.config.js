import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import markdown from '@eslint/markdown';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

const require = createRequire(import.meta.url);
const checkTestContentRule = require('./scripts/check-test-content.js');
const noMaxLinesOverrideRule = require('./scripts/no-max-lines-override.js');

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));
const typeCheckedRules =
	tseslint.configs['recommended-type-checked'].rules ?? {};
const nonProjectTypeRuleOverrides = Object.fromEntries(
	Object.keys(typeCheckedRules).map((ruleName) => [ruleName, 'off']),
);

const baseRules = {
	...js.configs.recommended.rules,
	...tseslint.configs.recommended.rules,
	...tseslint.configs['recommended-type-checked'].rules,
	'no-undef': 'off',
	'no-unused-vars': 'off',
	'no-redeclare': 'off',
	'@typescript-eslint/no-unused-vars': [
		'error',
		{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
	],
	'unused-imports/no-unused-imports': 'error',
	'unused-imports/no-unused-vars': [
		'error',
		{
			vars: 'all',
			varsIgnorePattern: '^_',
			args: 'after-used',
			argsIgnorePattern: '^_',
		},
	],
	curly: ['error', 'all'],
	'max-len': [
		'error',
		{
			code: 80,
			ignoreUrls: true,
			ignoreStrings: true,
			ignoreTemplateLiterals: true,
			ignoreRegExpLiterals: true,
			tabWidth: 1,
		},
	],
	'max-lines': [
		'error',
		{
			max: 350,
			skipBlankLines: true,
			skipComments: true,
		},
	],
	'local/no-max-lines-override': 'error',
	'id-length': [
		'error',
		{
			min: 3,
			properties: 'never',
			exceptions: [
				'_',
				'id',
				'to',
				'up',
				'fn',
				'cb',
				'op',
				'db',
				'ui',
				'fc',
				'AP',
				'HP',
				'xp',
				'ok',
				'ai',
				'n',
				'r',
				'it',
				'x',
				'y',
				'z',
				'i',
				'j',
				'a',
				'b',
				'c',
				'd',
				'e',
				'f',
				'fs',
				'l',
				'js',
				's',
				't',
			],
		},
	],
	'@typescript-eslint/no-explicit-any': 'error',
	'@typescript-eslint/consistent-type-imports': [
		'error',
		{ prefer: 'type-imports', fixStyle: 'separate-type-imports' },
	],
	'@typescript-eslint/ban-ts-comment': [
		'error',
		{ 'ts-ignore': true, 'ts-nocheck': true },
	],
	'import/no-duplicates': 'error',
};

export default [
	{
		ignores: [
			'dist',
			'**/dist/**',
			'node_modules',
			'coverage',
			'**/coverage/**',
			'**/*.d.ts',
			'packages/**/src/**/*.js',
		],
	},
	{
		files: ['**/*.md'],
		language: 'markdown/commonmark',
		plugins: {
			markdown,
		},
	},
	{
		files: ['**/*.{ts,tsx,js,cjs,mjs}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: ['./tsconfig.eslint.json'],
				tsconfigRootDir,
				ecmaVersion: 'latest',
				sourceType: 'module',
				extraFileExtensions: ['.md'],
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021,
			},
		},
		plugins: {
			'@typescript-eslint': tseslint,
			import: importPlugin,
			'unused-imports': unusedImports,
			local: {
				rules: {
					'check-test-content': checkTestContentRule,
					'no-max-lines-override': noMaxLinesOverrideRule,
				},
			},
		},
		settings: {
			'import/parsers': {
				'@typescript-eslint/parser': ['.ts', '.tsx'],
			},
			'import/resolver': {
				typescript: {
					project: ['./tsconfig.eslint.json'],
				},
				node: {
					extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],
				},
			},
		},
		rules: baseRules,
	},
	{
		files: ['**/*.test.ts', '**/*.test.tsx'],
		rules: {
			'max-lines': 'off',
		},
	},
	{
		files: [
			'packages/**/tests/**/*.ts',
			'packages/**/tests/**/*.tsx',
			'tests/**/*.ts',
			'tests/**/*.tsx',
		],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
		},
	},
	{
		files: [
			'packages/engine/tests/**/*.ts',
			'packages/engine/tests/**/*.tsx',
			'tests/**/*.ts',
			'tests/**/*.tsx',
		],
		rules: {
			'local/check-test-content': 'error',
		},
	},
	{
		files: ['packages/web/tests/**/*.ts', 'packages/web/tests/**/*.tsx'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '@kingdom-builder/contents',
							message:
								'Web tests must rely on selectors or synthetic ' +
								'fixtures instead of importing contents directly.',
						},
					],
				},
			],
		},
	},
	{
		files: ['scripts/**/*.js', 'scripts/**/*.cjs', 'scripts/**/*.mjs'],
		languageOptions: {
			parserOptions: {
				project: null,
			},
		},
		rules: {
			...nonProjectTypeRuleOverrides,
			'@typescript-eslint/consistent-type-imports': 'off',
			'@typescript-eslint/no-var-requires': 'off',
			'unused-imports/no-unused-imports': 'off',
			'unused-imports/no-unused-vars': 'off',
		},
	},
	{
		files: [
			'eslint.config.js',
			'packages/**/*.config.cjs',
			'packages/**/*.config.mjs',
			'packages/**/*.config.js',
			'packages/**/.eslintrc.cjs',
		],
		languageOptions: {
			parserOptions: {
				project: null,
			},
		},
		rules: {
			...nonProjectTypeRuleOverrides,
			'@typescript-eslint/consistent-type-imports': 'off',
			'unused-imports/no-unused-imports': 'off',
			'unused-imports/no-unused-vars': 'off',
		},
	},
	{
		files: [
			'packages/engine/tests/stat-sources.test.ts',
			'packages/engine/tests/resolveAttack.test.ts',
			'packages/engine/src/stat_sources.ts',
			'packages/engine/src/effects/attack.ts',
			'packages/engine/src/index.ts',
			'packages/contents/src/actions.ts',
			'packages/contents/src/config/builders.ts',
			'packages/web/src/translation/log.ts',
			'packages/web/src/translation/effects/formatters/attack.ts',
			'packages/web/src/utils/stats.ts',
			'packages/web/src/state/GameContext.tsx',
			'packages/web/src/components/actions/ActionsPanel.tsx',
			'packages/engine/src/ai/index.ts',
			'packages/engine/src/context.ts',
			'packages/engine/src/services/index.ts',
			'packages/web/src/translation/effects/helpers.ts',
			'packages/web/src/translation/render.tsx',
			'packages/web/src/utils/getRequirementIcons.ts',
			'packages/web/src/utils/useAutoAnimate.ts',
			'packages/engine/src/state/index.ts',
			'packages/engine/src/triggers.ts',
			'packages/engine/src/utils.ts',
			'packages/web/src/components/HoverCard.tsx',
			'packages/web/src/components/LogPanel.tsx',
			'packages/web/src/components/TimerCircle.tsx',
			'packages/web/src/components/actions/ActionCard.tsx',
			'packages/web/src/components/common/TimeControl.tsx',
			'packages/web/src/components/phases/PhasePanel.tsx',
			'packages/web/src/components/player/BuildingDisplay.tsx',
			'packages/web/src/components/player/LandDisplay.tsx',
			'packages/web/src/components/player/PassiveDisplay.tsx',
			'packages/web/src/components/player/PopulationInfo.tsx',
			'packages/web/src/translation/content/action.ts',
			'packages/web/src/translation/content/actionLogHooks.ts',
			'packages/web/src/translation/content/decorators.ts',
			'packages/web/src/translation/content/development.ts',
			'packages/web/src/translation/content/partition.ts',
			'packages/web/src/translation/content/phased.ts',
			'packages/web/src/translation/effects/factory.ts',
			'packages/web/src/translation/effects/formatters/action.ts',
			'packages/web/src/translation/effects/formatters/building.ts',
			'packages/web/src/translation/effects/formatters/passive.ts',
		],
		rules: {
			'max-lines': 'off',
			'local/no-max-lines-override': 'off',
		},
	},
	{
		files: [
			'packages/web/src/utils/stats.ts',
			'packages/web/src/utils/stats/summary.ts',
		],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-redundant-type-constituents': 'off',
		},
	},
	{
		files: ['packages/contents/**/*.{ts,tsx,js,cjs,mjs}'],
		rules: {
			'max-len': 'off',
			'max-lines': 'off',
		},
	},
	{
		files: [
			'packages/contents/src/config/builders/domainBuilders.ts',
			'packages/contents/src/config/builders/evaluators.ts',
			'packages/contents/src/config/builders/startConfig.ts',
			'packages/contents/src/config/builders/tierBuilders.ts',
			'packages/web/tests/generic-actions-effect-group.test.tsx',
			'packages/web/tests/helpers/actionsPanel.ts',
		],
		rules: {
			'local/no-max-lines-override': 'off',
		},
	},
];
