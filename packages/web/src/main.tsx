import './styles/index.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { resolvePrimaryIcon } from './startup/resolvePrimaryIcon';
import { getRuntimeContentConfig } from './startup/runtimeConfig';

const createFaviconSvg = (emoji: string): string =>
	[
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
		'<text y=".9em" font-size="90">',
		emoji,
		'</text>',
		'</svg>',
	].join('');

const createFaviconDataUrl = (emoji: string): string => {
	const svg = createFaviconSvg(emoji);
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const ensureFaviconLink = (): HTMLLinkElement => {
	const existing = document.querySelector<HTMLLinkElement>('#favicon');
	if (existing) {
		return existing;
	}
	const link = document.createElement('link');
	link.id = 'favicon';
	return link;
};

async function bootstrap() {
	const rootElement = document.getElementById('root');
	if (!rootElement) {
		throw new Error('Root element not found.');
	}
	try {
		const config = await getRuntimeContentConfig();
		const iconResolution = resolvePrimaryIcon(
			config.resources,
			config.primaryIconId,
		);
		if (iconResolution.icon) {
			const link = ensureFaviconLink();
			link.rel = 'icon';
			link.type = 'image/svg+xml';
			link.href = createFaviconDataUrl(iconResolution.icon);
			if (!link.parentElement) {
				document.head.appendChild(link);
			}
		} else if (iconResolution.source !== 'none') {
			console.warn(
				`Unable to resolve primary icon "${config.primaryIconId ?? ''}"; using fallback source ${iconResolution.resourceKey}.`,
			);
		} else {
			console.warn(
				'Unable to resolve favicon icon from runtime configuration.',
			);
		}
	} catch (error) {
		console.warn('Failed to initialize runtime configuration.', error);
	}
	const root = createRoot(rootElement);
	root.render(<App />);
}

void bootstrap();
