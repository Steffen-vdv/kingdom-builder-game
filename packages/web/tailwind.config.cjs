const path = require('node:path');

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: {
		files: [
			path.resolve(__dirname, 'index.html'),
			path.resolve(__dirname, 'src/**/*.{js,ts,jsx,tsx}'),
		],
	},
	theme: {
		extend: {
			spacing: {
				1: '0.25rem',
			},
		},
	},
	plugins: [],
};
