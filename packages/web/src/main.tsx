import './styles/index.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PRIMARY_ICON_ID, RESOURCES } from '@kingdom-builder/contents';
import { resolvePrimaryIcon } from './startup/resolvePrimaryIcon';

const createFaviconSvg = (emoji: string): string =>
	[
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
		'<text y=".9em" font-size="90">',
		emoji,
		'</text>',
		'</svg>',
	].join('');

const ensureFaviconLink = (): HTMLLinkElement => {
	const existing = document.querySelector<HTMLLinkElement>('#favicon');
	if (existing) {
		return existing;
	}
	const link = document.createElement('link');
	link.id = 'favicon';
	return link;
};

const icon = resolvePrimaryIcon(RESOURCES, PRIMARY_ICON_ID);
if (icon) {
	const svg = createFaviconSvg(icon);
	const link = ensureFaviconLink();
	link.rel = 'icon';
	link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
	if (!link.parentElement) {
		document.head.appendChild(link);
	}
} else {
	console.warn('Unable to resolve favicon icon from content.');
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
