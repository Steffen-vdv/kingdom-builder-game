const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
	baseDirectory: __dirname,
	resolvePluginsRelativeTo: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

module.exports = [
	{
		ignores: ['dist', 'node_modules', '**/*.d.ts', 'packages/**/src/**/*.js'],
	},
	js.configs.recommended,
	...compat.config(require('./.eslintrc.cjs')),
];
