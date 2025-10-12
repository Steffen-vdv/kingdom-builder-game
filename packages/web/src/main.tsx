import './styles/index.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DEFAULT_REGISTRIES } from './contexts/defaultRegistryMetadata';
import { resolvePrimaryIcon } from './startup/resolvePrimaryIcon';
import { readRuntimeConfiguration } from './startup/runtimeConfig';

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

const runtimeConfig = readRuntimeConfiguration();
const fallbackResources = DEFAULT_REGISTRIES.resources;
const icon = resolvePrimaryIcon({
	resources: fallbackResources,
	preferredResourceKey: runtimeConfig.primaryResourceKey ?? null,
	fallbackKeys: Object.keys(fallbackResources),
});
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
