const path = require('node:path');
const tailwindcss = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

module.exports = {
	plugins: [
		tailwindcss({ config: path.resolve(__dirname, 'tailwind.config.cjs') }),
		autoprefixer(),
	],
};
