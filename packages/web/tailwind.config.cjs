/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: {
		relative: true,
		files: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	},
	theme: { extend: {} },
	plugins: [],
};
